import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useModeratorScope } from "@/hooks/useModeratorScope";
import AdminLayout from "@/components/admin/AdminLayout";
import PermissionGate from "@/components/admin/PermissionGate";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, FileText, HelpCircle, Upload, Download, Sparkles } from "lucide-react";
import * as XLSX from "xlsx";

interface Lesson {
  id: string;
  major_id: string;
  title: string;
  content: string;
  summary: string;
  display_order: number;
  is_published: boolean;
  is_free: boolean;
  created_at: string;
}

interface Question {
  id: string;
  lesson_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
  display_order: number;
}

const AdminContent = () => {
  const { user, loading: authLoading, isAdmin } = useAuth("moderator");
  const { toast } = useToast();

  const [majors, setMajors] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterUni, setFilterUni] = useState("");
  const [filterCollege, setFilterCollege] = useState("");
  const [filterMajor, setFilterMajor] = useState("");

  // Lesson dialog
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonSummary, setLessonSummary] = useState("");
  const [lessonMajorId, setLessonMajorId] = useState("");
  const [lessonOrder, setLessonOrder] = useState(0);
  const [lessonPublished, setLessonPublished] = useState(false);
  const [lessonFree, setLessonFree] = useState(false);
  const [saving, setSaving] = useState(false);

  // Question dialog
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionLessonId, setQuestionLessonId] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctOption, setCorrectOption] = useState("a");
  const [explanation, setExplanation] = useState("");
  const [questionOrder, setQuestionOrder] = useState(0);

  // Selected lesson for questions
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);

  // Import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMajorId, setImportMajorId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    const [{ data: u }, { data: c }, { data: m }, { data: l }, { data: q }] = await Promise.all([
      supabase.from("universities").select("*").order("display_order"),
      supabase.from("colleges").select("*").order("display_order"),
      supabase.from("majors").select("*").order("display_order"),
      supabase.from("lessons").select("*").order("display_order"),
      supabase.from("questions").select("*").order("display_order"),
    ]);
    if (u) setUniversities(u);
    if (c) setColleges(c);
    if (m) setMajors(m);
    if (l) setLessons(l as Lesson[]);
    if (q) setQuestions(q as Question[]);
    setLoading(false);
  };

  useEffect(() => { if (!authLoading) fetchData(); }, [authLoading]);

  const { getAllowedMajorIds, loading: scopeLoading } = useModeratorScope(
    user?.id, isAdmin, universities, colleges, majors
  );

  // Apply scope filtering
  const allowedMajorIds = getAllowedMajorIds();
  const scopedLessons = allowedMajorIds ? lessons.filter((l) => allowedMajorIds.has(l.major_id)) : lessons;
  const scopedMajors = allowedMajorIds ? majors.filter((m: any) => allowedMajorIds.has(m.id)) : majors;
  const scopedCollegeIds = new Set(scopedMajors.map((m: any) => m.college_id));
  const scopedColleges = allowedMajorIds ? colleges.filter((c: any) => scopedCollegeIds.has(c.id)) : colleges;
  const scopedUniIds = new Set(scopedColleges.map((c: any) => c.university_id));
  const scopedUniversities = allowedMajorIds ? universities.filter((u: any) => scopedUniIds.has(u.id)) : universities;

  const filteredColleges = filterUni ? scopedColleges.filter((c: any) => c.university_id === filterUni) : scopedColleges;
  const filteredMajors = filterCollege ? scopedMajors.filter((m: any) => m.college_id === filterCollege) : (filterUni ? scopedMajors.filter((m: any) => filteredColleges.some((c: any) => c.id === m.college_id)) : scopedMajors);
  
  const filteredLessons = (() => {
    if (filterMajor) return scopedLessons.filter((l) => l.major_id === filterMajor);
    if (filterCollege) {
      const collegeMajorIds = scopedMajors.filter((m: any) => m.college_id === filterCollege).map((m: any) => m.id);
      return scopedLessons.filter((l) => collegeMajorIds.includes(l.major_id));
    }
    if (filterUni) {
      const uniCollegeIds = scopedColleges.filter((c: any) => c.university_id === filterUni).map((c: any) => c.id);
      const uniMajorIds = scopedMajors.filter((m: any) => uniCollegeIds.includes(m.college_id)).map((m: any) => m.id);
      return scopedLessons.filter((l) => uniMajorIds.includes(l.major_id));
    }
    return scopedLessons;
  })();

  const getMajorName = (id: string) => majors.find((m: any) => m.id === id)?.name_ar || "";

  // --- Lesson CRUD ---
  const openCreateLesson = () => {
    setEditingLesson(null);
    setLessonTitle("");
    setLessonContent("");
    setLessonSummary("");
    setLessonMajorId(filterMajor);
    setLessonOrder(filteredLessons.length);
    setLessonPublished(false);
    setLessonFree(false);
    setLessonDialogOpen(true);
  };

  const openEditLesson = (l: Lesson) => {
    setEditingLesson(l);
    setLessonTitle(l.title);
    setLessonContent(l.content);
    setLessonSummary(l.summary);
    setLessonMajorId(l.major_id);
    setLessonOrder(l.display_order);
    setLessonPublished(l.is_published);
    setLessonFree(l.is_free);
    setLessonDialogOpen(true);
  };

  const handleSaveLesson = async () => {
    if (!lessonTitle || !lessonMajorId) {
      toast({ variant: "destructive", title: "يرجى ملء العنوان واختيار التخصص" });
      return;
    }
    setSaving(true);
    const payload = {
      title: lessonTitle,
      content: lessonContent,
      summary: lessonSummary,
      major_id: lessonMajorId,
      display_order: lessonOrder,
      is_published: lessonPublished,
      is_free: lessonFree,
    };
    if (editingLesson) {
      const { error } = await supabase.from("lessons").update(payload).eq("id", editingLesson.id);
      if (error) toast({ variant: "destructive", title: error.message });
      else toast({ title: "تم تحديث الدرس" });
    } else {
      const { error } = await supabase.from("lessons").insert(payload);
      if (error) toast({ variant: "destructive", title: error.message });
      else toast({ title: "تمت إضافة الدرس" });
    }
    setSaving(false);
    setLessonDialogOpen(false);
    fetchData();
  };

  const handleDeleteLesson = async (id: string) => {
    if (!confirm("حذف الدرس وجميع أسئلته؟")) return;
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: error.message });
    else { toast({ title: "تم الحذف" }); if (selectedLesson === id) setSelectedLesson(null); fetchData(); }
  };

  // --- Question CRUD ---
  const openCreateQuestion = (lessonId: string) => {
    setEditingQuestion(null);
    setQuestionLessonId(lessonId);
    setQuestionText("");
    setOptionA("");
    setOptionB("");
    setOptionC("");
    setOptionD("");
    setCorrectOption("a");
    setExplanation("");
    setQuestionOrder(questions.filter((q) => q.lesson_id === lessonId).length);
    setQuestionDialogOpen(true);
  };

  const openEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setQuestionLessonId(q.lesson_id);
    setQuestionText(q.question_text);
    setOptionA(q.option_a);
    setOptionB(q.option_b);
    setOptionC(q.option_c);
    setOptionD(q.option_d);
    setCorrectOption(q.correct_option);
    setExplanation(q.explanation);
    setQuestionOrder(q.display_order);
    setQuestionDialogOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!questionText || !optionA || !optionB || !optionC || !optionD) {
      toast({ variant: "destructive", title: "يرجى ملء جميع الحقول المطلوبة" });
      return;
    }
    setSaving(true);
    const payload = {
      lesson_id: questionLessonId,
      question_text: questionText,
      option_a: optionA,
      option_b: optionB,
      option_c: optionC,
      option_d: optionD,
      correct_option: correctOption,
      explanation,
      display_order: questionOrder,
    };
    if (editingQuestion) {
      const { error } = await supabase.from("questions").update(payload).eq("id", editingQuestion.id);
      if (error) toast({ variant: "destructive", title: error.message });
      else toast({ title: "تم تحديث السؤال" });
    } else {
      const { error } = await supabase.from("questions").insert(payload);
      if (error) toast({ variant: "destructive", title: error.message });
      else toast({ title: "تمت إضافة السؤال" });
    }
    setSaving(false);
    setQuestionDialogOpen(false);
    fetchData();
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("حذف هذا السؤال؟")) return;
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: error.message });
    else { toast({ title: "تم الحذف" }); fetchData(); }
  };

  // --- Import ---
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const lessonsData = [
      ["عنوان الدرس", "المحتوى", "الملخص", "ترتيب العرض", "منشور (نعم/لا)"],
      ["مثال: مقدمة في البرمجة", "محتوى الدرس هنا...", "ملخص قصير", 1, "نعم"],
    ];
    const questionsData = [
      ["عنوان الدرس", "نص السؤال", "الخيار أ", "الخيار ب", "الخيار ج", "الخيار د", "الإجابة الصحيحة (a/b/c/d)", "الشرح"],
      ["مقدمة في البرمجة", "ما هي لغة البرمجة؟", "أداة تصميم", "لغة حاسوب", "جهاز", "شبكة", "b", "لغة البرمجة هي لغة يفهمها الحاسوب"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lessonsData), "الدروس");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(questionsData), "الأسئلة");
    XLSX.writeFile(wb, "قالب_استيراد_المحتوى.xlsx");
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importMajorId) return;
    setImporting(true);

    try {
      const data = await file.arrayBuffer();
      let lessonsSheet: any[][] = [];
      let questionsSheet: any[][] = [];

      if (file.name.endsWith(".csv")) {
        const text = new TextDecoder("utf-8").decode(data);
        const wb = XLSX.read(text, { type: "string" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        // Detect if CSV is lessons or questions by column count
        if (rows[0] && (rows[0] as any[]).length >= 7) {
          questionsSheet = rows;
        } else {
          lessonsSheet = rows;
        }
      } else {
        const wb = XLSX.read(data, { type: "array" });
        wb.SheetNames.forEach((name) => {
          const sheet = wb.Sheets[name];
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
          if (name.includes("سئلة") || name.includes("question")) {
            questionsSheet = rows;
          } else {
            lessonsSheet = rows;
          }
        });
      }

      // Import lessons (skip header row)
      const lessonMap = new Map<string, string>(); // title -> id
      if (lessonsSheet.length > 1) {
        for (let i = 1; i < lessonsSheet.length; i++) {
          const row = lessonsSheet[i] as any[];
          if (!row[0]) continue;
          const title = String(row[0]).trim();
          const { data: inserted, error } = await supabase.from("lessons").insert({
            major_id: importMajorId,
            title,
            content: row[1] ? String(row[1]) : "",
            summary: row[2] ? String(row[2]) : "",
            display_order: row[3] ? Number(row[3]) : i,
            is_published: row[4] ? String(row[4]).includes("نعم") || String(row[4]).toLowerCase() === "true" : false,
          }).select("id").single();
          if (error) {
            toast({ variant: "destructive", title: `خطأ في درس "${title}": ${error.message}` });
          } else if (inserted) {
            lessonMap.set(title, inserted.id);
          }
        }
      }

      // Import questions (skip header row)
      if (questionsSheet.length > 1) {
        // If no lessons were imported, map existing lessons
        if (lessonMap.size === 0) {
          lessons.filter(l => l.major_id === importMajorId).forEach(l => lessonMap.set(l.title, l.id));
        }

        for (let i = 1; i < questionsSheet.length; i++) {
          const row = questionsSheet[i] as any[];
          if (!row[0] || !row[1]) continue;
          const lessonTitle = String(row[0]).trim();
          const lessonId = lessonMap.get(lessonTitle);
          if (!lessonId) {
            toast({ variant: "destructive", title: `لم يتم العثور على درس "${lessonTitle}" - تخطي السؤال ${i}` });
            continue;
          }
          const { error } = await supabase.from("questions").insert({
            lesson_id: lessonId,
            question_text: String(row[1]),
            option_a: String(row[2] || ""),
            option_b: String(row[3] || ""),
            option_c: String(row[4] || ""),
            option_d: String(row[5] || ""),
            correct_option: String(row[6] || "a").toLowerCase().trim(),
            explanation: row[7] ? String(row[7]) : "",
            display_order: i,
          });
          if (error) {
            toast({ variant: "destructive", title: `خطأ في سؤال ${i}: ${error.message}` });
          }
        }
      }

      toast({ title: "تم الاستيراد بنجاح" });
      fetchData();
    } catch (err: any) {
      toast({ variant: "destructive", title: `خطأ في قراءة الملف: ${err.message}` });
    }
    setImporting(false);
    setImportDialogOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (authLoading || loading || scopeLoading) return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AdminLayout>;

  const lessonQuestions = selectedLesson ? questions.filter((q) => q.lesson_id === selectedLesson) : [];
  const selectedLessonData = selectedLesson ? lessons.find((l) => l.id === selectedLesson) : null;

  return (
    <AdminLayout>
      <PermissionGate permission="content">
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold">المحتوى التعليمي</h1>
            <p className="text-sm text-muted-foreground">{filteredLessons.length} درس</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => { setImportMajorId(filterMajor); setImportDialogOpen(true); }} size="sm" variant="outline">
              <Upload className="w-4 h-4 ml-1" />استيراد
            </Button>
            <Button onClick={openCreateLesson} size="sm"><Plus className="w-4 h-4 ml-1" />إضافة درس</Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <select value={filterUni} onChange={(e) => { setFilterUni(e.target.value); setFilterCollege(""); setFilterMajor(""); }} className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex-1 min-w-[140px]">
            <option value="">جميع الجامعات</option>
            {scopedUniversities.map((u: any) => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
          </select>
          <select value={filterCollege} onChange={(e) => { setFilterCollege(e.target.value); setFilterMajor(""); }} className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex-1 min-w-[140px]">
            <option value="">جميع الكليات</option>
            {filteredColleges.map((c: any) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
          </select>
          <select value={filterMajor} onChange={(e) => setFilterMajor(e.target.value)} className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex-1 min-w-[140px]">
            <option value="">جميع التخصصات</option>
            {filteredMajors.map((m: any) => <option key={m.id} value={m.id}>{m.name_ar}</option>)}
          </select>
        </div>

        {/* Lessons + Questions split view */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Lessons list */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1"><FileText className="w-4 h-4" />الدروس</h2>
            {filteredLessons.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">لا توجد دروس بعد</p>}
            {filteredLessons.map((l) => (
              <Card
                key={l.id}
                className={`cursor-pointer transition-shadow ${selectedLesson === l.id ? "ring-2 ring-primary" : ""} ${!l.is_published ? "opacity-60" : ""}`}
                onClick={() => setSelectedLesson(selectedLesson === l.id ? null : l.id)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">{l.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{getMajorName(l.major_id)}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          <Badge variant={l.is_published ? "default" : "secondary"} className="text-[10px]">
                            {l.is_published ? "منشور" : "مسودة"}
                          </Badge>
                          {l.is_free && (
                            <Badge variant="outline" className="text-[10px] border-green-500 text-green-600 gap-0.5">
                              <Sparkles className="w-2.5 h-2.5" /> مجاني
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px]">
                            {questions.filter((q) => q.lesson_id === l.id).length} سؤال
                          </Badge>
                        </div>
                      </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => openEditLesson(l)}><Pencil className="w-4 h-4" /></Button>
                      {isAdmin && <Button variant="ghost" size="icon" onClick={() => handleDeleteLesson(l.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Questions panel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1"><HelpCircle className="w-4 h-4" />الأسئلة</h2>
              {selectedLesson && (
                <Button size="sm" variant="outline" onClick={() => openCreateQuestion(selectedLesson)}>
                  <Plus className="w-3 h-3 ml-1" />إضافة سؤال
                </Button>
              )}
            </div>
            {!selectedLesson && <p className="text-sm text-muted-foreground py-8 text-center">اختر درساً لعرض أسئلته</p>}
            {selectedLesson && selectedLessonData && (
              <Card className="bg-muted/50">
                <CardContent className="py-2 px-3">
                  <p className="text-xs font-medium">{selectedLessonData.title}</p>
                  {selectedLessonData.summary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{selectedLessonData.summary}</p>}
                </CardContent>
              </Card>
            )}
            {lessonQuestions.length === 0 && selectedLesson && (
              <p className="text-sm text-muted-foreground py-4 text-center">لا توجد أسئلة لهذا الدرس</p>
            )}
            {lessonQuestions.map((q, i) => (
              <Card key={q.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{i + 1}. {q.question_text}</p>
                      <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
                        {["a", "b", "c", "d"].map((opt) => (
                          <span
                            key={opt}
                            className={`px-2 py-1 rounded ${q.correct_option === opt ? "bg-primary/20 text-primary font-medium" : "bg-muted"}`}
                          >
                            {opt.toUpperCase()}) {(q as any)[`option_${opt}`]}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEditQuestion(q)}><Pencil className="w-3 h-3" /></Button>
                      {isAdmin && <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestion(q.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Lesson Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingLesson ? "تعديل درس" : "إضافة درس"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>التخصص *</Label>
              <select value={lessonMajorId} onChange={(e) => setLessonMajorId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">اختر التخصص</option>
                {scopedMajors.map((m: any) => <option key={m.id} value={m.id}>{m.name_ar}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>عنوان الدرس *</Label>
              <Input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>المحتوى</Label>
              <Textarea value={lessonContent} onChange={(e) => setLessonContent(e.target.value)} rows={6} />
            </div>
            <div className="space-y-2">
              <Label>الملخص</Label>
              <Textarea value={lessonSummary} onChange={(e) => setLessonSummary(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>ترتيب العرض</Label>
                <Input type="number" value={lessonOrder} onChange={(e) => setLessonOrder(Number(e.target.value))} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={lessonPublished} onCheckedChange={setLessonPublished} />
                <Label>منشور</Label>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
              <Switch checked={lessonFree} onCheckedChange={setLessonFree} />
              <div>
                <Label className="text-sm">درس مجاني</Label>
                <p className="text-xs text-muted-foreground">يمكن للطلاب الوصول للمحتوى الكامل بدون اشتراك</p>
              </div>
            </div>
            <Button onClick={handleSaveLesson} disabled={saving} className="w-full">{saving ? "جاري الحفظ..." : "حفظ"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingQuestion ? "تعديل سؤال" : "إضافة سؤال"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>نص السؤال *</Label>
              <Textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>الخيار أ *</Label><Input value={optionA} onChange={(e) => setOptionA(e.target.value)} /></div>
              <div className="space-y-2"><Label>الخيار ب *</Label><Input value={optionB} onChange={(e) => setOptionB(e.target.value)} /></div>
              <div className="space-y-2"><Label>الخيار ج *</Label><Input value={optionC} onChange={(e) => setOptionC(e.target.value)} /></div>
              <div className="space-y-2"><Label>الخيار د *</Label><Input value={optionD} onChange={(e) => setOptionD(e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label>الإجابة الصحيحة *</Label>
              <select value={correctOption} onChange={(e) => setCorrectOption(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="a">أ</option>
                <option value="b">ب</option>
                <option value="c">ج</option>
                <option value="d">د</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>الشرح</Label>
              <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} />
            </div>
            <Button onClick={handleSaveQuestion} disabled={saving} className="w-full">{saving ? "جاري الحفظ..." : "حفظ"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Upload className="w-5 h-5" />استيراد دروس وأسئلة</DialogTitle>
            <DialogDescription>استورد الدروس والأسئلة من ملف Excel أو CSV</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>التخصص *</Label>
              <select value={importMajorId} onChange={(e) => setImportMajorId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">اختر التخصص</option>
                {scopedMajors.map((m: any) => <option key={m.id} value={m.id}>{m.name_ar}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label>اختر ملف (Excel أو CSV)</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportFile}
                disabled={!importMajorId || importing}
              />
            </div>

            {importing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />جاري الاستيراد...
              </div>
            )}

            <div className="bg-muted rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold">تنسيق الملف المطلوب:</p>
              <p className="text-xs text-muted-foreground">
                <strong>ورقة "الدروس":</strong> عنوان الدرس | المحتوى | الملخص | ترتيب العرض | منشور
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>ورقة "الأسئلة":</strong> عنوان الدرس | نص السؤال | خيار أ | خيار ب | خيار ج | خيار د | الإجابة (a/b/c/d) | الشرح
              </p>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={downloadTemplate}>
                <Download className="w-3 h-3 ml-1" />تحميل قالب فارغ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </PermissionGate>
    </AdminLayout>
  );
};

export default AdminContent;
