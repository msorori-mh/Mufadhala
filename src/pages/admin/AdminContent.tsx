import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useModeratorScope } from "@/hooks/useModeratorScope";
import AdminLayout from "@/components/admin/AdminLayout";
import PermissionGate from "@/components/admin/PermissionGate";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, FileText, HelpCircle, Upload, Download, Sparkles, ChevronDown, ChevronUp, Search, Presentation, CheckSquare } from "lucide-react";
import * as XLSX from "xlsx";
import { parseWorkbook, executeImport, downloadUnifiedTemplate, type ImportReport, type ValidationError } from "@/services/importEngine";

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
  created_at: string;
  presentation_url: string | null;
  grade_level: number | null;
  lesson_code: string | null;
}

const GRADE_LEVELS = [
  { value: 1, label: "أول ثانوي" },
  { value: 2, label: "ثاني ثانوي" },
  { value: 3, label: "ثالث ثانوي" },
];
const getGradeLevelLabel = (v: number | null) => GRADE_LEVELS.find(g => g.value === v)?.label || "";

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
  question_type: string;
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
  question_type: string;
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
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters — subject-based
  const [filterSubject, setFilterSubject] = useState("");
  const [filterGradeLevel, setFilterGradeLevel] = useState("");
  const [filterPublished, setFilterPublished] = useState("");
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);

  // Lesson dialog
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonSummary, setLessonSummary] = useState("");
  const [lessonOrder, setLessonOrder] = useState(0);
  const [lessonPublished, setLessonPublished] = useState(false);
  
  const [lessonSubjectId, setLessonSubjectId] = useState("");
  const [lessonPresentationFile, setLessonPresentationFile] = useState<File | null>(null);
  const [lessonPresentationUrl, setLessonPresentationUrl] = useState("");
  const [lessonGradeLevel, setLessonGradeLevel] = useState<number | null>(null);
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
  const [inlineQuestionType, setInlineQuestionType] = useState("multiple_choice");

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
  const [questionType, setQuestionType] = useState("multiple_choice");
  const [questionSubjectFilter, setQuestionSubjectFilter] = useState("all");
  const [questionSearchQuery, setQuestionSearchQuery] = useState("");

  // Selected lesson for questions panel
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);

  // Import state (unified)
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSubjectId, setImportSubjectId] = useState("");
  const [importGradeLevel, setImportGradeLevel] = useState("");
  const [importReport, setImportReport] = useState<ImportReport | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch ALL questions in batches of 1000 to bypass PostgREST's max-rows cap
  const fetchAllQuestions = async (): Promise<Question[]> => {
    const PAGE = 1000;
    let from = 0;
    const all: Question[] = [];
    while (true) {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .order("display_order")
        .range(from, from + PAGE - 1);
      if (error || !data) break;
      all.push(...(data as Question[]));
      if (data.length < PAGE) break;
      from += PAGE;
      if (from > 200000) break; // safety guard
    }
    return all;
  };

  const fetchData = async () => {
    const [{ data: u }, { data: c }, { data: m }, { data: l }, qAll, { data: subs }] = await Promise.all([
      supabase.from("universities").select("*").order("display_order"),
      supabase.from("colleges").select("*").order("display_order"),
      supabase.from("majors").select("*").order("display_order"),
      supabase.from("lessons").select("*").order("display_order").limit(5000),
      fetchAllQuestions(),
      supabase.from("subjects").select("id, name_ar, code").eq("is_active", true).order("display_order"),
    ]);
    if (u) setUniversities(u);
    if (c) setColleges(c);
    if (m) setMajors(m);
    if (l) setLessons(l as Lesson[]);
    setQuestions(qAll);
    if (subs) setSubjects(subs as Subject[]);
    setLoading(false);
  };

  useEffect(() => { if (!authLoading) fetchData(); }, [authLoading]);

  const { getAllowedMajorIds, loading: scopeLoading } = useModeratorScope(
    user?.id, isAdmin, universities, colleges, majors
  );

  // Apply scope filtering — now primarily by subject
  const allowedMajorIds = getAllowedMajorIds();
  const scopedLessons = lessons; // All lessons are shared, no college-based scoping needed

  // Filter lessons by subject, grade level, published state
  const filteredLessons = (() => {
    let result = scopedLessons;
    if (filterSubject) {
      result = result.filter((l) => l.subject_id === filterSubject);
    }
    if (filterGradeLevel) {
      const gl = Number(filterGradeLevel);
      result = result.filter((l) => l.grade_level === gl);
    }
    if (filterPublished === "published") {
      result = result.filter((l) => l.is_published);
    } else if (filterPublished === "draft") {
      result = result.filter((l) => !l.is_published);
    }
    return result;
  })();

  const getSubjectName = (id: string | null) => subjects.find((s) => s.id === id)?.name_ar || "";

  // --- Lesson CRUD ---
  const openCreateLesson = () => {
    setEditingLesson(null);
    setLessonTitle("");
    setLessonContent("");
    setLessonSummary("");
    setLessonOrder(filteredLessons.length);
    setLessonPublished(false);
    
    setLessonSubjectId(filterSubject || "");
    setLessonPresentationFile(null);
    setLessonPresentationUrl("");
    setLessonGradeLevel(null);
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
    setLessonOrder(l.display_order);
    setLessonPublished(l.is_published);
    
    setLessonSubjectId(l.subject_id || "");
    setLessonPresentationFile(null);
    setLessonPresentationUrl(l.presentation_url || "");
    setLessonGradeLevel(l.grade_level ?? null);
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
    setInlineQuestionType("multiple_choice");
  };

  const addPendingQuestion = () => {
    const isTF = inlineQuestionType === "true_false";
    if (!inlineQuestionText || !inlineOptionA || !inlineOptionB || (!isTF && (!inlineOptionC || !inlineOptionD))) {
      toast({ variant: "destructive", title: "يرجى ملء جميع حقول السؤال المطلوبة" });
      return;
    }
    setPendingQuestions(prev => [...prev, {
      tempId: crypto.randomUUID(),
      question_text: inlineQuestionText,
      option_a: isTF ? "صح" : inlineOptionA,
      option_b: isTF ? "خطأ" : inlineOptionB,
      option_c: isTF ? "" : inlineOptionC,
      option_d: isTF ? "" : inlineOptionD,
      correct_option: inlineCorrectOption,
      explanation: inlineExplanation,
      subject: inlineSubject,
      question_type: inlineQuestionType,
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
          let imported = 0;
          const existingCount = existingLessonQuestions.length;
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i] as any[];
            if (!row[0]) continue;
            const qType = row[8] ? String(row[8]).trim().toLowerCase() === "true_false" ? "true_false" : "multiple_choice" : "multiple_choice";
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
              question_type: qType,
              display_order: existingCount + i,
            });
            if (!error) imported++;
          }
          toast({ title: `تم استيراد ${imported} سؤال بنجاح` });
          const { data: updatedQ } = await supabase.from("questions").select("*").eq("lesson_id", editingLesson.id).order("display_order");
          if (updatedQ) setExistingLessonQuestions(updatedQ as Question[]);
          fetchData();
        } else {
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
              question_type: row[8] ? String(row[8]).trim().toLowerCase() === "true_false" ? "true_false" : "multiple_choice" : "multiple_choice",
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
    if (!lessonTitle || !lessonSubjectId) {
      toast({ variant: "destructive", title: "يرجى ملء العنوان واختيار المادة الدراسية" });
      return;
    }
    setSaving(true);

    // Upload presentation file if selected
    let presentationUrl = lessonPresentationUrl;
    if (lessonPresentationFile) {
      setUploadingPresentation(true);
      const { safeFileExtension, validateUploadFile, FILE_PRESETS } = await import("@/lib/storageKey");
      const v = validateUploadFile(lessonPresentationFile, FILE_PRESETS.presentation);
      if (!v.ok) {
        toast({ variant: "destructive", title: "ملف عرض غير صالح", description: v.error });
        setSaving(false);
        setUploadingPresentation(false);
        return;
      }
      const fileExt = safeFileExtension(lessonPresentationFile.name, "pptx");
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('lesson-presentations')
        .upload(fileName, lessonPresentationFile, {
          contentType: lessonPresentationFile.type || undefined,
        });
      if (uploadError) {
        toast({ variant: "destructive", title: `خطأ في رفع العرض: ${uploadError.message}` });
        setSaving(false);
        setUploadingPresentation(false);
        return;
      }
      presentationUrl = fileName;
      setUploadingPresentation(false);
    }

    const payload: any = {
      title: lessonTitle,
      content: lessonContent,
      summary: lessonSummary,
      subject_id: lessonSubjectId,
      display_order: lessonOrder,
      is_published: lessonPublished,
      presentation_url: presentationUrl || null,
      grade_level: lessonGradeLevel,
      // Shared content — no college/major ownership
      college_id: null,
      major_id: null,
    };

    if (editingLesson) {
      const { error } = await supabase.from("lessons").update(payload).eq("id", editingLesson.id);
      if (error) toast({ variant: "destructive", title: error.message });
      else {
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
              question_type: pq.question_type,
              display_order: baseOrder + i,
            });
          }
        }
        toast({ title: "تم تحديث الدرس" });
      }
    } else {
      // Create ONE shared lesson (no college duplication)
      const { data: inserted, error } = await supabase.from("lessons").insert(payload).select("id").single();
      if (error) {
        toast({ variant: "destructive", title: error.message });
      } else if (inserted) {
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
              question_type: pq.question_type,
              display_order: i,
            });
          }
        }
        const qMsg = pendingQuestions.length > 0 ? ` مع ${pendingQuestions.length} سؤال` : "";
        toast({ title: `تمت إضافة الدرس${qMsg}` });
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

  const handleBulkDeleteLessons = async () => {
    if (selectedLessonIds.length === 0) return;
    if (!confirm(`حذف ${selectedLessonIds.length} درس وجميع أسئلتهم؟`)) return;
    const { error } = await supabase.from("lessons").delete().in("id", selectedLessonIds);
    if (error) toast({ variant: "destructive", title: error.message });
    else {
      toast({ title: `تم حذف ${selectedLessonIds.length} درس` });
      if (selectedLesson && selectedLessonIds.includes(selectedLesson)) setSelectedLesson(null);
      setSelectedLessonIds([]);
      setBulkSelectMode(false);
      fetchData();
    }
  };

  const toggleLessonSelection = (id: string) => {
    setSelectedLessonIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
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
    setQuestionType("multiple_choice");
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
    setQuestionType(q.question_type || "multiple_choice");
    setQuestionOrder(q.display_order);
    setQuestionDialogOpen(true);
  };

  const handleSaveQuestion = async () => {
    const isTF = questionType === "true_false";
    if (!questionText || !optionA || !optionB || (!isTF && (!optionC || !optionD))) {
      toast({ variant: "destructive", title: "يرجى ملء جميع الحقول المطلوبة" });
      return;
    }
    setSaving(true);
    const payload = {
      lesson_id: questionLessonId,
      question_text: questionText,
      option_a: isTF ? "صح" : optionA,
      option_b: isTF ? "خطأ" : optionB,
      option_c: isTF ? "" : optionC,
      option_d: isTF ? "" : optionD,
      correct_option: correctOption,
      explanation,
      display_order: questionOrder,
      subject: questionSubject,
      question_type: questionType,
    };
    if (editingQuestion) {
      const { error } = await supabase.from("questions").update(payload).eq("id", editingQuestion.id);
      if (error) toast({ variant: "destructive", title: error.message });
      else toast({ title: "تم تحديث السؤال" });
    } else {
      const existingQ = questions.find(q => q.lesson_id === questionLessonId && q.question_text.trim() === questionText.trim());
      if (existingQ) {
        toast({ variant: "destructive", title: "هذا السؤال موجود بالفعل في هذا الدرس" });
        setSaving(false);
        return;
      }
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
      ["نص السؤال", "الخيار أ", "الخيار ب", "الخيار ج", "الخيار د", "الإجابة الصحيحة (a/b/c/d)", "الشرح", `المادة (${SUBJECT_LABELS_HINT})`, "نوع السؤال (multiple_choice / true_false)"],
      ["ما هي لغة البرمجة؟", "أداة تصميم", "لغة حاسوب", "جهاز", "شبكة", "b", "لغة البرمجة هي لغة يفهمها الحاسوب", "عام", "multiple_choice"],
      ["الأرض مسطحة", "صح", "خطأ", "", "", "b", "الأرض كروية الشكل", "عام", "true_false"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), "الأسئلة");
    XLSX.writeFile(wb, "قالب_استيراد_أسئلة.xlsx");
  };

  const handleImportQuestions = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLesson) return;
    setImporting(true);

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
        const qText = String(row[0]).trim();
        const existingQ = questions.find(q => q.lesson_id === selectedLesson && q.question_text.trim() === qText);
        if (existingQ) continue;
        const qType = row[8] ? String(row[8]).trim().toLowerCase() === "true_false" ? "true_false" : "multiple_choice" : "multiple_choice";
        const { error } = await supabase.from("questions").insert({
          lesson_id: selectedLesson,
          question_text: qText,
          option_a: String(row[1] || ""),
          option_b: String(row[2] || ""),
          option_c: String(row[3] || ""),
          option_d: String(row[4] || ""),
          correct_option: String(row[5] || "a").toLowerCase().trim(),
          explanation: row[6] ? String(row[6]) : "",
          subject: row[7] ? getSubjectValue(String(row[7])) : "general",
          question_type: qType,
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
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- Export existing lessons ---
  const exportLessons = () => {
    const exportData = filteredLessons;
    if (exportData.length === 0) {
      toast({ variant: "destructive", title: "لا توجد دروس للتصدير" });
      return;
    }
    const wb = XLSX.utils.book_new();
    const header = ["كود الدرس", "المادة", "عنوان الدرس", "المحتوى", "الملخص", "ترتيب العرض", "منشور (نعم/لا)", "الصف الدراسي", "رابط العرض التقديمي"];
    const rows = exportData.map(l => [
      l.lesson_code || "",
      l.subject_id ? (subjects.find(s => s.id === l.subject_id)?.name_ar || "") : "",
      l.title,
      l.content,
      l.summary,
      l.display_order,
      l.is_published ? "نعم" : "لا",
      l.grade_level || "",
      l.presentation_url || "",
    ]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header, ...rows]), "الدروس");

    // Export questions sheet
    const qHeader = ["كود الدرس", "نوع السؤال", "نص السؤال", "الخيار أ", "الخيار ب", "الخيار ج", "الخيار د", "الإجابة الصحيحة", "الشرح", "ترتيب العرض"];
    const qRows: (string | number)[][] = [];
    exportData.forEach(l => {
      const lessonQs = questions.filter(q => q.lesson_id === l.id);
      lessonQs.forEach(q => {
        qRows.push([
          l.lesson_code || l.title,
          q.question_type || "multiple_choice",
          q.question_text,
          q.option_a,
          q.option_b,
          q.option_c,
          q.option_d,
          q.correct_option,
          q.explanation,
          q.display_order,
        ]);
      });
    });
    if (qRows.length > 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([qHeader, ...qRows]), "الأسئلة");
    }

    XLSX.writeFile(wb, "تصدير_الدروس_والأسئلة.xlsx");
  };

  // --- Bulk Import (Unified Engine — Subject-Based) ---
  const handleDownloadUnifiedTemplate = () => {
    downloadUnifiedTemplate(subjects);
  };

  const handleUnifiedImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setImporting(true);
    setImportReport(null);

    // Aggregated report across all files
    const aggregated: ImportReport = {
      lessonsCreated: 0,
      lessonsUpdated: 0,
      lessonsSkipped: 0,
      questionsCreated: 0,
      questionsSkipped: 0,
      questionsFailed: 0,
      errors: [],
      warnings: [],
      mode: "combined",
    };

    // Mutable snapshots so subsequent files see lessons created by earlier files
    const existingLessons = lessons.map(l => ({ id: l.id, title: l.title, lesson_code: l.lesson_code || null, subject_id: l.subject_id || null }));
    const existingQuestions = questions.map(q => ({ id: q.id, lesson_id: q.lesson_id, question_text: q.question_text }));

    let successFiles = 0;
    let failedFiles = 0;

    for (const file of files) {
      try {
        const data = await file.arrayBuffer();
        const { lessonsRows, questionsRows } = parseWorkbook(data, file.name);

        const report = await executeImport({
          lessonsRows,
          questionsRows,
          subjects,
          existingLessons,
          existingQuestions,
          fallbackSubjectId: importSubjectId || undefined,
          fallbackGradeLevel: importGradeLevel ? Number(importGradeLevel) : null,
        });

        aggregated.lessonsCreated += report.lessonsCreated;
        aggregated.lessonsUpdated += report.lessonsUpdated;
        aggregated.lessonsSkipped += report.lessonsSkipped;
        aggregated.questionsCreated += report.questionsCreated;
        aggregated.questionsSkipped += report.questionsSkipped;
        aggregated.questionsFailed += report.questionsFailed;
        // Prefix errors/warnings with file name for clarity
        aggregated.errors.push(...report.errors.map(err => ({ ...err, sheet: `[${file.name}] ${err.sheet}` })));
        aggregated.warnings.push(...report.warnings.map(w => ({ ...w, sheet: `[${file.name}] ${w.sheet}` })));
        successFiles++;
      } catch (err: any) {
        failedFiles++;
        aggregated.errors.push({
          row: 0,
          sheet: `[${file.name}]`,
          field: "file",
          message: `فشل قراءة الملف: ${err.message}`,
        });
      }
    }

    setImportReport(aggregated);

    if (aggregated.errors.length === 0) {
      toast({ title: `تم استيراد ${successFiles} ملف: ${aggregated.lessonsCreated} درس، ${aggregated.questionsCreated} سؤال` });
    } else {
      toast({
        variant: "destructive",
        title: `${successFiles}/${files.length} ملف بنجاح — ${aggregated.errors.length} خطأ`,
      });
    }
    fetchData();
    setImporting(false);
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
            <p className="text-sm text-muted-foreground">
              {filteredLessons.length} درس · {questions.filter((q) => filteredLessons.some((l) => l.id === q.lesson_id)).length} سؤال
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportLessons} size="sm" variant="outline">
              <Download className="w-4 h-4 ml-1" />تصدير
            </Button>
            <Button onClick={() => { setImportSubjectId(filterSubject); setImportGradeLevel(filterGradeLevel); setImportReport(null); setImportDialogOpen(true); }} size="sm" variant="outline">
              <Upload className="w-4 h-4 ml-1" />استيراد
            </Button>
            <Button onClick={openCreateLesson} size="sm"><Plus className="w-4 h-4 ml-1" />إضافة درس</Button>
          </div>
        </div>

        {/* Content overview matrix: subjects × grade levels */}
        <Collapsible defaultOpen={false}>
          <Card>
            <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">نظرة شاملة على المحتوى (المواد × الصفوف)</span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                {(() => {
                  const matrix = subjects.map(subject => {
                    const byGrade = GRADE_LEVELS.map(g => {
                      const ls = scopedLessons.filter(l => l.subject_id === subject.id && l.grade_level === g.value);
                      const qs = questions.filter(q => ls.some(l => l.id === q.lesson_id)).length;
                      return { grade: g.value, label: g.label, lessons: ls.length, questions: qs };
                    });
                    const totals = {
                      lessons: byGrade.reduce((s, g) => s + g.lessons, 0),
                      questions: byGrade.reduce((s, g) => s + g.questions, 0),
                    };
                    return { subject, byGrade, totals };
                  });
                  const grandTotals = GRADE_LEVELS.map(g => {
                    const ls = scopedLessons.filter(l => l.grade_level === g.value);
                    const qs = questions.filter(q => ls.some(l => l.id === q.lesson_id)).length;
                    return { lessons: ls.length, questions: qs };
                  });
                  const grandSum = {
                    lessons: grandTotals.reduce((s, g) => s + g.lessons, 0),
                    questions: grandTotals.reduce((s, g) => s + g.questions, 0),
                  };
                  return (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">المادة</TableHead>
                          {GRADE_LEVELS.map(g => (
                            <TableHead key={g.value} className="text-center">{g.label}</TableHead>
                          ))}
                          <TableHead className="text-center font-bold">الإجمالي</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {matrix.map(({ subject, byGrade, totals }) => (
                          <TableRow key={subject.id}>
                            <TableCell className="font-medium text-right">{subject.name_ar}</TableCell>
                            {byGrade.map(g => (
                              <TableCell key={g.grade} className="text-center text-xs">
                                {g.lessons === 0 && g.questions === 0 ? (
                                  <span className="text-muted-foreground">—</span>
                                ) : (
                                  <span>{g.lessons} درس · {g.questions} سؤال</span>
                                )}
                              </TableCell>
                            ))}
                            <TableCell className="text-center text-xs font-semibold bg-muted/30">
                              {totals.lessons} درس · {totals.questions} سؤال
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell className="text-right font-bold">الإجمالي العام</TableCell>
                          {grandTotals.map((g, i) => (
                            <TableCell key={i} className="text-center text-xs font-bold">
                              {g.lessons} درس · {g.questions} سؤال
                            </TableCell>
                          ))}
                          <TableCell className="text-center text-xs font-bold bg-primary/10">
                            {grandSum.lessons} درس · {grandSum.questions} سؤال
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  );
                })()}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Filters — Subject-based */}
        <div className="flex gap-2 flex-wrap">
          <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex-1 min-w-[140px]">
            <option value="">جميع المواد</option>
            {subjects.map((s) => {
              const subjectLessons = scopedLessons.filter((l) =>
                l.subject_id === s.id &&
                (!filterGradeLevel || l.grade_level === Number(filterGradeLevel))
              );
              const questionCount = questions.filter((q) => subjectLessons.some((l) => l.id === q.lesson_id)).length;
              return <option key={s.id} value={s.id}>{s.name_ar} ({subjectLessons.length} درس، {questionCount} سؤال)</option>;
            })}
          </select>

          <select value={filterGradeLevel} onChange={(e) => setFilterGradeLevel(e.target.value)} className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex-1 min-w-[120px]">
            <option value="">جميع الصفوف</option>
            {GRADE_LEVELS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>

          <select value={filterPublished} onChange={(e) => setFilterPublished(e.target.value)} className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex-1 min-w-[120px]">
            <option value="">الكل</option>
            <option value="published">منشور</option>
            <option value="draft">مسودة</option>
          </select>
        </div>

        {/* Selected subject quick-summary (always visible when subject chosen) */}
        {filterSubject && (() => {
          const subj = subjects.find(s => s.id === filterSubject);
          const subjLessons = scopedLessons.filter(l =>
            l.subject_id === filterSubject &&
            (!filterGradeLevel || l.grade_level === Number(filterGradeLevel))
          );
          const subjQuestions = questions.filter(q => subjLessons.some(l => l.id === q.lesson_id)).length;
          const gradeLabel = filterGradeLevel
            ? (GRADE_LEVELS.find(g => g.value === Number(filterGradeLevel))?.label || "")
            : "جميع الصفوف";
          return (
            <div className="text-sm bg-primary/5 border border-primary/20 rounded-md px-3 py-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-muted-foreground">المادة المختارة:</span>
              <span className="font-semibold text-foreground">{subj?.name_ar || "—"}</span>
              <span className="text-muted-foreground">—</span>
              <span className="font-semibold text-foreground">{gradeLabel}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-bold text-primary">{subjLessons.length} درس · {subjQuestions} سؤال</span>
            </div>
          );
        })()}

        {/* Search results summary */}
        {(filterSubject || filterGradeLevel || filterPublished) && (
          <Card className="bg-muted/40 border-dashed">
            <CardContent className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">نتائج البحث:</span>
                <Badge variant="secondary">
                  {filterSubject ? (subjects.find(s => s.id === filterSubject)?.name_ar || "—") : "جميع المواد"}
                </Badge>
                <Badge variant="secondary">
                  {filterGradeLevel ? (GRADE_LEVELS.find(g => g.value === Number(filterGradeLevel))?.label || "—") : "جميع الصفوف"}
                </Badge>
                {filterPublished && (
                  <Badge variant="secondary">{filterPublished === "published" ? "منشور" : "مسودة"}</Badge>
                )}
              </div>
              <div className="font-semibold text-foreground">
                {filteredLessons.length} درس · {questions.filter((q) => filteredLessons.some((l) => l.id === q.lesson_id)).length} سؤال
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lessons + Questions split view */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Lessons list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1"><FileText className="w-4 h-4" />الدروس</h2>
              {isAdmin && filteredLessons.length > 0 && (
                <div className="flex items-center gap-1">
                  {bulkSelectMode && selectedLessonIds.length > 0 && (
                    <Button variant="destructive" size="sm" className="text-xs h-7" onClick={handleBulkDeleteLessons}>
                      <Trash2 className="w-3.5 h-3.5 ml-1" />حذف {selectedLessonIds.length}
                    </Button>
                  )}
                  {bulkSelectMode && (
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => {
                      setSelectedLessonIds(selectedLessonIds.length === filteredLessons.length ? [] : filteredLessons.map(l => l.id));
                    }}>
                      {selectedLessonIds.length === filteredLessons.length ? "إلغاء الكل" : "تحديد الكل"}
                    </Button>
                  )}
                  <Button variant={bulkSelectMode ? "secondary" : "ghost"} size="sm" className="text-xs h-7" onClick={() => { setBulkSelectMode(!bulkSelectMode); setSelectedLessonIds([]); }}>
                    <CheckSquare className="w-3.5 h-3.5 ml-1" />{bulkSelectMode ? "إلغاء" : "تحديد"}
                  </Button>
                </div>
              )}
            </div>
            {filteredLessons.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">لا توجد دروس بعد</p>}
            {filteredLessons.map((l) => (
              <Card
                key={l.id}
                className={`cursor-pointer transition-shadow ${selectedLesson === l.id ? "ring-2 ring-primary" : ""} ${!l.is_published ? "opacity-60" : ""} ${bulkSelectMode && selectedLessonIds.includes(l.id) ? "ring-2 ring-destructive bg-destructive/5" : ""}`}
                onClick={() => {
                  if (bulkSelectMode) { toggleLessonSelection(l.id); return; }
                  setSelectedLesson(selectedLesson === l.id ? null : l.id); setQuestionSubjectFilter("all"); setQuestionSearchQuery("");
                }}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      {bulkSelectMode && (
                        <Checkbox
                          checked={selectedLessonIds.includes(l.id)}
                          onCheckedChange={() => toggleLessonSelection(l.id)}
                          className="mt-0.5"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <div>
                        <p className="font-semibold text-sm">{l.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getSubjectName(l.subject_id)}
                          {l.lesson_code && <span className="text-muted-foreground/60"> • {l.lesson_code}</span>}
                        </p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          <Badge variant={l.is_published ? "default" : "secondary"} className="text-[10px]">
                            {l.is_published ? "منشور" : "مسودة"}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {questions.filter((q) => q.lesson_id === l.id).length} سؤال
                          </Badge>
                          {l.presentation_url && (
                            <Badge variant="outline" className="text-[10px] border-blue-500 text-blue-600 gap-0.5">
                              <Presentation className="w-2.5 h-2.5" /> عرض
                            </Badge>
                          )}
                          {l.grade_level && (
                            <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600 gap-0.5">
                              {getGradeLevelLabel(l.grade_level)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {!bulkSelectMode && (
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => openEditLesson(l)}><Pencil className="w-4 h-4" /></Button>
                        {isAdmin && <Button variant="ghost" size="icon" onClick={() => handleDeleteLesson(l.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                      </div>
                    )}
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

      {/* Lesson Dialog — Subject-based, no college selection */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editingLesson ? "تعديل درس" : "إضافة درس"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>المادة الدراسية *</Label>
              <select value={lessonSubjectId} onChange={(e) => setLessonSubjectId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">اختر المادة</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
              </select>
              <p className="text-[11px] text-muted-foreground">الدرس مشترك — يظهر لجميع الكليات التي يشمل مسارها هذه المادة</p>
            </div>
            <div className="space-y-2">
              <Label>الصف الدراسي</Label>
              <select value={lessonGradeLevel ?? ""} onChange={(e) => setLessonGradeLevel(e.target.value ? Number(e.target.value) : null)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">بدون تصنيف</option>
                {GRADE_LEVELS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
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

            {/* Presentation Upload */}
            <div className="space-y-2 border rounded-lg p-3">
              <Label className="flex items-center gap-2"><Presentation className="w-4 h-4" />العرض التقديمي (PPTX)</Label>
              {lessonPresentationUrl && !lessonPresentationFile && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded p-2">
                  <Presentation className="w-3 h-3 shrink-0" />
                  <span className="truncate flex-1">ملف عرض مرفق</span>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => setLessonPresentationUrl("")}>
                    <Trash2 className="w-3 h-3 ml-1" />إزالة
                  </Button>
                </div>
              )}
              <Input
                ref={presentationFileRef}
                type="file"
                accept=".pptx,.ppt"
                onChange={(e) => setLessonPresentationFile(e.target.files?.[0] || null)}
              />
              <p className="text-[11px] text-muted-foreground">سيتم عرض الملف داخل صفحة الدرس مع إمكانية تحميله</p>
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

                  {showAddQuestionForm && (
                    <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <Label className="text-xs">المادة</Label>
                          <select value={inlineSubject} onChange={(e) => setInlineSubject(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                            {SUBJECT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">نوع السؤال</Label>
                          <select value={inlineQuestionType} onChange={(e) => { setInlineQuestionType(e.target.value); if (e.target.value === "true_false") { setInlineOptionA("صح"); setInlineOptionB("خطأ"); setInlineOptionC(""); setInlineOptionD(""); setInlineCorrectOption("a"); } }} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                            <option value="multiple_choice">اختيار من متعدد</option>
                            <option value="true_false">صح / خطأ</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">نص السؤال *</Label>
                        <Textarea value={inlineQuestionText} onChange={(e) => setInlineQuestionText(e.target.value)} rows={2} />
                      </div>
                      {inlineQuestionType === "true_false" ? (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">الإجابة الصحيحة *</Label>
                            <select value={inlineCorrectOption} onChange={(e) => setInlineCorrectOption(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                              <option value="a">صح</option>
                              <option value="b">خطأ</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">الشرح</Label>
                            <Input value={inlineExplanation} onChange={(e) => setInlineExplanation(e.target.value)} className="h-9 text-sm" />
                          </div>
                        </div>
                      ) : (
                        <>
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
                        </>
                      )}
                      <Button type="button" size="sm" onClick={addPendingQuestion} className="w-full">إضافة السؤال</Button>
                    </div>
                  )}

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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>المادة</Label>
                <select value={questionSubject} onChange={(e) => setQuestionSubject(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {SUBJECT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>نوع السؤال</Label>
                <select value={questionType} onChange={(e) => { setQuestionType(e.target.value); if (e.target.value === "true_false") { setOptionA("صح"); setOptionB("خطأ"); setOptionC(""); setOptionD(""); setCorrectOption("a"); } }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="multiple_choice">اختيار من متعدد</option>
                  <option value="true_false">صح / خطأ</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>نص السؤال *</Label>
              <Textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} rows={2} />
            </div>
            {questionType === "true_false" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>الإجابة الصحيحة *</Label>
                  <select value={correctOption} onChange={(e) => setCorrectOption(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="a">صح</option>
                    <option value="b">خطأ</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>الشرح</Label>
                  <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} />
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}
            <div className="space-y-2">
              <Label>الشرح</Label>
              <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} />
            </div>
            <Button onClick={handleSaveQuestion} disabled={saving} className="w-full">{saving ? "جاري الحفظ..." : "حفظ"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unified Import Dialog — Subject-Based */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              استيراد المحتوى التعليمي
            </DialogTitle>
            <DialogDescription>
              ارفع ملف Excel يحتوي على ورقة <strong>"الدروس"</strong> و/أو ورقة <strong>"الأسئلة"</strong>. الدروس مشتركة وتظهر تلقائياً لجميع الكليات حسب المسار.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Step 1: Download template — prominent */}
            <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 bg-primary/5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 inline-flex items-center justify-center text-xs">1</span>
                    حمّل القالب الجاهز أولاً
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">يحتوي على الترويسات الصحيحة وأمثلة جاهزة</p>
                </div>
                <Button onClick={handleDownloadUnifiedTemplate} size="sm" variant="default">
                  <Download className="w-4 h-4 ml-1" />تحميل القالب
                </Button>
              </div>
            </div>

            {/* Step 2: Default subject */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <span className="bg-muted text-muted-foreground rounded-full w-5 h-5 inline-flex items-center justify-center text-xs">2</span>
                المادة الدراسية الافتراضية (اختياري)
              </Label>
              <select
                value={importSubjectId}
                onChange={(e) => setImportSubjectId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">تحديد من عمود "المادة" داخل الملف</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
              </select>
              <p className="text-[11px] text-muted-foreground">تُستخدم فقط للصفوف التي لم تُحدد مادتها داخل الملف</p>
            </div>

            {/* Step 3: Default grade level */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <span className="bg-muted text-muted-foreground rounded-full w-5 h-5 inline-flex items-center justify-center text-xs">3</span>
                الصف الدراسي الافتراضي (اختياري)
              </Label>
              <select
                value={importGradeLevel}
                onChange={(e) => setImportGradeLevel(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">تحديد من عمود "الصف الدراسي" داخل الملف</option>
                <option value="1">أول ثانوي</option>
                <option value="2">ثاني ثانوي</option>
                <option value="3">ثالث ثانوي</option>
              </select>
              <p className="text-[11px] text-muted-foreground">يُطبَّق فقط على الصفوف التي لم يُحدَّد لها صف داخل الملف</p>
            </div>

            {/* Step 4: Upload */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <span className="bg-muted text-muted-foreground rounded-full w-5 h-5 inline-flex items-center justify-center text-xs">4</span>
                ارفع ملف Excel واحد أو عدة ملفات (.xlsx, .xls, .csv)
              </Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                multiple
                onChange={handleUnifiedImportFile}
                disabled={importing}
              />
              <p className="text-[11px] text-muted-foreground">يمكنك تحديد عدة ملفات معاً (Ctrl/Shift + Click) وستتم معالجتها بالتسلسل</p>
            </div>

            {importing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded p-3">
                <Loader2 className="w-4 h-4 animate-spin" />جاري معالجة الملف وإدراج البيانات...
              </div>
            )}

            {importReport && (
              <div className="bg-muted rounded-lg p-3 space-y-2 border">
                <p className="text-xs font-semibold">📊 تقرير الاستيراد ({importReport.mode === "combined" ? "دروس + أسئلة" : importReport.mode === "lessons_only" ? "دروس فقط" : "أسئلة فقط"}):</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span className="bg-background rounded px-2 py-1">✅ دروس جديدة: <strong>{importReport.lessonsCreated}</strong></span>
                  <span className="bg-background rounded px-2 py-1">🔄 دروس مُحدَّثة: <strong>{importReport.lessonsUpdated ?? 0}</strong></span>
                  <span className="bg-background rounded px-2 py-1">⏭️ دروس متكررة: <strong>{importReport.lessonsSkipped}</strong></span>
                  <span className="bg-background rounded px-2 py-1">✅ أسئلة جديدة: <strong>{importReport.questionsCreated}</strong></span>
                  <span className="bg-background rounded px-2 py-1">⏭️ أسئلة متكررة: <strong>{importReport.questionsSkipped}</strong></span>
                  <span className="bg-background rounded px-2 py-1">❌ أسئلة فاشلة: <strong>{importReport.questionsFailed ?? 0}</strong></span>
                </div>
                {(importReport.warnings?.length ?? 0) > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium text-yellow-600">⚠️ تحذيرات ({importReport.warnings.length}):</p>
                    <div className="max-h-24 overflow-y-auto space-y-1">
                      {importReport.warnings.slice(0, 10).map((w, i) => (
                        <p key={i} className="text-[11px] text-yellow-700 bg-yellow-50 dark:bg-yellow-950/20 dark:text-yellow-400 rounded px-2 py-1">
                          {w.sheet} - صف {w.row}: {w.message}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {importReport.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium text-destructive">❌ أخطاء ({importReport.errors.length}):</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {importReport.errors.slice(0, 20).map((err, i) => (
                        <p key={i} className="text-[11px] text-destructive bg-destructive/10 rounded px-2 py-1">
                          <strong>{err.sheet}</strong> - صف {err.row}: {err.message}
                        </p>
                      ))}
                      {importReport.errors.length > 20 && (
                        <p className="text-[11px] text-muted-foreground">... و {importReport.errors.length - 20} خطأ آخر</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Help section */}
            <details className="bg-muted/50 rounded-lg p-3 text-xs">
              <summary className="cursor-pointer font-semibold">📋 تفاصيل تنسيق الملف</summary>
              <div className="space-y-2 mt-2 text-muted-foreground">
                <p><strong>ورقة "الدروس":</strong> كود الدرس | المادة | العنوان | المحتوى | الملخص | الترتيب | منشور | مجاني | الصف</p>
                <p><strong>ورقة "الأسئلة":</strong> كود الدرس | نوع السؤال | نص السؤال | خيار أ | خيار ب | خيار ج | خيار د | الإجابة | الشرح | الترتيب</p>
                <p className="text-[11px]">💡 الدروس مشتركة — كل درس يُنشأ مرة واحدة ويظهر لجميع الكليات حسب المسار والمادة</p>
                <p className="text-[11px]">💡 الإجابة الصحيحة: a/b/c/d أو true/false أو صح/خطأ</p>
                <p className="text-[11px]">💡 إذا فشل التحقق من الترويسات — تأكد أن أول 3 أعمدة تحتوي كلمات: <strong>كود</strong>، <strong>مادة</strong>، <strong>عنوان</strong> (للدروس) أو <strong>كود</strong>، <strong>نوع</strong>، <strong>نص</strong> (للأسئلة)</p>
              </div>
            </details>
          </div>
        </DialogContent>
      </Dialog>
      </PermissionGate>
    </AdminLayout>
  );
};

export default AdminContent;