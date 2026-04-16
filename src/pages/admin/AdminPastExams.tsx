import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import PermissionGate from "@/components/admin/PermissionGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, FileText, ListPlus, GripVertical, X } from "lucide-react";
import NativeSelect from "@/components/NativeSelect";
import { Checkbox } from "@/components/ui/checkbox";

interface PastExamModel {
  id: string;
  title: string;
  university_id: string;
  year: number;
  track: string | null;
  is_published: boolean;
  is_paid: boolean;
  duration_minutes: number | null;
  created_at: string;
}

interface QuestionRow {
  id: string;
  question_text: string;
  lesson_id: string;
  subject: string;
}

const AdminPastExams = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showDialog, setShowDialog] = useState(false);
  const [showQuestionsDialog, setShowQuestionsDialog] = useState(false);
  const [editing, setEditing] = useState<PastExamModel | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterUniId, setFilterUniId] = useState<string>("");

  // Form state
  const [form, setForm] = useState({
    title: "",
    university_id: "",
    year: new Date().getFullYear(),
    track: "",
    is_published: false,
    is_paid: false,
    duration_minutes: "",
  });

  // Questions assignment state
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [questionSearch, setQuestionSearch] = useState("");
  const [assignedQuestionIds, setAssignedQuestionIds] = useState<string[]>([]);
  const [savingQuestions, setSavingQuestions] = useState(false);

  // ── Fetch data ─────────────────────────────────────────
  const { data: universities = [] } = useQuery({
    queryKey: ["admin-universities"],
    queryFn: async () => {
      const { data } = await supabase.from("universities").select("id, name_ar").eq("is_active", true).order("display_order");
      return data || [];
    },
  });

  const { data: models = [], isLoading } = useQuery({
    queryKey: ["admin-past-exam-models", filterUniId],
    queryFn: async () => {
      let q = supabase.from("past_exam_models").select("*").order("year", { ascending: false });
      if (filterUniId) q = q.eq("university_id", filterUniId);
      const { data } = await q;
      return (data || []) as PastExamModel[];
    },
  });

  // All questions for assignment
  const { data: allQuestions = [] } = useQuery({
    queryKey: ["admin-all-questions-for-models"],
    queryFn: async () => {
      const { data } = await supabase.from("questions").select("id, question_text, lesson_id, subject").order("created_at", { ascending: false }).limit(500);
      return (data || []) as QuestionRow[];
    },
    enabled: showQuestionsDialog,
  });

  // Currently assigned questions
  const { data: currentAssigned = [] } = useQuery({
    queryKey: ["model-assigned-questions", activeModelId],
    queryFn: async () => {
      const { data } = await supabase
        .from("past_exam_model_questions")
        .select("question_id, order_index")
        .eq("model_id", activeModelId!)
        .order("order_index");
      return (data || []).map(d => d.question_id);
    },
    enabled: !!activeModelId && showQuestionsDialog,
  });

  useEffect(() => {
    if (currentAssigned.length > 0) setAssignedQuestionIds(currentAssigned);
  }, [currentAssigned]);

  // ── Handlers ───────────────────────────────────────────
  const resetForm = () => {
    setForm({ title: "", university_id: "", year: new Date().getFullYear(), track: "", is_published: false, is_paid: false, duration_minutes: "" });
    setEditing(null);
  };

  const openEdit = (model: PastExamModel) => {
    setEditing(model);
    setForm({
      title: model.title,
      university_id: model.university_id,
      year: model.year,
      track: model.track || "",
      is_published: model.is_published,
      is_paid: model.is_paid,
      duration_minutes: model.duration_minutes?.toString() || "",
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.university_id || !form.year) {
      toast({ title: "يرجى ملء الحقول المطلوبة", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title,
      university_id: form.university_id,
      year: form.year,
      track: form.track || null,
      is_published: form.is_published,
      is_paid: form.is_paid,
      duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
    };

    if (editing) {
      const { error } = await supabase.from("past_exam_models").update(payload).eq("id", editing.id);
      if (error) toast({ title: "خطأ في التحديث", description: error.message, variant: "destructive" });
      else toast({ title: "تم التحديث" });
    } else {
      const { error } = await supabase.from("past_exam_models").insert(payload);
      if (error) toast({ title: "خطأ في الإنشاء", description: error.message, variant: "destructive" });
      else toast({ title: "تم الإنشاء" });
    }

    setSaving(false);
    setShowDialog(false);
    resetForm();
    queryClient.invalidateQueries({ queryKey: ["admin-past-exam-models"] });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    await supabase.from("past_exam_models").delete().eq("id", id);
    toast({ title: "تم الحذف" });
    queryClient.invalidateQueries({ queryKey: ["admin-past-exam-models"] });
  };

  const openQuestions = (modelId: string) => {
    setActiveModelId(modelId);
    setAssignedQuestionIds([]);
    setQuestionSearch("");
    setShowQuestionsDialog(true);
  };

  const toggleQuestion = (qId: string) => {
    setAssignedQuestionIds(prev =>
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    );
  };

  const saveQuestions = async () => {
    if (!activeModelId) return;
    setSavingQuestions(true);

    // Delete existing assignments
    await supabase.from("past_exam_model_questions").delete().eq("model_id", activeModelId);

    // Insert new
    if (assignedQuestionIds.length > 0) {
      const rows = assignedQuestionIds.map((qId, i) => ({
        model_id: activeModelId,
        question_id: qId,
        order_index: i,
      }));
      await supabase.from("past_exam_model_questions").insert(rows);
    }

    toast({ title: `تم حفظ ${assignedQuestionIds.length} سؤال` });
    setSavingQuestions(false);
    setShowQuestionsDialog(false);
    queryClient.invalidateQueries({ queryKey: ["model-assigned-questions"] });
  };

  const filteredQuestions = allQuestions.filter(q =>
    q.question_text.includes(questionSearch) || q.subject.includes(questionSearch)
  );

  const getUniName = (id: string) => universities.find(u => u.id === id)?.name_ar || "";

  return (
    <PermissionGate permission="content">
      <AdminLayout>
        <div className="space-y-4" dir="rtl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="text-xl font-bold">نماذج الأعوام السابقة</h1>
            <Button onClick={() => { resetForm(); setShowDialog(true); }}>
              <Plus className="w-4 h-4 ml-1" />إضافة نموذج
            </Button>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <NativeSelect
              value={filterUniId}
              onValueChange={setFilterUniId}
              placeholder="كل الجامعات"
              className="max-w-xs"
              options={[{ value: "", label: "كل الجامعات" }, ...universities.map(u => ({ value: u.id, label: u.name_ar }))]}
            />
          </div>

          {/* Models list */}
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : models.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">لا توجد نماذج بعد</p>
            </div>
          ) : (
            <div className="space-y-2">
              {models.map(model => (
                <Card key={model.id}>
                  <CardContent className="flex items-center gap-3 p-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{model.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">{getUniName(model.university_id)}</Badge>
                        <Badge variant="outline" className="text-[10px]">{model.year}</Badge>
                        {model.track && <Badge variant="outline" className="text-[10px]">{model.track}</Badge>}
                        {model.is_published ? (
                          <Badge className="text-[10px] bg-secondary/15 text-secondary">منشور</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">مسودة</Badge>
                        )}
                        {model.is_paid ? (
                          <Badge variant="outline" className="text-[10px] border-accent text-accent">مدفوع</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-secondary text-secondary">مجاني</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => openQuestions(model.id)}>
                        <ListPlus className="w-3.5 h-3.5 ml-1" />أسئلة
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(model)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(model.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Create/Edit Dialog */}
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogContent className="max-w-md" dir="rtl">
              <DialogHeader>
                <DialogTitle>{editing ? "تعديل النموذج" : "إضافة نموذج جديد"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>العنوان *</Label>
                  <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="مثال: نموذج الطب البشري 2024" />
                </div>
                <div>
                  <Label>الجامعة *</Label>
                  <NativeSelect
                    value={form.university_id}
                    onValueChange={v => setForm(p => ({ ...p, university_id: v }))}
                    placeholder="اختر الجامعة"
                    options={universities.map(u => ({ value: u.id, label: u.name_ar }))}
                  />
                </div>
                <div>
                  <Label>السنة *</Label>
                  <Input type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label>المسار (اختياري)</Label>
                  <Input value={form.track} onChange={e => setForm(p => ({ ...p, track: e.target.value }))} placeholder="مثال: طبي / هندسي" />
                </div>
                <div>
                  <Label>المدة بالدقائق (اختياري)</Label>
                  <Input type="number" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))} placeholder="90" />
                </div>
                <div className="flex items-center justify-between">
                  <Label>منشور</Label>
                  <Switch checked={form.is_published} onCheckedChange={v => setForm(p => ({ ...p, is_published: v }))} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>مدفوع (يتطلب اشتراك)</Label>
                  <Switch checked={form.is_paid} onCheckedChange={v => setForm(p => ({ ...p, is_paid: v }))} />
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                  {editing ? "حفظ التعديلات" : "إنشاء النموذج"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Questions Assignment Dialog */}
          <Dialog open={showQuestionsDialog} onOpenChange={setShowQuestionsDialog}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" dir="rtl">
              <DialogHeader>
                <DialogTitle>تعيين الأسئلة للنموذج</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="بحث في الأسئلة..."
                  value={questionSearch}
                  onChange={e => setQuestionSearch(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  تم اختيار <strong>{assignedQuestionIds.length}</strong> سؤال
                </p>
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                  {filteredQuestions.map(q => (
                    <label key={q.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                      <Checkbox
                        checked={assignedQuestionIds.includes(q.id)}
                        onCheckedChange={() => toggleQuestion(q.id)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-foreground line-clamp-2">{q.question_text}</p>
                        <p className="text-[10px] text-muted-foreground">{q.subject}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <Button onClick={saveQuestions} disabled={savingQuestions} className="w-full">
                  {savingQuestions && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                  حفظ ({assignedQuestionIds.length} سؤال)
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </AdminLayout>
    </PermissionGate>
  );
};

export default AdminPastExams;
