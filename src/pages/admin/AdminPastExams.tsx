import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import PermissionGate from "@/components/admin/PermissionGate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import NativeSelect from "@/components/NativeSelect";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowRight, FileText, Save, Upload, Download } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { parsePastExamFile, downloadTemplate, type ParsedQuestion, type ParseError } from "@/services/pastExamImport";

type Model = Tables<"past_exam_models">;

const AdminPastExams = () => {
  useAuth("moderator");
  const { toast } = useToast();
  const qc = useQueryClient();

  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showQuestions, setShowQuestions] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [isPaid, setIsPaid] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: universities = [] } = useQuery({
    queryKey: ["universities-all"],
    queryFn: async () => {
      const { data } = await supabase.from("universities").select("id, name_ar").order("display_order");
      return data || [];
    },
  });

  const { data: models = [], isLoading } = useQuery({
    queryKey: ["admin-past-exam-models"],
    queryFn: async () => {
      const { data } = await supabase
        .from("past_exam_models")
        .select("*, university:universities(name_ar)")
        .order("year", { ascending: false });
      return (data || []) as (Model & { university: { name_ar: string } | null })[];
    },
  });

  const openCreate = () => {
    setEditingModel(null);
    setTitle("");
    setUniversityId("");
    setYear(new Date().getFullYear());
    setIsPaid(false);
    setIsPublished(false);
    setShowForm(true);
    setShowQuestions(null);
  };

  const openEdit = (m: Model) => {
    setEditingModel(m);
    setTitle(m.title);
    setUniversityId(m.university_id);
    setYear(m.year);
    setIsPaid(m.is_paid);
    setIsPublished(m.is_published);
    setShowForm(true);
    setShowQuestions(null);
  };

  const handleSave = async () => {
    if (!title.trim() || !universityId) {
      toast({ variant: "destructive", title: "يرجى ملء جميع الحقول المطلوبة" });
      return;
    }
    setSaving(true);
    try {
      if (editingModel) {
        await supabase.from("past_exam_models").update({
          title: title.trim(), university_id: universityId, year, is_paid: isPaid, is_published: isPublished,
        }).eq("id", editingModel.id);
        toast({ title: "تم تحديث النموذج" });
        qc.invalidateQueries({ queryKey: ["admin-past-exam-models"] });
        setShowForm(false);
      } else {
        const { data: created, error } = await supabase.from("past_exam_models").insert({
          title: title.trim(), university_id: universityId, year, is_paid: isPaid, is_published: isPublished,
        }).select("id").single();
        if (error) throw error;
        toast({ title: "تم إنشاء النموذج", description: "الآن أضف الأسئلة" });
        qc.invalidateQueries({ queryKey: ["admin-past-exam-models"] });
        setShowForm(false);
        // Auto-open questions editor for the newly created model
        if (created?.id) setShowQuestions(created.id);
      }
    } catch {
      toast({ variant: "destructive", title: "حدث خطأ" });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا النموذج وجميع أسئلته؟")) return;
    await supabase.from("past_exam_model_questions").delete().eq("model_id", id);
    await supabase.from("past_exam_models").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-past-exam-models"] });
    toast({ title: "تم الحذف" });
  };

  return (
    <AdminLayout>
      <PermissionGate permission="past_exams">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">نماذج الأعوام السابقة</h1>
          {!showForm && (
            <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 ml-1" /> نموذج جديد</Button>
          )}
        </div>

        {/* Model Form */}
        {showForm && (
          <Card className="border-primary/40 ring-1 ring-primary/20">
            <CardHeader>
              <CardTitle className="text-base">{editingModel ? "تعديل النموذج" : "نموذج جديد — الخطوة 1 من 2: بيانات النموذج"}</CardTitle>
              {!editingModel && (
                <p className="text-xs text-muted-foreground">بعد الحفظ سننقلك مباشرة لإضافة الأسئلة.</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>عنوان النموذج *</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: النموذج الأول - طبي" />
                </div>
                <div className="space-y-1.5">
                  <Label>الجامعة *</Label>
                  <NativeSelect value={universityId} onValueChange={setUniversityId} placeholder="اختر الجامعة" options={universities.map((u) => ({ value: u.id, label: u.name_ar }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>السنة</Label>
                  <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={isPaid} onCheckedChange={setIsPaid} />
                  <Label>مدفوع</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={isPublished} onCheckedChange={setIsPublished} />
                  <Label>منشور</Label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 ml-1" />{saving ? "جاري الحفظ..." : "حفظ"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>إلغاء</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success banner + Questions Editor */}
        {showQuestions && (
          <>
            <div className="rounded-lg border border-secondary/40 bg-secondary/10 p-3 text-sm flex items-center gap-2">
              <span className="font-bold text-secondary">✓ تم إنشاء النموذج</span>
              <span className="text-muted-foreground">— الخطوة 2 من 2: أضف الأسئلة يدوياً أو استورد من ملف Excel</span>
            </div>
            <QuestionsEditor modelId={showQuestions} onClose={() => setShowQuestions(null)} />
          </>
        )}

        {/* Models List */}
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
        ) : models.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد نماذج بعد</p>
        ) : (
          <div className="space-y-2">
            {models.map((m) => (
              <Card key={m.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-center gap-3 p-4">
                  <FileText className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {(m as any).university?.name_ar} — {m.year}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {m.is_paid && <Badge variant="secondary" className="text-[10px]">مدفوع</Badge>}
                    {m.is_published ? (
                      <Badge className="text-[10px] bg-secondary">منشور</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">مسودة</Badge>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setShowQuestions(m.id); }}>الأسئلة</Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>تعديل</Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(m.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      </PermissionGate>
    </AdminLayout>
  );
};

// ===== Questions Editor (sub-component) =====
function QuestionsEditor({ modelId, onClose }: { modelId: string; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<{
    questions: ParsedQuestion[];
    errors: ParseError[];
    duplicateWarnings: number;
    fileName: string;
  } | null>(null);
  const [importing, setImporting] = useState(false);

  const { data: questions = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-model-questions", modelId],
    queryFn: async () => {
      const { data } = await supabase
        .from("past_exam_model_questions")
        .select("id, q_text, q_option_a, q_option_b, q_option_c, q_option_d, q_correct, q_explanation, order_index")
        .eq("model_id", modelId)
        .order("order_index");
      return data || [];
    },
  });

  const [newQ, setNewQ] = useState({ q_text: "", q_option_a: "", q_option_b: "", q_option_c: "", q_option_d: "", q_correct: "a", q_explanation: "" });

  const addQuestion = async () => {
    if (!newQ.q_text.trim() || !newQ.q_option_a.trim() || !newQ.q_option_b.trim()) {
      toast({ variant: "destructive", title: "يرجى إدخال نص السؤال والخيارات" });
      return;
    }
    setSaving(true);
    const nextOrder = questions.length > 0 ? Math.max(...questions.map(q => q.order_index)) + 1 : 0;
    await supabase.from("past_exam_model_questions").insert({
      model_id: modelId,
      order_index: nextOrder,
      q_text: newQ.q_text.trim(),
      q_option_a: newQ.q_option_a.trim(),
      q_option_b: newQ.q_option_b.trim(),
      q_option_c: newQ.q_option_c.trim() || null,
      q_option_d: newQ.q_option_d.trim() || null,
      q_correct: newQ.q_correct,
      q_explanation: newQ.q_explanation.trim() || null,
    });
    setNewQ({ q_text: "", q_option_a: "", q_option_b: "", q_option_c: "", q_option_d: "", q_correct: "a", q_explanation: "" });
    refetch();
    toast({ title: "تمت إضافة السؤال" });
    setSaving(false);
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from("past_exam_model_questions").delete().eq("id", id);
    refetch();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const result = parsePastExamFile(buf);
      if (result.questions.length === 0 && result.errors.length === 0) {
        toast({ variant: "destructive", title: "الملف فارغ أو لا يحتوي على أسئلة" });
      } else {
        setImportPreview({ ...result, fileName: file.name });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "تعذر قراءة الملف", description: String(err) });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const confirmImport = async () => {
    if (!importPreview || importPreview.questions.length === 0) return;
    setImporting(true);
    try {
      const baseOrder = questions.length > 0 ? Math.max(...questions.map(q => q.order_index)) + 1 : 0;
      const rows = importPreview.questions.map((q, i) => ({
        model_id: modelId,
        order_index: q.order_index ?? baseOrder + i,
        q_text: q.q_text,
        q_option_a: q.q_option_a,
        q_option_b: q.q_option_b,
        q_option_c: q.q_option_c,
        q_option_d: q.q_option_d,
        q_correct: q.q_correct,
        q_explanation: q.q_explanation,
      }));
      const { error } = await supabase.from("past_exam_model_questions").insert(rows);
      if (error) throw error;
      toast({ title: `تم استيراد ${rows.length} سؤال بنجاح` });
      setImportPreview(null);
      refetch();
    } catch (err: any) {
      toast({ variant: "destructive", title: "فشل الاستيراد", description: err?.message || String(err) });
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
    <Card>
      <CardHeader className="flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-base">أسئلة النموذج ({questions.length})</CardTitle>
        <div className="flex items-center gap-1.5 flex-wrap">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleFileSelect} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 ml-1" /> استيراد من ملف
          </Button>
          <Button variant="ghost" size="sm" onClick={downloadTemplate}>
            <Download className="w-4 h-4 ml-1" /> قالب فارغ
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}><ArrowRight className="w-4 h-4 ml-1" /> رجوع</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing questions */}
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="space-y-2">
            {questions.map((q, i) => (
              <div key={q.id} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border">
                <span className="text-xs font-bold text-muted-foreground mt-1">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{q.q_text}</p>
                  <p className="text-xs text-muted-foreground">
                    الإجابة: {q.q_correct?.toUpperCase()}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => deleteQuestion(q.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add new question */}
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-bold">إضافة سؤال جديد</h4>
          <div className="space-y-2">
            <Textarea placeholder="نص السؤال *" value={newQ.q_text} onChange={(e) => setNewQ(p => ({ ...p, q_text: e.target.value }))} rows={2} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="الخيار أ *" value={newQ.q_option_a} onChange={(e) => setNewQ(p => ({ ...p, q_option_a: e.target.value }))} />
              <Input placeholder="الخيار ب *" value={newQ.q_option_b} onChange={(e) => setNewQ(p => ({ ...p, q_option_b: e.target.value }))} />
              <Input placeholder="الخيار ج" value={newQ.q_option_c} onChange={(e) => setNewQ(p => ({ ...p, q_option_c: e.target.value }))} />
              <Input placeholder="الخيار د" value={newQ.q_option_d} onChange={(e) => setNewQ(p => ({ ...p, q_option_d: e.target.value }))} />
            </div>
            <div className="flex gap-3 items-center">
              <Label className="text-xs shrink-0">الإجابة الصحيحة:</Label>
              <NativeSelect
                value={newQ.q_correct}
                onValueChange={(v) => setNewQ(p => ({ ...p, q_correct: v }))}
                placeholder="اختر"
                options={[
                  { value: "a", label: "أ" },
                  { value: "b", label: "ب" },
                  { value: "c", label: "ج" },
                  { value: "d", label: "د" },
                ]}
              />
            </div>
            <Textarea placeholder="الشرح (اختياري)" value={newQ.q_explanation} onChange={(e) => setNewQ(p => ({ ...p, q_explanation: e.target.value }))} rows={2} />
            <Button onClick={addQuestion} disabled={saving} size="sm">
              <Plus className="w-4 h-4 ml-1" /> إضافة السؤال
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <Dialog open={!!importPreview} onOpenChange={(open) => !open && setImportPreview(null)}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>معاينة الاستيراد</DialogTitle>
        </DialogHeader>
        {importPreview && (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground">الملف: {importPreview.fileName}</div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-secondary">صالح: {importPreview.questions.length}</Badge>
              {importPreview.errors.length > 0 && (
                <Badge variant="destructive">أخطاء: {importPreview.errors.length}</Badge>
              )}
              {importPreview.duplicateWarnings > 0 && (
                <Badge variant="outline">مكرر داخل الملف: {importPreview.duplicateWarnings}</Badge>
              )}
            </div>

            {importPreview.errors.length > 0 && (
              <div className="border border-destructive/30 rounded-lg p-3 bg-destructive/5 max-h-40 overflow-y-auto">
                <p className="text-xs font-bold text-destructive mb-2">أسطر مرفوضة:</p>
                <ul className="text-xs space-y-1">
                  {importPreview.errors.slice(0, 20).map((e, i) => (
                    <li key={i}>السطر {e.row}: {e.reason}</li>
                  ))}
                  {importPreview.errors.length > 20 && <li>... و {importPreview.errors.length - 20} أخرى</li>}
                </ul>
              </div>
            )}

            {importPreview.questions.length > 0 && (
              <div className="border rounded-lg p-3 max-h-60 overflow-y-auto space-y-2">
                <p className="text-xs font-bold mb-1">معاينة (أول 10):</p>
                {importPreview.questions.slice(0, 10).map((q, i) => (
                  <div key={i} className="text-xs border-b last:border-0 pb-1.5">
                    <span className="font-bold">{i + 1}.</span> {q.q_text}
                    <span className="text-muted-foreground"> — الإجابة: {q.q_correct.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setImportPreview(null)} disabled={importing}>إلغاء</Button>
          <Button
            onClick={confirmImport}
            disabled={importing || !importPreview || importPreview.questions.length === 0}
          >
            {importing ? "جاري الاستيراد..." : `استيراد ${importPreview?.questions.length || 0} سؤال`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

export default AdminPastExams;
