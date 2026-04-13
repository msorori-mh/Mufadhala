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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useModeratorScope } from "@/hooks/useModeratorScope";
import AdminLayout from "@/components/admin/AdminLayout";
import PermissionGate from "@/components/admin/PermissionGate";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, FileText, HelpCircle, Upload, Download, Sparkles, ChevronDown, ChevronUp, Search, Presentation, Copy, CheckSquare } from "lucide-react";
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
  grade_level: number | null;
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
  const [majorSubjectsMap, setMajorSubjectsMap] = useState<Record<string, string[]>>({});
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterUni, setFilterUni] = useState("");
  const [filterCollegeIds, setFilterCollegeIds] = useState<string[]>([]);
  const [filterSubject, setFilterSubject] = useState("");
  const [filterGradeLevel, setFilterGradeLevel] = useState("");
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);

  // Lesson dialog
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonSummary, setLessonSummary] = useState("");
  
  const [lessonUniId, setLessonUniId] = useState("");
  const [lessonCollegeIds, setLessonCollegeIds] = useState<string[]>([]);
  const [lessonOrder, setLessonOrder] = useState(0);
  const [lessonPublished, setLessonPublished] = useState(false);
  const [lessonFree, setLessonFree] = useState(false);
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

  // Import state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importUniId, setImportUniId] = useState("");
  const [importCollegeIds, setImportCollegeIds] = useState<string[]>([]);
  const [importSubjectId, setImportSubjectId] = useState("");
  const [importMode, setImportMode] = useState<"full" | "questions_only">("full");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import questions for specific lesson (from questions panel)
  const [importQuestionsDialogOpen, setImportQuestionsDialogOpen] = useState(false);
  const [importingQuestions, setImportingQuestions] = useState(false);
  const questionFileInputRef = useRef<HTMLInputElement>(null);

  // Copy lesson state
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyingLesson, setCopyingLesson] = useState<Lesson | null>(null);
  const [copyUniId, setCopyUniId] = useState("");
  const [copyCollegeIds, setCopyCollegeIds] = useState<string[]>([]);
  const [copying, setCopying] = useState(false);

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
  
  const availableFilterSubjects = subjects;

  const filteredLessons = (() => {
    let result = scopedLessons;
    if (filterCollegeIds.length > 0) {
      result = result.filter((l) => l.college_id && filterCollegeIds.includes(l.college_id));
    } else if (filterUni) {
      const uniCollegeIds = scopedColleges.filter((c: any) => c.university_id === filterUni).map((c: any) => c.id);
      result = result.filter((l) => l.college_id && uniCollegeIds.includes(l.college_id));
    }
    if (filterSubject) {
      result = result.filter((l) => l.subject_id === filterSubject);
    }
    if (filterGradeLevel) {
      const gl = Number(filterGradeLevel);
      result = result.filter((l) => l.grade_level === gl);
    }
    return result;
  })();

  const getCollegeName = (id: string | null) => colleges.find((c: any) => c.id === id)?.name_ar || "";

  // --- Lesson CRUD ---
  const openCreateLesson = () => {
    setEditingLesson(null);
    setLessonTitle("");
    setLessonContent("");
    setLessonSummary("");
    
    setLessonUniId(filterUni);
    setLessonCollegeIds(filterCollegeIds.length > 0 ? filterCollegeIds : []);
    setLessonOrder(filteredLessons.length);
    setLessonPublished(false);
    setLessonFree(false);
    setLessonSubjectId("");
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
    
    // Derive uni/college from the lesson
    const lessonCollege = l.college_id ? colleges.find((c: any) => c.id === l.college_id) : null;
    setLessonCollegeIds(l.college_id ? [l.college_id] : []);
    setLessonUniId(lessonCollege?.university_id || "");
    setLessonOrder(l.display_order);
    setLessonPublished(l.is_published);
    setLessonFree(l.is_free);
    setLessonSubjectId(l.subject_id || "");
    setLessonPresentationFile(null);
    setLessonPresentationUrl(l.presentation_url || "");
    setLessonGradeLevel((l as any).grade_level ?? null);
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
          // Editing: save directly to DB
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
    if (!lessonTitle || lessonCollegeIds.length === 0) {
      toast({ variant: "destructive", title: "يرجى ملء العنوان واختيار كلية واحدة على الأقل" });
      return;
    }
    setSaving(true);

    // Upload presentation file if selected
    let presentationUrl = lessonPresentationUrl;
    if (lessonPresentationFile) {
      setUploadingPresentation(true);
      const fileExt = lessonPresentationFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('lesson-presentations')
        .upload(fileName, lessonPresentationFile);
      if (uploadError) {
        toast({ variant: "destructive", title: `خطأ في رفع العرض: ${uploadError.message}` });
        setSaving(false);
        setUploadingPresentation(false);
        return;
      }
      // Store only the file path — signed URLs are generated at display time
      presentationUrl = fileName;
      setUploadingPresentation(false);
    }

    if (editingLesson) {
      // Edit mode: update single lesson
      const payload: any = {
        title: lessonTitle,
        content: lessonContent,
        summary: lessonSummary,
        college_id: lessonCollegeIds[0],
        major_id: null,
        subject_id: lessonSubjectId || null,
        display_order: lessonOrder,
        is_published: lessonPublished,
        is_free: lessonFree,
        presentation_url: presentationUrl || null,
        grade_level: lessonGradeLevel,
      };
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
      // Create mode: duplicate for each selected college
      let totalCreated = 0;
      for (const collegeId of lessonCollegeIds) {
        const payload: any = {
          title: lessonTitle,
          content: lessonContent,
          summary: lessonSummary,
          college_id: collegeId,
          major_id: null,
          subject_id: lessonSubjectId || null,
          display_order: lessonOrder,
          is_published: lessonPublished,
          is_free: lessonFree,
          presentation_url: presentationUrl || null,
          grade_level: lessonGradeLevel,
        };
        const { data: inserted, error } = await supabase.from("lessons").insert(payload).select("id").single();
        if (error) {
          toast({ variant: "destructive", title: error.message });
        } else if (inserted) {
          totalCreated++;
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
        }
      }
      const qMsg = pendingQuestions.length > 0 ? ` مع ${pendingQuestions.length} سؤال` : "";
      toast({ title: `تمت إضافة الدرس في ${totalCreated} كلية${qMsg}` });
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

  // --- Copy Lesson to other colleges ---
  const openCopyLesson = (l: Lesson) => {
    setCopyingLesson(l);
    setCopyUniId("");
    setCopyCollegeIds([]);
    setCopyDialogOpen(true);
  };

  const handleCopyLesson = async () => {
    if (!copyingLesson || copyCollegeIds.length === 0) return;
    setCopying(true);
    const lessonQuestions = questions.filter(q => q.lesson_id === copyingLesson.id);
    let totalCreated = 0;
    for (const collegeId of copyCollegeIds) {
      const { data: inserted, error } = await supabase.from("lessons").insert({
        title: copyingLesson.title,
        content: copyingLesson.content,
        summary: copyingLesson.summary,
        college_id: collegeId,
        major_id: copyingLesson.major_id,
        subject_id: copyingLesson.subject_id,
        display_order: copyingLesson.display_order,
        is_published: copyingLesson.is_published,
        is_free: copyingLesson.is_free,
        presentation_url: copyingLesson.presentation_url,
        grade_level: copyingLesson.grade_level,
      }).select("id").single();
      if (error) {
        toast({ variant: "destructive", title: error.message });
      } else if (inserted) {
        totalCreated++;
        for (let i = 0; i < lessonQuestions.length; i++) {
          const q = lessonQuestions[i];
          await supabase.from("questions").insert({
            lesson_id: inserted.id,
            question_text: q.question_text,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_option: q.correct_option,
            explanation: q.explanation,
            subject: q.subject,
            display_order: q.display_order,
          });
        }
      }
    }
    const qMsg = lessonQuestions.length > 0 ? ` مع ${lessonQuestions.length} سؤال` : "";
    toast({ title: `تم نسخ الدرس إلى ${totalCreated} كلية${qMsg}` });
    setCopying(false);
    setCopyDialogOpen(false);
    fetchData();
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
      // Duplicate protection
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

  const downloadQuestionsOnlyTemplate = () => {
    const wb = XLSX.utils.book_new();
    const data = [
      ["عنوان الدرس", "نص السؤال", "الخيار أ", "الخيار ب", "الخيار ج", "الخيار د", "الإجابة الصحيحة (a/b/c/d)", "الشرح", `المادة (${SUBJECT_LABELS_HINT})`, "نوع السؤال (multiple_choice / true_false)"],
      ["مقدمة في البرمجة", "ما هي لغة البرمجة؟", "أداة تصميم", "لغة حاسوب", "جهاز", "شبكة", "b", "لغة البرمجة هي لغة يفهمها الحاسوب", "عام", "multiple_choice"],
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
        // Duplicate protection
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
    const header = ["عنوان الدرس", "المحتوى", "الملخص", "ترتيب العرض", "منشور (نعم/لا)", "المادة", "رابط العرض التقديمي"];
    const rows = collegeLessons.map(l => [
      l.title,
      l.content,
      l.summary,
      l.display_order,
      l.is_published ? "نعم" : "لا",
      l.subject_id ? (subjects.find(s => s.id === l.subject_id)?.name_ar || "") : "",
      l.presentation_url || "",
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
      ["عنوان الدرس", "المحتوى", "الملخص", "ترتيب العرض", "منشور (نعم/لا)", `المادة (${subjectNames || "اختياري"})`, "رابط العرض التقديمي", "الصف الدراسي (1/2/3)"],
      ["مثال: مقدمة في البرمجة", "محتوى الدرس هنا...", "ملخص قصير", 1, "نعم", subjects[0]?.name_ar || "", "", ""],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lessonsData), "الدروس");
    XLSX.writeFile(wb, "قالب_استيراد_الدروس.xlsx");
  };

  const downloadFullTemplate = () => {
    const wb = XLSX.utils.book_new();
    const subjectNames = subjects.map(s => s.name_ar).join(" / ");
    const lessonsData = [
      ["عنوان الدرس", "المحتوى", "الملخص", "ترتيب العرض", "منشور (نعم/لا)", `المادة (${subjectNames || "اختياري"})`, "رابط العرض التقديمي", "الصف الدراسي (1/2/3)"],
      ["مثال: مقدمة في البرمجة", "محتوى الدرس هنا...", "ملخص قصير", 1, "نعم", subjects[0]?.name_ar || "", "", ""],
    ];
    const questionsData = [
      ["عنوان الدرس", "نص السؤال", "الخيار أ", "الخيار ب", "الخيار ج", "الخيار د", "الإجابة الصحيحة (a/b/c/d)", "الشرح", `المادة (${SUBJECT_LABELS_HINT})`, "نوع السؤال (multiple_choice / true_false)"],
      ["مقدمة في البرمجة", "ما هي لغة البرمجة؟", "أداة تصميم", "لغة حاسوب", "جهاز", "شبكة", "b", "لغة البرمجة هي لغة يفهمها الحاسوب", "عام", "multiple_choice"],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lessonsData), "الدروس");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(questionsData), "الأسئلة");
    XLSX.writeFile(wb, "قالب_استيراد_المحتوى.xlsx");
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || importCollegeIds.length === 0) return;
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

      // Loop through each selected college
      for (const collegeId of importCollegeIds) {
        const lessonMap = new Map<string, string>();
        if (importMode === "questions_only") {
          lessons.filter(l => l.college_id === collegeId).forEach(l => lessonMap.set(l.title, l.id));
        } else if (lessonsSheet.length > 1) {
          for (let i = 1; i < lessonsSheet.length; i++) {
            const row = lessonsSheet[i] as any[];
            if (!row[0]) continue;
            const title = String(row[0]).trim();
            // Duplicate protection: skip if lesson with same title exists in this college
            const existingLesson = lessons.find(l => l.college_id === collegeId && l.title.trim() === title);
            if (existingLesson) {
              lessonMap.set(title, existingLesson.id);
              continue;
            }
            const subjectName = row[5] ? String(row[5]).trim() : "";
            const matchedSubject = subjectName ? subjects.find(s => s.name_ar === subjectName || s.code === subjectName) : null;
            const resolvedSubjectId = importSubjectId || matchedSubject?.id || null;
            const presentationUrl = row[6] ? String(row[6]).trim() : "";
            const gradeLevel = row[7] ? Number(row[7]) : null;
            const { data: inserted, error } = await supabase.from("lessons").insert({
              college_id: collegeId,
              title,
              content: row[1] ? String(row[1]) : "",
              summary: row[2] ? String(row[2]) : "",
              display_order: row[3] ? Number(row[3]) : i,
              is_published: row[4] ? String(row[4]).includes("نعم") || String(row[4]).toLowerCase() === "true" : false,
              subject_id: resolvedSubjectId,
              presentation_url: presentationUrl || null,
              grade_level: gradeLevel,
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
            lessons.filter(l => l.college_id === collegeId).forEach(l => lessonMap.set(l.title, l.id));
          }

          for (let i = 1; i < questionsSheet.length; i++) {
            const row = questionsSheet[i] as any[];
            if (!row[0] || !row[1]) continue;
            const lessonTitle = String(row[0]).trim();
            const lessonId = lessonMap.get(lessonTitle);
            if (!lessonId) {
              continue;
            }
            // Duplicate protection
            const qText = String(row[1]).trim();
            const existingQ = questions.find(q => q.lesson_id === lessonId && q.question_text.trim() === qText);
            if (existingQ) continue;
            const qType = row[9] ? String(row[9]).trim().toLowerCase() === "true_false" ? "true_false" : "multiple_choice" : "multiple_choice";
            const { error } = await supabase.from("questions").insert({
              lesson_id: lessonId,
              question_text: qText,
              option_a: String(row[2] || ""),
              option_b: String(row[3] || ""),
              option_c: String(row[4] || ""),
              option_d: String(row[5] || ""),
              correct_option: String(row[6] || "a").toLowerCase().trim(),
              explanation: row[7] ? String(row[7]) : "",
              subject: row[8] ? getSubjectValue(String(row[8])) : "general",
              question_type: qType,
              display_order: i,
            });
            if (error) {
              toast({ variant: "destructive", title: `خطأ في سؤال ${i}: ${error.message}` });
            }
          }
        }
      }

      toast({ title: `تم الاستيراد بنجاح في ${importCollegeIds.length} كلية` });
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
            <Button onClick={() => { setImportUniId(filterUni); setImportCollegeIds(filterCollegeIds.length > 0 ? filterCollegeIds : []); setImportSubjectId(filterSubject); setImportMode("full"); setImportDialogOpen(true); }} size="sm" variant="outline">
              <Upload className="w-4 h-4 ml-1" />استيراد
            </Button>
            <Button onClick={openCreateLesson} size="sm"><Plus className="w-4 h-4 ml-1" />إضافة درس</Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <select value={filterUni} onChange={(e) => { setFilterUni(e.target.value); setFilterCollegeIds([]); setFilterSubject(""); }} className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex-1 min-w-[140px]">
            <option value="">جميع الجامعات</option>
            {scopedUniversities.map((u: any) => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
          </select>

          {/* Multi-select college filter */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex h-9 items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm flex-1 min-w-[140px]">
                <span className="truncate">
                  {filterCollegeIds.length === 0
                    ? "جميع الكليات"
                    : filterCollegeIds.length === 1
                      ? (colleges.find((c: any) => c.id === filterCollegeIds[0])?.name_ar || "1 كلية")
                      : `${filterCollegeIds.length} كلية محددة`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-50 shrink-0 mr-1" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 max-h-64 overflow-y-auto" align="start">
              {/* Clear filter */}
              <button
                type="button"
                onClick={() => { setFilterCollegeIds([]); setFilterSubject(""); }}
                className="w-full text-sm p-2 text-right border-b hover:bg-muted/50 font-medium text-primary"
              >
                جميع الكليات (مسح الفلتر)
              </button>
              {/* Select All */}
              {(() => {
                const availableFilterColleges = filterUni ? scopedColleges.filter((c: any) => c.university_id === filterUni) : scopedColleges;
                const allSelected = availableFilterColleges.length > 0 && availableFilterColleges.every((c: any) => filterCollegeIds.includes(c.id));
                return (
                  <>
                    <label className="flex items-center gap-2 p-2 border-b bg-muted/30 cursor-pointer hover:bg-muted/50">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFilterCollegeIds(availableFilterColleges.map((c: any) => c.id));
                          } else {
                            setFilterCollegeIds([]);
                          }
                          setFilterSubject("");
                        }}
                      />
                      <span className="text-sm font-medium">تحديد الكل ({availableFilterColleges.length})</span>
                    </label>
                    {availableFilterColleges.map((c: any) => {
                      const uniName = !filterUni ? universities.find((u: any) => u.id === c.university_id)?.name_ar : "";
                      const lessonCount = scopedLessons.filter((l) => l.college_id === c.id).length;
                      return (
                        <label key={c.id} className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/30">
                          <Checkbox
                            checked={filterCollegeIds.includes(c.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFilterCollegeIds(prev => [...prev, c.id]);
                              } else {
                                setFilterCollegeIds(prev => prev.filter(id => id !== c.id));
                              }
                              setFilterSubject("");
                            }}
                          />
                          <span className="text-xs flex-1">{c.name_ar}{uniName ? ` — ${uniName}` : ""}</span>
                          <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{lessonCount}</span>
                        </label>
                      );
                    })}
                  </>
                );
              })()}
            </PopoverContent>
          </Popover>

          <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex-1 min-w-[140px]">
            <option value="">جميع المواد</option>
            {availableFilterSubjects.map((s) => {
              const subjectLessons = scopedLessons.filter((l) => l.subject_id === s.id && (filterCollegeIds.length > 0 ? l.college_id && filterCollegeIds.includes(l.college_id) : filterUni ? scopedColleges.filter((c: any) => c.university_id === filterUni).map((c: any) => c.id).includes(l.college_id || "") : true));
              const questionCount = questions.filter((q) => subjectLessons.some((l) => l.id === q.lesson_id)).length;
              return <option key={s.id} value={s.id}>{s.name_ar} ({subjectLessons.length} درس، {questionCount} سؤال)</option>;
            })}
          </select>

          <select value={filterGradeLevel} onChange={(e) => setFilterGradeLevel(e.target.value)} className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex-1 min-w-[120px]">
            <option value="">جميع الصفوف</option>
            {GRADE_LEVELS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>

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
                        <Button variant="ghost" size="icon" onClick={() => openCopyLesson(l)} title="نسخ إلى كليات أخرى"><Copy className="w-4 h-4" /></Button>
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
              <select value={lessonUniId} onChange={(e) => { setLessonUniId(e.target.value); setLessonCollegeIds([]); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">اختر الجامعة</option>
                {!editingLesson && <option value="all">📌 جميع الجامعات</option>}
                {scopedUniversities.map((u: any) => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
              </select>
            </div>
            {editingLesson ? (
              <div className="space-y-2">
                <Label>الكلية *</Label>
                <select value={lessonCollegeIds[0] || ""} onChange={(e) => setLessonCollegeIds(e.target.value ? [e.target.value] : [])} disabled={!lessonUniId} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50">
                  <option value="">اختر الكلية</option>
                  {scopedColleges.filter((c: any) => lessonUniId === "all" || c.university_id === lessonUniId).map((c: any) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>الكليات * ({lessonCollegeIds.length} محددة)</Label>
                {(() => {
                  const availableLessonColleges = lessonUniId === "all"
                    ? scopedColleges
                    : lessonUniId
                      ? scopedColleges.filter((c: any) => c.university_id === lessonUniId)
                      : [];
                  const allSelected = availableLessonColleges.length > 0 && availableLessonColleges.every((c: any) => lessonCollegeIds.includes(c.id));
                  return (
                    <div className="border rounded-md max-h-48 overflow-y-auto">
                      {availableLessonColleges.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-3 text-center">اختر جامعة أولاً</p>
                      ) : (
                        <>
                          <label className="flex items-center gap-2 p-2 border-b bg-muted/30 cursor-pointer hover:bg-muted/50">
                            <Checkbox
                              checked={allSelected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setLessonCollegeIds(availableLessonColleges.map((c: any) => c.id));
                                } else {
                                  setLessonCollegeIds([]);
                                }
                              }}
                            />
                            <span className="text-sm font-medium">تحديد الكل ({availableLessonColleges.length})</span>
                          </label>
                          {availableLessonColleges.map((c: any) => {
                            const uniName = lessonUniId === "all" ? universities.find((u: any) => u.id === c.university_id)?.name_ar : "";
                            return (
                              <label key={c.id} className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/30">
                                <Checkbox
                                  checked={lessonCollegeIds.includes(c.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setLessonCollegeIds(prev => [...prev, c.id]);
                                    } else {
                                      setLessonCollegeIds(prev => prev.filter(id => id !== c.id));
                                    }
                                  }}
                                />
                                <span className="text-sm">{c.name_ar}{uniName ? ` — ${uniName}` : ""}</span>
                              </label>
                            );
                          })}
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
            <div className="space-y-2">
              <Label>المادة الدراسية</Label>
              <select value={lessonSubjectId} onChange={(e) => setLessonSubjectId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">بدون تصنيف</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
              </select>
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
            <div className="flex items-center gap-2 p-3 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
              <Switch checked={lessonFree} onCheckedChange={setLessonFree} />
              <div>
                <Label className="text-sm">درس مجاني</Label>
                <p className="text-xs text-muted-foreground">يمكن للطلاب الوصول للمحتوى الكامل بدون اشتراك</p>
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
              <Textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} rows={3} />
            </div>
            {questionType === "true_false" ? (
              <div className="space-y-2">
                <Label>الإجابة الصحيحة *</Label>
                <select value={correctOption} onChange={(e) => setCorrectOption(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="a">صح</option>
                  <option value="b">خطأ</option>
                </select>
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
              <select value={importUniId} onChange={(e) => { setImportUniId(e.target.value); setImportCollegeIds([]); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">اختر الجامعة</option>
                <option value="all">📌 جميع الجامعات</option>
                {scopedUniversities.map((u: any) => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
              </select>
            </div>

            {/* Multi-select Colleges */}
            <div className="space-y-2">
              <Label>الكليات * ({importCollegeIds.length} محددة)</Label>
              {(() => {
                const availableImportColleges = importUniId === "all"
                  ? scopedColleges
                  : importUniId
                    ? scopedColleges.filter((c: any) => c.university_id === importUniId)
                    : [];
                const allSelected = availableImportColleges.length > 0 && availableImportColleges.every((c: any) => importCollegeIds.includes(c.id));
                return (
                  <div className="border rounded-md max-h-48 overflow-y-auto">
                    {availableImportColleges.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-3 text-center">اختر جامعة أولاً</p>
                    ) : (
                      <>
                        <label className="flex items-center gap-2 p-2 border-b bg-muted/30 cursor-pointer hover:bg-muted/50">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setImportCollegeIds(availableImportColleges.map((c: any) => c.id));
                              } else {
                                setImportCollegeIds([]);
                              }
                            }}
                          />
                          <span className="text-sm font-medium">تحديد الكل ({availableImportColleges.length})</span>
                        </label>
                        {availableImportColleges.map((c: any) => {
                          const uniName = importUniId === "all" ? universities.find((u: any) => u.id === c.university_id)?.name_ar : "";
                          return (
                            <label key={c.id} className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/30">
                              <Checkbox
                                checked={importCollegeIds.includes(c.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setImportCollegeIds(prev => [...prev, c.id]);
                                  } else {
                                    setImportCollegeIds(prev => prev.filter(id => id !== c.id));
                                  }
                                }}
                              />
                              <span className="text-sm">{c.name_ar}{uniName ? ` — ${uniName}` : ""}</span>
                            </label>
                          );
                        })}
                      </>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="space-y-2">
              <Label>المادة الدراسية (اختياري)</Label>
              <select value={importSubjectId} onChange={(e) => setImportSubjectId(e.target.value)} disabled={importCollegeIds.length === 0} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50">
                <option value="">تحديد من الملف</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
              </select>
              <p className="text-[11px] text-muted-foreground">إذا تم تحديد مادة هنا، ستُطبق على جميع الدروس المستوردة. وإلا سيتم قراءتها من الملف.</p>
            </div>

            {importMode === "questions_only" && importCollegeIds.length > 0 && (
              <div className="text-xs text-muted-foreground bg-accent/50 rounded-md p-2">
                سيتم ربط الأسئلة بالدروس الموجودة في {importCollegeIds.length} كلية عبر تطابق عنوان الدرس
              </div>
            )}

            <div className="space-y-2">
              <Label>اختر ملف (Excel أو CSV)</Label>
              <Input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} disabled={importCollegeIds.length === 0 || importing} />
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

      {/* Copy Lesson Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5" />
              نسخ درس إلى كليات أخرى
            </DialogTitle>
            <DialogDescription>
              {copyingLesson ? `نسخ "${copyingLesson.title}" مع ${questions.filter(q => q.lesson_id === copyingLesson.id).length} سؤال` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الجامعة *</Label>
              <select value={copyUniId} onChange={(e) => { setCopyUniId(e.target.value); setCopyCollegeIds([]); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">اختر الجامعة</option>
                <option value="all">📌 جميع الجامعات</option>
                {scopedUniversities.map((u: any) => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label>الكليات المستهدفة * ({copyCollegeIds.length} محددة)</Label>
              {(() => {
                const availableCopyColleges = (copyUniId === "all"
                  ? scopedColleges
                  : copyUniId
                    ? scopedColleges.filter((c: any) => c.university_id === copyUniId)
                    : []
                ).filter((c: any) => c.id !== copyingLesson?.college_id);
                const allSelected = availableCopyColleges.length > 0 && availableCopyColleges.every((c: any) => copyCollegeIds.includes(c.id));
                return (
                  <div className="border rounded-md max-h-48 overflow-y-auto">
                    {availableCopyColleges.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-3 text-center">اختر جامعة أولاً</p>
                    ) : (
                      <>
                        <label className="flex items-center gap-2 p-2 border-b bg-muted/30 cursor-pointer hover:bg-muted/50">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setCopyCollegeIds(availableCopyColleges.map((c: any) => c.id));
                              } else {
                                setCopyCollegeIds([]);
                              }
                            }}
                          />
                          <span className="text-sm font-medium">تحديد الكل ({availableCopyColleges.length})</span>
                        </label>
                        {availableCopyColleges.map((c: any) => {
                          const uniName = copyUniId === "all" ? universities.find((u: any) => u.id === c.university_id)?.name_ar : "";
                          return (
                            <label key={c.id} className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/30">
                              <Checkbox
                                checked={copyCollegeIds.includes(c.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setCopyCollegeIds(prev => [...prev, c.id]);
                                  } else {
                                    setCopyCollegeIds(prev => prev.filter(id => id !== c.id));
                                  }
                                }}
                              />
                              <span className="text-sm">{c.name_ar}{uniName ? ` — ${uniName}` : ""}</span>
                            </label>
                          );
                        })}
                      </>
                    )}
                  </div>
                );
              })()}
            </div>

            <Button onClick={handleCopyLesson} disabled={copying || copyCollegeIds.length === 0} className="w-full">
              {copying ? <><Loader2 className="w-4 h-4 animate-spin ml-2" />جاري النسخ...</> : `نسخ إلى ${copyCollegeIds.length} كلية`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </PermissionGate>
    </AdminLayout>
  );
};

export default AdminContent;
