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
import { Plus, Trash2, ArrowRight, FileText, Save, Upload, Download, Copy, EyeOff, Eye } from "lucide-react";
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
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);

  // Filters
  const [filterUniversityId, setFilterUniversityId] = useState<string>("");
  const [filterYear, setFilterYear] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>(""); // "", "published", "draft"

  const resetForm = () => {
    setEditingModel(null);
    setTitle("");
    setUniversityId("");
    setYear(new Date().getFullYear());
    setIsPaid(false);
    setIsPublished(false);
    setDurationMinutes("");
    setSuggestedDurationMinutes("");
  };

  const handleCancel = () => {
    setShowForm(false);
    resetForm();
    setJustCreatedId(null);
    setShowQuestions(null);
  };

  // Form state
  const [title, setTitle] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [isPaid, setIsPaid] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState<string>("");
  const [suggestedDurationMinutes, setSuggestedDurationMinutes] = useState<string>("");
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

  // Fetch question counts per model
  const { data: questionCounts = {} } = useQuery({
    queryKey: ["admin-past-exam-question-counts", models.map(m => m.id).join(",")],
    enabled: models.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("past_exam_model_questions")
        .select("model_id")
        .in("model_id", models.map(m => m.id));
      const counts: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        counts[row.model_id] = (counts[row.model_id] || 0) + 1;
      });
      return counts;
    },
  });

  const openCreate = () => {
    resetForm();
    setShowForm(true);
    setShowQuestions(null);
    setJustCreatedId(null);
  };

  const openEdit = (m: Model) => {
    setEditingModel(m);
    setTitle(m.title);
    setUniversityId(m.university_id);
    setYear(m.year);
    setIsPaid(m.is_paid);
    setIsPublished(m.is_published);
    setDurationMinutes(m.duration_minutes != null ? String(m.duration_minutes) : "");
    setSuggestedDurationMinutes((m as any).suggested_duration_minutes != null ? String((m as any).suggested_duration_minutes) : "");
    setShowForm(true);
    setShowQuestions(null);
    setJustCreatedId(null); // editing must NOT show "created" banner
    // Force fresh question count to avoid stale-cache blocking publish
    qc.invalidateQueries({ queryKey: ["admin-past-exam-question-counts"] });
  };

  const handleSave = async () => {
    if (!title.trim() || !universityId) {
      toast({ variant: "destructive", title: "يرجى ملء جميع الحقول المطلوبة" });
      return;
    }
    const parseDuration = (raw: string): number | null => {
      const t = raw.trim();
      if (!t) return null;
      const n = parseInt(t, 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    };
    const durationParsed = parseDuration(durationMinutes);
    const suggestedParsed = parseDuration(suggestedDurationMinutes);
    if (durationMinutes.trim() && durationParsed === null) {
      toast({ variant: "destructive", title: "مدة غير صالحة", description: "أدخل عدداً صحيحاً موجباً للمدة الإلزامية" });
      return;
    }
    if (suggestedDurationMinutes.trim() && (suggestedParsed === null || suggestedParsed < 30)) {
      toast({ variant: "destructive", title: "المدة المقترحة غير صالحة", description: "يجب ألا تقل المدة المقترحة عن 30 دقيقة" });
      return;
    }
    setSaving(true);
    try {
      if (editingModel) {
        // Block publishing empty models — verify against DB directly (cache may be stale)
        if (isPublished && !editingModel.is_published) {
          const { count, error: countErr } = await supabase
            .from("past_exam_model_questions")
            .select("id", { count: "exact", head: true })
            .eq("model_id", editingModel.id);
          if (countErr) throw countErr;
          if ((count || 0) === 0) {
            toast({ variant: "destructive", title: "لا يمكن نشر نموذج فارغ", description: "أضف الأسئلة أولاً قبل النشر" });
            setSaving(false);
            return;
          }
        }
        const { error } = await supabase.from("past_exam_models").update({
          title: title.trim(), university_id: universityId, year, is_paid: isPaid, is_published: isPublished,
          duration_minutes: durationParsed,
          suggested_duration_minutes: suggestedParsed,
        } as any).eq("id", editingModel.id);
        if (error) throw error;
        toast({
          title: "تم تحديث النموذج",
          description: isPublished ? "✓ النموذج منشور للطلاب الآن" : "تم الحفظ كمسودة",
        });
        qc.invalidateQueries({ queryKey: ["admin-past-exam-models"] });
        qc.invalidateQueries({ queryKey: ["admin-past-exam-question-counts"] });
        setShowForm(false);
        resetForm();
        // Editing: do NOT show success banner, do NOT auto-open questions editor
      } else {
        // New model: respect admin's choice for is_published (no questions exist yet, but admin can fill them after)
        const { data: created, error } = await supabase.from("past_exam_models").insert({
          title: title.trim(), university_id: universityId, year, is_paid: isPaid, is_published: isPublished,
          duration_minutes: durationParsed,
          suggested_duration_minutes: suggestedParsed,
        } as any).select("*").single();
        if (error) throw error;
        if (!created?.id) throw new Error("no id returned");

        // Enforce publish state: if admin chose published but DB didn't reflect it, force-update
        if (isPublished && (created as any).is_published !== true) {
          const { error: fixErr } = await supabase
            .from("past_exam_models")
            .update({ is_published: true } as any)
            .eq("id", (created as any).id);
          if (fixErr) throw fixErr;
        }

        toast({
          title: isPublished ? "✓ تم إنشاء النموذج كمنشور" : "تم إنشاء النموذج كمسودة",
          description: isPublished
            ? "النموذج منشور للطلاب — أضف الأسئلة الآن ليتمكنوا من التدرّب"
            : "تم الحفظ كمسودة — أضف الأسئلة ثم انشره",
        });

        // Confirmed refresh: await refetch so list shows correct badge before moving on
        await qc.refetchQueries({ queryKey: ["admin-past-exam-models"] });
        await qc.refetchQueries({ queryKey: ["admin-past-exam-question-counts"] });

        setShowForm(false);
        resetForm();
        setJustCreatedId((created as any).id);
        setShowQuestions((created as any).id);
      }
    } catch (err: any) {
      // Save failed: keep admin inside the form, do NOT open questions editor
      toast({ variant: "destructive", title: "حدث خطأ أثناء الحفظ", description: err?.message || "يرجى المحاولة مرة أخرى" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا النموذج وجميع أسئلته؟")) return;
    await supabase.from("past_exam_model_questions").delete().eq("model_id", id);
    await supabase.from("past_exam_models").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-past-exam-models"] });
    if (showQuestions === id) setShowQuestions(null);
    if (justCreatedId === id) setJustCreatedId(null);
    toast({ title: "تم الحذف" });
  };

  const [unpublishingId, setUnpublishingId] = useState<string | null>(null);
  const handleUnpublish = async (m: Model) => {
    if (!confirm(`إرجاع النموذج "${m.title}" إلى مسودة؟ سيختفي عن الطلاب فوراً.`)) return;
    setUnpublishingId(m.id);
    try {
      const { error } = await supabase
        .from("past_exam_models")
        .update({ is_published: false })
        .eq("id", m.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["admin-past-exam-models"] });
      toast({ title: "تم إرجاع النموذج إلى مسودة" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "تعذر إلغاء النشر", description: err?.message || "حدث خطأ" });
    } finally {
      setUnpublishingId(null);
    }
  };

  const [publishingId, setPublishingId] = useState<string | null>(null);
  const handleQuickPublish = async (m: Model) => {
    // Verify against DB directly to avoid stale cache
    setPublishingId(m.id);
    try {
      const { count, error: countErr } = await supabase
        .from("past_exam_model_questions")
        .select("id", { count: "exact", head: true })
        .eq("model_id", m.id);
      if (countErr) throw countErr;
      if ((count || 0) === 0) {
        toast({ variant: "destructive", title: "لا يمكن نشر نموذج فارغ", description: "أضف الأسئلة أولاً قبل النشر" });
        return;
      }
      if (!confirm(`نشر النموذج "${m.title}" للطلاب الآن؟`)) return;
      const { error } = await supabase
        .from("past_exam_models")
        .update({ is_published: true })
        .eq("id", m.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["admin-past-exam-models"] });
      qc.invalidateQueries({ queryKey: ["admin-past-exam-question-counts"] });
      toast({ title: "✓ تم النشر", description: "النموذج منشور للطلاب الآن" });
    } catch (err: any) {
      toast({ variant: "destructive", title: "تعذر النشر", description: err?.message || "حدث خطأ" });
    } finally {
      setPublishingId(null);
    }
  };

  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const handleDuplicate = async (m: Model) => {
    if (!confirm(`نسخ النموذج "${m.title}" مع جميع أسئلته؟`)) return;
    setDuplicatingId(m.id);
    try {
      // 1. Create new model as draft copy
      const { data: created, error: e1 } = await supabase.from("past_exam_models").insert({
        title: `${m.title} (نسخة)`,
        university_id: m.university_id,
        year: m.year,
        is_paid: m.is_paid,
        is_published: false, // always start as draft
        duration_minutes: m.duration_minutes,
        track: m.track,
      }).select("id").single();
      if (e1) throw e1;
      if (!created?.id) throw new Error("لم يتم إنشاء النموذج");

      // 2. Fetch source questions
      const { data: srcQs, error: e2 } = await supabase
        .from("past_exam_model_questions")
        .select("q_text, q_option_a, q_option_b, q_option_c, q_option_d, q_correct, q_explanation, order_index")
        .eq("model_id", m.id)
        .order("order_index");
      if (e2) throw e2;

      // 3. Insert copies linked to new model
      if (srcQs && srcQs.length > 0) {
        const rows = srcQs.map((q) => ({ ...q, model_id: created.id }));
        const { error: e3 } = await supabase.from("past_exam_model_questions").insert(rows);
        if (e3) throw e3;
      }

      qc.invalidateQueries({ queryKey: ["admin-past-exam-models"] });
      toast({ title: "تم نسخ النموذج", description: `تم نسخ ${srcQs?.length || 0} سؤال — النسخة كمسودة` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "تعذر نسخ النموذج", description: err?.message || "حدث خطأ" });
    } finally {
      setDuplicatingId(null);
    }
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
                <div className="space-y-1.5">
                  <Label>مدة الاختبار الإلزامية (دقائق)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    placeholder="اتركه فارغاً ليختار الطالب"
                  />
                  <p className="text-[11px] text-muted-foreground">إذا حُدِّدت، سيلتزم بها الطالب في الوضع المتقدم.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>المدة المقترحة للطالب (دقائق)</Label>
                  <Input
                    type="number"
                    min={30}
                    step={5}
                    value={suggestedDurationMinutes}
                    onChange={(e) => setSuggestedDurationMinutes(e.target.value)}
                    placeholder="مثال: 60 (الحد الأدنى 30)"
                  />
                  <p className="text-[11px] text-muted-foreground">تظهر كقيمة مبدئية في حوار اختيار المدة عند ترك المدة الإلزامية فارغة.</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={isPaid} onCheckedChange={setIsPaid} />
                  <Label>يتطلب اشتراك</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isPublished}
                    onCheckedChange={setIsPublished}
                    disabled={!!editingModel && (questionCounts[editingModel.id] || 0) === 0}
                  />
                  <Label>منشور</Label>
                  {editingModel && (questionCounts[editingModel.id] || 0) === 0 && (
                    <span className="text-[11px] text-destructive">أضف الأسئلة أولاً</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 ml-1" />{saving ? "جاري الحفظ..." : "حفظ"}
                </Button>
                <Button variant="outline" onClick={handleCancel}>إلغاء</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success banner — ONLY after creating a brand-new model */}
        {showQuestions && justCreatedId === showQuestions && (
          <div className="rounded-lg border border-secondary/40 bg-secondary/10 p-3 text-sm flex items-center gap-2">
            <span className="font-bold text-secondary">✓ تم إنشاء النموذج</span>
            <span className="text-muted-foreground">— الخطوة 2 من 2: أضف الأسئلة يدوياً أو استورد من ملف Excel</span>
          </div>
        )}

        {/* Questions Editor */}
        {showQuestions && (
          <QuestionsEditor modelId={showQuestions} onClose={() => { setShowQuestions(null); setJustCreatedId(null); }} />
        )}

        {/* Filters */}
        {!isLoading && models.length > 0 && (
          <Card>
            <CardContent className="p-3 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-xs">الجامعة</Label>
                <NativeSelect
                  value={filterUniversityId}
                  onValueChange={setFilterUniversityId}
                  placeholder="كل الجامعات"
                  options={[{ value: "", label: "كل الجامعات" }, ...universities.map((u) => ({ value: u.id, label: u.name_ar }))]}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">السنة</Label>
                <NativeSelect
                  value={filterYear}
                  onValueChange={setFilterYear}
                  placeholder="كل السنوات"
                  options={[
                    { value: "", label: "كل السنوات" },
                    ...Array.from(new Set(models.map((m) => m.year)))
                      .sort((a, b) => b - a)
                      .map((y) => ({ value: String(y), label: String(y) })),
                  ]}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">الحالة</Label>
                <NativeSelect
                  value={filterStatus}
                  onValueChange={setFilterStatus}
                  placeholder="الكل"
                  options={[
                    { value: "", label: "الكل" },
                    { value: "published", label: "منشور" },
                    { value: "draft", label: "مسودة" },
                    { value: "empty", label: "فارغ (بدون أسئلة)" },
                  ]}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFilterUniversityId(""); setFilterYear(""); setFilterStatus(""); }}
                disabled={!filterUniversityId && !filterYear && !filterStatus}
              >
                إعادة تعيين
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Models List */}
        {isLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
        ) : models.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد نماذج بعد</p>
        ) : (() => {
          const filtered = models.filter((m) => {
            if (filterUniversityId && m.university_id !== filterUniversityId) return false;
            if (filterYear && String(m.year) !== filterYear) return false;
            if (filterStatus === "published" && !m.is_published) return false;
            if (filterStatus === "draft" && m.is_published) return false;
            if (filterStatus === "empty" && (questionCounts[m.id] || 0) > 0) return false;
            return true;
          });
          if (filtered.length === 0) {
            return <p className="text-center text-muted-foreground py-8">لا توجد نماذج تطابق الفلاتر</p>;
          }
          return (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">عرض {filtered.length} من {models.length}</p>
            {filtered.map((m) => {
              const qCount = questionCounts[m.id] || 0;
              const isEmpty = qCount === 0;
              return (
              <Card key={m.id} className={`hover:shadow-sm transition-shadow ${isEmpty ? "border-destructive/30" : ""}`}>
                <CardContent className="flex items-center gap-3 p-4">
                  <FileText className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {(m as any).university?.name_ar} — {m.year}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant={isEmpty ? "destructive" : "outline"}
                      className="text-[10px]"
                      title={isEmpty ? "نموذج فارغ — لا يمكن نشره" : `${qCount} سؤال`}
                    >
                      {isEmpty ? "فارغ" : `${qCount} سؤال`}
                    </Badge>
                    {m.is_paid && <Badge variant="secondary" className="text-[10px]">اشتراك</Badge>}
                    {m.is_published ? (
                      <>
                        <Badge className="text-[10px] bg-secondary">منشور</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] px-2 gap-1"
                          title="إرجاع إلى مسودة"
                          disabled={unpublishingId === m.id}
                          onClick={() => handleUnpublish(m)}
                        >
                          <EyeOff className="w-3 h-3" />
                          {unpublishingId === m.id ? "..." : "إلغاء النشر"}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline" className="text-[10px]">مسودة</Badge>
                        {!isEmpty && (
                          <Button
                            size="sm"
                            className="h-7 text-[11px] px-2 gap-1 bg-secondary text-secondary-foreground hover:bg-secondary/90"
                            title="نشر النموذج للطلاب فوراً"
                            disabled={publishingId === m.id}
                            onClick={() => handleQuickPublish(m)}
                          >
                            <Eye className="w-3 h-3" />
                            {publishingId === m.id ? "..." : "نشر سريع"}
                          </Button>
                        )}
                      </>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setJustCreatedId(null); setShowQuestions(m.id); }}>الأسئلة</Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>تعديل</Button>
                    <Button variant="ghost" size="icon" title="نسخ النموذج" disabled={duplicatingId === m.id} onClick={() => handleDuplicate(m)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(m.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
          );
        })()}
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
    qc.invalidateQueries({ queryKey: ["admin-past-exam-question-counts"] });
    toast({ title: "تمت إضافة السؤال" });
    setSaving(false);
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from("past_exam_model_questions").delete().eq("id", id);
    refetch();
    qc.invalidateQueries({ queryKey: ["admin-past-exam-question-counts"] });
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
      qc.invalidateQueries({ queryKey: ["admin-past-exam-question-counts"] });
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
