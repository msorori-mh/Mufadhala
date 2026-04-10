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
import { Plus, Pencil, Trash2, Loader2, FileText, HelpCircle, Upload, Download, Sparkles, ChevronDown, ChevronUp, Search, Presentation } from "lucide-react";
import * as XLSX from "xlsx";

interface Subject {
  id: string;
  name_ar: string;
  code: string;
}

interface Lesson {
  id: string;
  major_id: string | null;
  college_id: string | null;
  subject_id: string | null;
  title: string;
  content: string;
  summary: string;
  display_order: number;
  is_published: boolean;
  is_free: boolean;
  created_at: string;
  presentation_url: string | null;
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
  subject: string;
}

interface PendingQuestion {
  tempId: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
  subject: string;
}

const SUBJECT_OPTIONS = [
  { value: "general", label: "عام" },
  { value: "biology", label: "أحياء" },
  { value: "chemistry", label: "كيمياء" },
  { value: "physics", label: "فيزياء" },
  { value: "math", label: "رياضيات" },
  { value: "english", label: "إنجليزي" },
  { value: "iq", label: "ذكاء (IQ)" },
];

const getSubjectLabel = (value: string) => SUBJECT_OPTIONS.find(s => s.value === value)?.label || value;
const getSubjectValue = (label: string) => {
  const trimmed = label?.trim();
  if (!trimmed) return "general";
  const byValue = SUBJECT_OPTIONS.find(s => s.value === trimmed.toLowerCase());
  if (byValue) return byValue.value;
  const byLabel = SUBJECT_OPTIONS.find(s => s.label === trimmed);
  return byLabel ? byLabel.value : "general";
};
const SUBJECT_LABELS_HINT = SUBJECT_OPTIONS.map(s => s.label).join(" / ");

const AdminContent = () => {
  const { user, loading: authLoading, isAdmin } = useAuth("moderator");
  const { toast } = useToast();

  const [majors, setMajors] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [majorSubjectsMap, setMajorSubjectsMap] = useState<Record<string, string[]>>({});
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterUni, setFilterUni] = useState("");
  const [filterCollege, setFilterCollege] = useState("");

  // Lesson dialog
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonSummary, setLessonSummary] = useState("");
  const [lessonMajorId, setLessonMajorId] = useState("");
  const [lessonUniId, setLessonUniId] = useState("");
  const [lessonCollegeId, setLessonCollegeId] = useState("");
  const [lessonOrder, setLessonOrder] = useState(0);
  const [lessonPublished, setLessonPublished] = useState(false);
  const [lessonFree, setLessonFree] = useState(false);
  const [lessonSubjectId, setLessonSubjectId] = useState("");
  const [lessonPresentationFile, setLessonPresentationFile] = useState<File | null>(null);
  const [lessonPresentationUrl, setLessonPresentationUrl] = useState("");
  const [uploadingPresentation, setUploadingPresentation] = useState(false);
  const presentationFileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  // Pending questions for lesson dialog
  const [pendingQuestions, setPendingQuestions] = useState<PendingQuestion[]>([]);
  const [existingLessonQuestions, setExistingLessonQuestions] = useState<Question[]>([]);
  const [showAddQuestionForm, setShowAddQuestionForm] = useState(false);
  const [questionsExpanded, setQuestionsExpanded] = useState(true);
  const lessonQuestionFileRef = useRef<HTMLInputElement>(null);

  // Inline question form state (inside lesson dialog)
  const [inlineQuestionText, setInlineQuestionText] = useState("");
  const [inlineOptionA, setInlineOptionA] = useState("");
  const [inlineOptionB, setInlineOptionB] = useState("");
  const [inlineOptionC, setInlineOptionC] = useState("");
  const [inlineOptionD, setInlineOptionD] = useState("");
  const [inlineCorrectOption, setInlineCorrectOption] = useState("a");
  const [inlineExplanation, setInlineExplanation] = useState("");
  const [inlineSubject, setInlineSubject] = useState("general");

  // Question dialog (for editing from the questions panel)
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
  const [questionSubject, setQuestionSubject] = useState("general");
  const [questionOrder, setQuestionOrder] = useState(0);
  const [questionSubjectFilter, setQuestionSubjectFilter] = useState("all");
  const [questionSearchQuery, setQuestionSearchQuery] = useState("");

  // Selected lesson for questions panel
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);

  // Import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importUniId, setImportUniId] = useState("");
  const [importCollegeId, setImportCollegeId] = useState("");
  const [importMode, setImportMode] = useState<"full" | "questions_only">("full");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import questions for specific lesson (from questions panel)
  const [importQuestionsDialogOpen, setImportQuestionsDialogOpen] = useState(false);
  const [importingQuestions, setImportingQuestions] = useState(false);
  const questionFileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    const [{ data: u }, { data: c }, { data: m }, { data: l }, { data: q }, { data: subs }, { data: ms }] = await Promise.all([
      supabase.from("universities").select("*").order("display_order"),
      supabase.from("colleges").select("*").order("display_order"),
      supabase.from("majors").select("*").order("display_order"),
      supabase.from("lessons").select("*").order("display_order"),
      supabase.from("questions").select("*").order("display_order"),
      supabase.from("subjects").select("id, name_ar, code").eq("is_active", true).order("display_order"),
      supabase.from("major_subjects").select("*"),
    ]);
    if (u) setUniversities(u);
    if (c) setColleges(c);
    if (m) setMajors(m);
    if (l) setLessons(l as Lesson[]);
    if (q) setQuestions(q as Question[]);
    if (subs) setSubjects(subs as Subject[]);
    if (ms) {
      const map: Record<string, string[]> = {};
      (ms as any[]).forEach((r: any) => {
        if (!map[r.major_id]) map[r.major_id] = [];
        map[r.major_id].push(r.subject_id);
      });
      setMajorSubjectsMap(map);
    }
    setLoading(false);
  };

  useEffect(() => { if (!authLoading) fetchData(); }, [authLoading]);

  const { getAllowedMajorIds, loading: scopeLoading } = useModeratorScope(
    user?.id, isAdmin, universities, colleges, majors
  );

  // Apply scope filtering
  const allowedMajorIds = getAllowedMajorIds();
  const scopedMajors = allowedMajorIds ? majors.filter((m: any) => allowedMajorIds.has(m.id)) : majors;
  const scopedLessons = allowedMajorIds
    ? lessons.filter((l) => (l.major_id && allowedMajorIds.has(l.major_id)) || !l.major_id)
    : lessons;
  const scopedCollegeIds = new Set(scopedMajors.map((m: any) => m.college_id));
  const scopedColleges = allowedMajorIds ? colleges.filter((c: any) => scopedCollegeIds.has(c.id)) : colleges;
  const scopedUniIds = new Set(scopedColleges.map((c: any) => c.university_id));
  const scopedUniversities = allowedMajorIds ? universities.filter((u: any) => scopedUniIds.has(u.id)) : universities;

  const filteredColleges = filterUni ? scopedColleges.filter((c: any) => c.university_id === filterUni) : scopedColleges;
  
  const filteredLessons = (() => {
    if (filterCollege) {
      return scopedLessons.filter((l) => l.college_id === filterCollege);
    }
    if (filterUni) {
      const uniCollegeIds = scopedColleges.filter((c: any) => c.university_id === filterUni).map((c: any) => c.id);
      return scopedLessons.filter((l) => l.college_id && uniCollegeIds.includes(l.college_id));
    }
    return scopedLessons;
  })();

  const getCollegeName = (id: string | null) => colleges.find((c: any) => c.id === id)?.name_ar || "";

  // --- Lesson CRUD ---
  const openCreateLesson = () => {
    setEditingLesson(null);
    setLessonTitle("");
    setLessonContent("");
    setLessonSummary("");
    setLessonMajorId("");
    setLessonUniId(filterUni);
    setLessonCollegeId(filterCollege);
    setLessonOrder(filteredLessons.length);
    setLessonPublished(false);
    setLessonFree(false);
    setLessonSubjectId("");
    setLessonPresentationFile(null);
    setLessonPresentationUrl("");
    setPendingQuestions([]);
    setExistingLessonQuestions([]);
    setShowAddQuestionForm(false);
    setQuestionsExpanded(true);
    resetInlineQuestionForm();
    setLessonDialogOpen(true);
  };

  const openEditLesson = (l: Lesson) => {
    setEditingLesson(l);
    setLessonTitle(l.title);
    setLessonContent(l.content);
    setLessonSummary(l.summary);
    setLessonMajorId(l.major_id || "");
    // Derive uni/college from the lesson
    const lessonCollege = l.college_id ? colleges.find((c: any) => c.id === l.college_id) : null;
    setLessonCollegeId(l.college_id || "");
    setLessonUniId(lessonCollege?.university_id || "");
    setLessonOrder(l.display_order);
    setLessonPublished(l.is_published);
    setLessonFree(l.is_free);
    setLessonSubjectId(l.subject_id || "");
    setLessonPresentationFile(null);
    setLessonPresentationUrl(l.presentation_url || "");
    setPendingQuestions([]);
    setExistingLessonQuestions(questions.filter(q => q.lesson_id === l.id));
    setShowAddQuestionForm(false);
    setQuestionsExpanded(true);
    resetInlineQuestionForm();
    setLessonDialogOpen(true);
  };

  const resetInlineQuestionForm = () => {
    setInlineQuestionText("");
    setInlineOptionA("");
    setInlineOptionB("");
    setInlineOptionC("");
    setInlineOptionD("");
    setInlineCorrectOption("a");
    setInlineExplanation("");
    setInlineSubject("general");
  };

  const addPendingQuestion = () => {
    if (!inlineQuestionText || !inlineOptionA || !inlineOptionB || !inlineOptionC || !inlineOptionD) {
      toast({ variant: "destructive", title: "يرجى ملء جميع حقول السؤال المطلوبة" });
      return;
    }
    setPendingQuestions(prev => [...prev, {
      tempId: crypto.randomUUID(),
      question_text: inlineQuestionText,
      option_a: inlineOptionA,
      option_b: inlineOptionB,
      option_c: inlineOptionC,
      option_d: inlineOptionD,
      correct_option: inlineCorrectOption,
      explanation: inlineExplanation,
      subject: inlineSubject,
    }]);
    resetInlineQuestionForm();
    setShowAddQuestionForm(false);
    toast({ title: "تمت إضافة السؤال إلى القائمة" });
  };

  const removePendingQuestion = (tempId: string) => {
    setPendingQuestions(prev => prev.filter(q => q.tempId !== tempId));
  };

  const handleDeleteExistingQuestion = async (id: string) => {
    if (!confirm("حذف هذا السؤال؟")) return;
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: error.message });
    else {
      toast({ title: "تم الحذف" });
      setExistingLessonQuestions(prev => prev.filter(q => q.id !== id));
      fetchData();
    }
  };

  const handleImportQuestionsInDialog = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        const wb = file.name.endsWith(".csv")
          ? XLSX.read(new TextDecoder("utf-8").decode(data as ArrayBuffer), { type: "string" })
          : XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

        if (editingLesson) {
          // Editing: save directly to DB
          let imported = 0;
          const existingCount = existingLessonQuestions.length;
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i] as any[];
            if (!row[0]) continue;
            const { error } = await supabase.from("questions").insert({
              lesson_id: editingLesson.id,
              question_text: String(row[0]),
              option_a: String(row[1] || ""),
              option_b: String(row[2] || ""),
              option_c: String(row[3] || ""),
              option_d: String(row[4] || ""),
              correct_option: String(row[5] || "a").toLowerCase().trim(),
              explanation: row[6] ? String(row[6]) : "",
              subject: row[7] ? getSubjectValue(String(row[7])) : "general",
              display_order: existingCount + i,
            });
            if (!error) imported++;
          }
          toast({ title: `تم استيراد ${imported} سؤال بنجاح` });
          // Refresh existing questions
          const { data: updatedQ } = await supabase.from("questions").select("*").eq("lesson_id", editingLesson.id).order("display_order");
          if (updatedQ) setExistingLessonQuestions(updatedQ as Question[]);
          fetchData();
        } else {
          // Creating: add to pendingQuestions
          const newPending: PendingQuestion[] = [];
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i] as any[];
            if (!row[0]) continue;
            newPending.push({
              tempId: crypto.randomUUID(),
              question_text: String(row[0]),
              option_a: String(row[1] || ""),
              option_b: String(row[2] || ""),
              option_c: String(row[3] || ""),
              option_d: String(row[4] || ""),
              correct_option: String(row[5] || "a").toLowerCase().trim(),
              explanation: row[6] ? String(row[6]) : "",
              subject: row[7] ? getSubjectValue(String(row[7])) : "general",
            });
          }
          setPendingQuestions(prev => [...prev, ...newPending]);
          toast({ title: `تمت إضافة ${newPending.length} سؤال إلى القائمة` });
        }
      } catch (err: any) {
        toast({ variant: "destructive", title: `خطأ في قراءة الملف: ${err.message}` });
      }
    };
    reader.readAsArrayBuffer(file);
    if (lessonQuestionFileRef.current) lessonQuestionFileRef.current.value = "";
  };

  const handleSaveLesson = async () => {
    if (!lessonTitle || !lessonCollegeId) {
      toast({ variant: "destructive", title: "يرجى ملء العنوان واختيار الكلية" });
      return;
    }
    setSaving(true);
    const payload: any = {
      title: lessonTitle,
      content: lessonContent,
      summary: lessonSummary,
      college_id: lessonCollegeId,
      major_id: lessonMajorId || null,
      subject_id: lessonSubjectId || null,
      display_order: lessonOrder,
      is_published: lessonPublished,
      is_free: lessonFree,
    };
    if (editingLesson) {
      const { error } = await supabase.from("lessons").update(payload).eq("id", editingLesson.id);
      if (error) toast({ variant: "destructive", title: error.message });
      else {
        // Save any pending questions for editing mode too
        if (pendingQuestions.length > 0) {
          const baseOrder = existingLessonQuestions.length;
          for (let i = 0; i < pendingQuestions.length; i++) {
            const pq = pendingQuestions[i];
            await supabase.from("questions").insert({
              lesson_id: editingLesson.id,
              question_text: pq.question_text,
              option_a: pq.option_a,
              option_b: pq.option_b,
              option_c: pq.option_c,
              option_d: pq.option_d,
              correct_option: pq.correct_option,
              explanation: pq.explanation,
              subject: pq.subject,
              display_order: baseOrder + i,
            });
          }
        }
        toast({ title: "تم تحديث الدرس" });
      }
    } else {
      const { data: inserted, error } = await supabase.from("lessons").insert(payload).select("id").single();
      if (error) toast({ variant: "destructive", title: error.message });
      else if (inserted) {
        // Save pending questions
        if (pendingQuestions.length > 0) {
          for (let i = 0; i < pendingQuestions.length; i++) {
            const pq = pendingQuestions[i];
            await supabase.from("questions").insert({
              lesson_id: inserted.id,
              question_text: pq.question_text,
              option_a: pq.option_a,
              option_b: pq.option_b,
              option_c: pq.option_c,
              option_d: pq.option_d,
              correct_option: pq.correct_option,
              explanation: pq.explanation,
              subject: pq.subject,
              display_order: i,
            });
          }
        }
        toast({ title: `تمت إضافة الدرس${pendingQuestions.length > 0 ? ` مع ${pendingQuestions.length} سؤال` : ""}` });
      }
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

  // --- Question CRUD (from questions panel) ---
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
    setQuestionSubject("general");
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
    setQuestionSubject(q.subject || "general");
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
      subject: questionSubject,
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

  // --- Import questions for specific lesson (from panel) ---
  const downloadQuestionsTemplate = () => {
    const wb = XLSX.utils.book_new();
    const data = [
      ["نص السؤال", "الخيار أ", "الخيار ب", "الخيار ج", "الخيار د", "الإجابة الصحيحة (a/b/c/d)", "الشرح", `المادة (${SUBJECT_LABELS_HINT})`],
      ["ما هي لغة البرمجة؟", "أداة تصميم", "لغة حاسوب", "جهاز", "شبكة", "b", "لغة البرمجة هي لغة يفهمها الحاسوب", "عام"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "الأسئلة");
    XLSX.writeFile(wb, "قالب_استيراد_أسئلة.xlsx");
  };

  const downloadQuestionsOnlyTemplate = () => {
    const wb = XLSX.utils.book_new();
    const data = [
      ["عنوان الدرس", "نص السؤال", "الخيار أ", "الخيار ب", "الخيار ج", "الخيار د", "الإجابة الصحيحة (a/b/c/d)", "الشرح", `المادة (${SUBJECT_LABELS_HINT})`],
      ["مقدمة في البرمجة", "ما هي لغة البرمجة؟", "أداة تصميم", "لغة حاسوب", "جهاز", "شبكة", "b", "لغة البرمجة هي لغة يفهمها الحاسوب", "عام"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "الأسئلة");
    XLSX.writeFile(wb, "قالب_استيراد_أسئلة_فقط.xlsx");
  };

  const handleImportQuestions = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLesson) return;
    setImportingQuestions(true);

    try {
      const data = await file.arrayBuffer();
      const wb = file.name.endsWith(".csv")
        ? XLSX.read(new TextDecoder("utf-8").decode(data), { type: "string" })
        : XLSX.read(data, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

      let imported = 0;
      const existingCount = questions.filter(q => q.lesson_id === selectedLesson).length;
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] as any[];
        if (!row[0]) continue;
        const { error } = await supabase.from("questions").insert({
          lesson_id: selectedLesson,
          question_text: String(row[0]),
          option_a: String(row[1] || ""),
          option_b: String(row[2] || ""),
          option_c: String(row[3] || ""),
          option_d: String(row[4] || ""),
          correct_option: String(row[5] || "a").toLowerCase().trim(),
          explanation: row[6] ? String(row[6]) : "",
          subject: row[7] ? getSubjectValue(String(row[7])) : "general",
          display_order: existingCount + i,
        });
        if (error) {
          toast({ variant: "destructive", title: `خطأ في سؤال ${i}: ${error.message}` });
        } else {
          imported++;
        }
      }

      toast({ title: `تم استيراد ${imported} سؤال بنجاح` });
      fetchData();
    } catch (err: any) {
      toast({ variant: "destructive", title: `خطأ في قراءة الملف: ${err.message}` });
    }
    setImportingQuestions(false);
    setImportQuestionsDialogOpen(false);
    if (questionFileInputRef.current) questionFileInputRef.current.value = "";
  };

  // --- Export existing lessons ---
  const exportLessons = () => {
    const collegeLessons = filteredLessons;
    if (collegeLessons.length === 0) {
      toast({ variant: "destructive", title: "لا توجد دروس للتصدير" });
      return;
    }
    const wb = XLSX.utils.book_new();
    const header = ["عنوان الدرس", "المحتوى", "الملخص", "ترتيب العرض", "منشور (نعم/لا)", "المادة"];
    const rows = collegeLessons.map(l => [
      l.title,
      l.content,
      l.summary,
      l.display_order,
      l.is_published ? "نعم" : "لا",
      l.subject_id ? (subjects.find(s => s.id === l.subject_id)?.name_ar || "") : "",
    ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...rows]), "الدروس");

    // Export questions sheet
    const qHeader = ["عنوان الدرس", "نص السؤال", "الخيار أ", "الخيار ب", "الخيار ج", "الخيار د", "الإجابة الصحيحة", "الشرح", "ترتيب العرض", "المادة"];
    const qRows: (string | number)[][] = [];
    collegeLessons.forEach(l => {
      const lessonQs = questions.filter(q => q.lesson_id === l.id);
      lessonQs.forEach(q => {
        qRows.push([
          l.title,
          q.question_text,
          q.option_a,
          q.option_b,
          q.option_c,
          q.option_d,
          q.correct_option,
          q.explanation,
          q.display_order,
          q.subject || "general",
        ]);
      });
    });
    if (qRows.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([qHeader, ...qRows]), "الأسئلة");
    }

    XLSX.writeFile(wb, "تصدير_الدروس_والأسئلة.xlsx");
  };

  // --- Bulk Import ---
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const subjectNames = subjects.map(s => s.name_ar).join(" / ");
    const lessonsData = [
      ["عنوان الدرس", "المحتوى", "الملخص", "ترتيب العرض", "منشور (نعم/لا)", `المادة (${subjectNames || "اختياري"})`],
      ["مثال: مقدمة في البرمجة", "محتوى الدرس هنا...", "ملخص قصير", 1, "نعم", subjects[0]?.name_ar || ""],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lessonsData), "الدروس");
    XLSX.writeFile(wb, "قالب_استيراد_الدروس.xlsx");
  };

  const downloadFullTemplate = () => {
    const wb = XLSX.utils.book_new();
    const subjectNames = subjects.map(s => s.name_ar).join(" / ");
    const lessonsData = [
      ["عنوان الدرس", "المحتوى", "الملخص", "ترتيب العرض", "منشور (نعم/لا)", `المادة (${subjectNames || "اختياري"})`],
      ["مثال: مقدمة في البرمجة", "محتوى الدرس هنا...", "ملخص قصير", 1, "نعم", subjects[0]?.name_ar || ""],
    ];
    const questionsData = [
      ["عنوان الدرس", "نص السؤال", "الخيار أ", "الخيار ب", "الخيار ج", "الخيار د", "الإجابة الصحيحة (a/b/c/d)", "الشرح", `المادة (${SUBJECT_LABELS_HINT})`],
      ["مقدمة في البرمجة", "ما هي لغة البرمجة؟", "أداة تصميم", "لغة حاسوب", "جهاز", "شبكة", "b", "لغة البرمجة هي لغة يفهمها الحاسوب", "عام"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lessonsData), "الدروس");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(questionsData), "الأسئلة");
    XLSX.writeFile(wb, "قالب_استيراد_المحتوى.xlsx");
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importCollegeId) return;
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

      const lessonMap = new Map<string, string>();
      if (importMode === "questions_only") {
        // Skip lessons sheet, load existing lessons for this college
        lessons.filter(l => l.college_id === importCollegeId).forEach(l => lessonMap.set(l.title, l.id));
      } else if (lessonsSheet.length > 1) {
        for (let i = 1; i < lessonsSheet.length; i++) {
          const row = lessonsSheet[i] as any[];
          if (!row[0]) continue;
          const title = String(row[0]).trim();
          const subjectName = row[5] ? String(row[5]).trim() : "";
          const matchedSubject = subjectName ? subjects.find(s => s.name_ar === subjectName || s.code === subjectName) : null;
          const { data: inserted, error } = await supabase.from("lessons").insert({
            college_id: importCollegeId,
            title,
            content: row[1] ? String(row[1]) : "",
            summary: row[2] ? String(row[2]) : "",
            display_order: row[3] ? Number(row[3]) : i,
            is_published: row[4] ? String(row[4]).includes("نعم") || String(row[4]).toLowerCase() === "true" : false,
            subject_id: matchedSubject?.id || null,
          }).select("id").single();
          if (error) {
            toast({ variant: "destructive", title: `خطأ في درس "${title}": ${error.message}` });
          } else if (inserted) {
            lessonMap.set(title, inserted.id);
          }
        }
      }

      if (questionsSheet.length > 1) {
        if (lessonMap.size === 0) {
          lessons.filter(l => l.college_id === importCollegeId).forEach(l => lessonMap.set(l.title, l.id));
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
            subject: row[8] ? getSubjectValue(String(row[8])) : "general",
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

  const allLessonQuestions = selectedLesson ? questions.filter((q) => q.lesson_id === selectedLesson) : [];
  const filteredBySubject = questionSubjectFilter === "all" ? allLessonQuestions : allLessonQuestions.filter((q) => q.subject === questionSubjectFilter);
  const lessonQuestions = questionSearchQuery
    ? filteredBySubject.filter((q) => q.question_text.includes(questionSearchQuery) || q.option_a.includes(questionSearchQuery) || q.option_b.includes(questionSearchQuery) || q.option_c.includes(questionSearchQuery) || q.option_d.includes(questionSearchQuery))
    : filteredBySubject;
  const selectedLessonData = selectedLesson ? lessons.find((l) => l.id === selectedLesson) : null;
  const lessonSubjects = [...new Set(allLessonQuestions.map(q => q.subject || "general"))];

  const totalQuestionsInDialog = existingLessonQuestions.length + pendingQuestions.length;

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
            <Button onClick={exportLessons} size="sm" variant="outline">
              <Download className="w-4 h-4 ml-1" />تصدير
            </Button>
            <Button onClick={() => { setImportUniId(filterUni); setImportCollegeId(filterCollege); setImportMode("full"); setImportDialogOpen(true); }} size="sm" variant="outline">
              <Upload className="w-4 h-4 ml-1" />استيراد
            </Button>
            <Button onClick={openCreateLesson} size="sm"><Plus className="w-4 h-4 ml-1" />إضافة درس</Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <select value={filterUni} onChange={(e) => { setFilterUni(e.target.value); setFilterCollege(""); }} className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex-1 min-w-[140px]">
            <option value="">جميع الجامعات</option>
            {scopedUniversities.map((u: any) => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
          </select>
          <select value={filterCollege} onChange={(e) => { setFilterCollege(e.target.value); }} className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex-1 min-w-[140px]">
            <option value="">جميع الكليات</option>
            {filteredColleges.map((c: any) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
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
                onClick={() => { setSelectedLesson(selectedLesson === l.id ? null : l.id); setQuestionSubjectFilter("all"); setQuestionSearchQuery(""); }}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">{l.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getCollegeName(l.college_id)}
                          {l.subject_id && (() => {
                            const subj = subjects.find(s => s.id === l.subject_id);
                            return subj ? ` • ${subj.name_ar}` : "";
                          })()}
                        </p>
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
              <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1 min-w-0"><HelpCircle className="w-4 h-4 shrink-0" />الأسئلة{selectedLessonData && <span className="text-xs font-normal text-muted-foreground/70 truncate"> — {selectedLessonData.title}</span>}</h2>
              {selectedLesson && (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setImportQuestionsDialogOpen(true)}>
                    <Upload className="w-3 h-3 ml-1" />استيراد أسئلة
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openCreateQuestion(selectedLesson)}>
                    <Plus className="w-3 h-3 ml-1" />إضافة سؤال
                  </Button>
                </div>
              )}
            </div>
            {selectedLesson && lessonSubjects.length > 1 && (
              <div className="flex gap-1 flex-wrap">
                <Badge
                  variant={questionSubjectFilter === "all" ? "default" : "outline"}
                  className="cursor-pointer text-[10px]"
                  onClick={() => setQuestionSubjectFilter("all")}
                >
                  الكل ({allLessonQuestions.length})
                </Badge>
                {lessonSubjects.map((s) => (
                  <Badge
                    key={s}
                    variant={questionSubjectFilter === s ? "default" : "outline"}
                    className="cursor-pointer text-[10px]"
                    onClick={() => setQuestionSubjectFilter(s)}
                  >
                    {getSubjectLabel(s)} ({allLessonQuestions.filter(q => q.subject === s).length})
                  </Badge>
                ))}
              </div>
            )}
            {selectedLesson && allLessonQuestions.length > 0 && (
              <div className="relative">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={questionSearchQuery}
                  onChange={(e) => setQuestionSearchQuery(e.target.value)}
                  placeholder="ابحث في الأسئلة..."
                  className="w-full bg-muted rounded-lg pr-8 pl-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
                />
              </div>
            )}
            {!selectedLesson && <p className="text-sm text-muted-foreground py-8 text-center">اختر درساً لعرض أسئلته</p>}
            {selectedLesson && (questionSearchQuery || questionSubjectFilter !== "all") && (
              <p className="text-[11px] text-muted-foreground text-center">
                عرض {lessonQuestions.length} من {allLessonQuestions.length} سؤال
              </p>
            )}
            {lessonQuestions.length === 0 && selectedLesson && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {questionSearchQuery || questionSubjectFilter !== "all" ? "لا توجد نتائج مطابقة" : "لا توجد أسئلة لهذا الدرس"}
              </p>
            )}
            {lessonQuestions.map((q, i) => (
              <Card key={q.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{i + 1}. {q.question_text}</p>
                      {q.subject && q.subject !== "general" && (
                        <Badge variant="outline" className="text-[10px] mt-1">{getSubjectLabel(q.subject)}</Badge>
                      )}
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

      {/* Lesson Dialog - with integrated questions section */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editingLesson ? "تعديل درس" : "إضافة درس"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الجامعة *</Label>
              <select value={lessonUniId} onChange={(e) => { setLessonUniId(e.target.value); setLessonCollegeId(""); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">اختر الجامعة</option>
                {scopedUniversities.map((u: any) => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>الكلية *</Label>
              <select value={lessonCollegeId} onChange={(e) => setLessonCollegeId(e.target.value)} disabled={!lessonUniId} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50">
                <option value="">اختر الكلية</option>
                {scopedColleges.filter((c: any) => c.university_id === lessonUniId).map((c: any) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>المادة الدراسية</Label>
              <select value={lessonSubjectId} onChange={(e) => setLessonSubjectId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">بدون تصنيف</option>
                {(lessonMajorId && majorSubjectsMap[lessonMajorId]
                  ? subjects.filter(s => majorSubjectsMap[lessonMajorId].includes(s.id))
                  : subjects
                ).map((s) => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
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

            {/* Questions Section */}
            <div className="border rounded-lg">
              <button
                type="button"
                onClick={() => setQuestionsExpanded(!questionsExpanded)}
                className="flex items-center justify-between w-full p-3 text-sm font-semibold hover:bg-muted/50 rounded-t-lg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4" />
                  الأسئلة ({totalQuestionsInDialog})
                </span>
                {questionsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {questionsExpanded && (
                <div className="p-3 pt-0 space-y-3">
                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <Button type="button" size="sm" variant="outline" onClick={() => setShowAddQuestionForm(!showAddQuestionForm)}>
                      <Plus className="w-3 h-3 ml-1" />{showAddQuestionForm ? "إلغاء" : "إضافة سؤال"}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => lessonQuestionFileRef.current?.click()}>
                      <Upload className="w-3 h-3 ml-1" />استيراد أسئلة
                    </Button>
                    <input
                      ref={lessonQuestionFileRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={handleImportQuestionsInDialog}
                    />
                    <Button type="button" size="sm" variant="ghost" onClick={downloadQuestionsTemplate} className="text-xs">
                      <Download className="w-3 h-3 ml-1" />تحميل قالب
                    </Button>
                  </div>

                  {/* Inline add question form */}
                  {showAddQuestionForm && (
                    <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                      <div className="space-y-2">
                        <Label className="text-xs">المادة</Label>
                        <select value={inlineSubject} onChange={(e) => setInlineSubject(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                          {SUBJECT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">نص السؤال *</Label>
                        <Textarea value={inlineQuestionText} onChange={(e) => setInlineQuestionText(e.target.value)} rows={2} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1"><Label className="text-xs">الخيار أ *</Label><Input value={inlineOptionA} onChange={(e) => setInlineOptionA(e.target.value)} className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs">الخيار ب *</Label><Input value={inlineOptionB} onChange={(e) => setInlineOptionB(e.target.value)} className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs">الخيار ج *</Label><Input value={inlineOptionC} onChange={(e) => setInlineOptionC(e.target.value)} className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs">الخيار د *</Label><Input value={inlineOptionD} onChange={(e) => setInlineOptionD(e.target.value)} className="h-8 text-sm" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">الإجابة الصحيحة *</Label>
                          <select value={inlineCorrectOption} onChange={(e) => setInlineCorrectOption(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                            <option value="a">أ</option>
                            <option value="b">ب</option>
                            <option value="c">ج</option>
                            <option value="d">د</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">الشرح</Label>
                          <Input value={inlineExplanation} onChange={(e) => setInlineExplanation(e.target.value)} className="h-9 text-sm" />
                        </div>
                      </div>
                      <Button type="button" size="sm" onClick={addPendingQuestion} className="w-full">إضافة السؤال</Button>
                    </div>
                  )}

                  {/* Existing questions (edit mode) */}
                  {existingLessonQuestions.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">الأسئلة المحفوظة ({existingLessonQuestions.length})</p>
                      {existingLessonQuestions.map((q, i) => (
                        <div key={q.id} className="flex items-center justify-between gap-2 p-2 rounded border bg-background text-xs">
                          <span className="truncate flex-1">{i + 1}. {q.question_text}</span>
                          <div className="flex gap-1 shrink-0">
                            <Badge variant="outline" className="text-[10px]">{q.correct_option.toUpperCase()}</Badge>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteExistingQuestion(q.id)}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pending questions */}
                  {pendingQuestions.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">أسئلة جديدة ({pendingQuestions.length})</p>
                      {pendingQuestions.map((q, i) => (
                        <div key={q.tempId} className="flex items-center justify-between gap-2 p-2 rounded border border-dashed border-primary/30 bg-primary/5 text-xs">
                          <span className="truncate flex-1">{existingLessonQuestions.length + i + 1}. {q.question_text}</span>
                          <div className="flex gap-1 shrink-0">
                            <Badge variant="outline" className="text-[10px]">{q.correct_option.toUpperCase()}</Badge>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => removePendingQuestion(q.tempId)}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {totalQuestionsInDialog === 0 && !showAddQuestionForm && (
                    <p className="text-xs text-muted-foreground text-center py-2">لا توجد أسئلة بعد</p>
                  )}
                </div>
              )}
            </div>

            <Button onClick={handleSaveLesson} disabled={saving} className="w-full">
              {saving ? "جاري الحفظ..." : `حفظ${pendingQuestions.length > 0 ? ` (مع ${pendingQuestions.length} سؤال جديد)` : ""}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Question Dialog (from panel) */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingQuestion ? "تعديل سؤال" : "إضافة سؤال"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>المادة</Label>
              <select value={questionSubject} onChange={(e) => setQuestionSubject(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {SUBJECT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
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
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              {importMode === "questions_only" ? "استيراد أسئلة فقط" : "استيراد دروس وأسئلة"}
            </DialogTitle>
            <DialogDescription>
              {importMode === "questions_only"
                ? "استورد أسئلة وربطها بالدروس الموجودة في الكلية المختارة"
                : "استورد الدروس والأسئلة من ملف Excel أو CSV"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Import Mode Toggle */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => setImportMode("full")}
                className={`flex-1 text-sm py-1.5 px-3 rounded-md transition-colors ${importMode === "full" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                دروس وأسئلة
              </button>
              <button
                type="button"
                onClick={() => setImportMode("questions_only")}
                className={`flex-1 text-sm py-1.5 px-3 rounded-md transition-colors ${importMode === "questions_only" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                أسئلة فقط
              </button>
            </div>

            <div className="space-y-2">
              <Label>الجامعة *</Label>
              <select value={importUniId} onChange={(e) => { setImportUniId(e.target.value); setImportCollegeId(""); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">اختر الجامعة</option>
                {scopedUniversities.map((u: any) => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>الكلية *</Label>
              <select value={importCollegeId} onChange={(e) => { setImportCollegeId(e.target.value); }} disabled={!importUniId} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50">
                <option value="">اختر الكلية</option>
                {scopedColleges.filter((c: any) => c.university_id === importUniId).map((c: any) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
            </div>

            {importMode === "questions_only" && importCollegeId && (
              <div className="text-xs text-muted-foreground bg-accent/50 rounded-md p-2">
                سيتم ربط الأسئلة بالدروس الموجودة ({lessons.filter(l => l.college_id === importCollegeId).length} درس) عبر تطابق عنوان الدرس
              </div>
            )}

            <div className="space-y-2">
              <Label>اختر ملف (Excel أو CSV)</Label>
              <Input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} disabled={!importCollegeId || importing} />
            </div>
            {importing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />جاري الاستيراد...
              </div>
            )}
            <div className="bg-muted rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold">تنسيق الملف المطلوب:</p>
              {importMode === "questions_only" ? (
                <p className="text-xs text-muted-foreground">
                  <strong>ورقة "الأسئلة":</strong> عنوان الدرس | نص السؤال | خيار أ | خيار ب | خيار ج | خيار د | الإجابة (a/b/c/d) | الشرح | المادة
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    <strong>ورقة "الدروس":</strong> عنوان الدرس | المحتوى | الملخص | ترتيب العرض | منشور
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>ورقة "الأسئلة":</strong> عنوان الدرس | نص السؤال | خيار أ | خيار ب | خيار ج | خيار د | الإجابة (a/b/c/d) | الشرح | المادة
                  </p>
                </>
              )}
              <div className="flex gap-3 flex-wrap">
                {importMode === "questions_only" ? (
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={downloadQuestionsOnlyTemplate}>
                    <Download className="w-3 h-3 ml-1" />تحميل قالب الأسئلة
                  </Button>
                ) : (
                  <>
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={downloadFullTemplate}>
                      <Download className="w-3 h-3 ml-1" />قالب دروس + أسئلة
                    </Button>
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={downloadTemplate}>
                      <Download className="w-3 h-3 ml-1" />قالب دروس فقط
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Questions Dialog (from panel) */}
      <Dialog open={importQuestionsDialogOpen} onOpenChange={setImportQuestionsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Upload className="w-5 h-5" />استيراد أسئلة للدرس</DialogTitle>
            <DialogDescription>
              {selectedLessonData ? `استيراد أسئلة لدرس: ${selectedLessonData.title}` : "اختر درساً أولاً"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اختر ملف (Excel أو CSV)</Label>
              <Input ref={questionFileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImportQuestions} disabled={!selectedLesson || importingQuestions} />
            </div>
            {importingQuestions && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />جاري الاستيراد...
              </div>
            )}
            <div className="bg-muted rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold">تنسيق الملف المطلوب:</p>
              <p className="text-xs text-muted-foreground">
                نص السؤال | خيار أ | خيار ب | خيار ج | خيار د | الإجابة (a/b/c/d) | الشرح
              </p>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={downloadQuestionsTemplate}>
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
