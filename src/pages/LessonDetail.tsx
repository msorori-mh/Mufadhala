import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChevronLeft, ChevronRight, BookOpen, FileText, HelpCircle, CheckCircle2, XCircle, Loader2, Check, Star, Download, Trash2, WifiOff, Eye, EyeOff, Presentation, Brain } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import LessonReviews from "@/components/LessonReviews";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { saveLesson as saveLessonOffline, getLesson as getOfflineLesson, removeLesson as removeOfflineLesson, type OfflineLesson } from "@/lib/offlineStorage";
import { trackFunnelEvent, hasTrackedEvent } from "@/lib/funnelTracking";
import ChatWidget from "@/components/ChatWidget";
import SummaryPDFDownload from "@/components/SummaryPDFDownload";


interface Lesson {
  id: string;
  title: string;
  content: string;
  summary: string;
  major_id: string;
  presentation_url: string | null;
  grade_level: number | null;
  subject_id: string | null;
}

import { GRADE_LABELS_SHORT as GRADE_LABELS } from "@/domain/constants";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
  display_order: number;
  question_type?: string;
}

/** Extract storage path from a presentation_url (handles both full URLs and plain filenames). */
const getPresentationPath = (url: string): string => {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/lesson-presentations/");
    if (parts.length === 2) return parts[1];
  } catch { /* not a URL — treat as plain filename */ }
  return url;
};

const LessonDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading, isStaff } = useAuth();
  const navigate = useNavigate();
  const isOffline = useOfflineStatus();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [isSavedOffline, setIsSavedOffline] = useState(false);
  const [savingOffline, setSavingOffline] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [signedPresentationUrl, setSignedPresentationUrl] = useState<string | null>(null);
  const [prevLesson, setPrevLesson] = useState<{ id: string; title: string } | null>(null);
  const [nextLesson, setNextLesson] = useState<{ id: string; title: string } | null>(null);

  // Reveal answer state
  const [revealedAnswers, setRevealedAnswers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (authLoading || !id || !user) return;
    const fetchData = async () => {
      // Check if saved offline
      const cached = await getOfflineLesson(id);
      if (cached) setIsSavedOffline(true);

      if (isOffline) {
        // Load from cache
        if (cached) {
          setLesson({ id: cached.id, title: cached.title, content: cached.content, summary: cached.summary, major_id: "", presentation_url: null, grade_level: null, subject_id: null });
          setQuestions(cached.questions as Question[]);
          setIsFromCache(true);
        }
        setLoading(false);
        return;
      }

      // Fetch lesson, questions, student in parallel
      const [{ data: l }, { data: q }, { data: s }] = await Promise.all([
        supabase.from("lessons").select("id, title, content, summary, major_id, presentation_url, grade_level, subject_id").eq("id", id).maybeSingle(),
        supabase.from("questions").select("*").eq("lesson_id", id).order("display_order"),
        supabase.from("students").select("id").eq("user_id", user.id).maybeSingle(),
      ]);

      if (q) setQuestions(q as Question[]);

      if (l) {
        setLesson(l as Lesson);

        const secondaryPromises: Promise<any>[] = [];

        // Siblings for prev/next
        if (l.major_id) {
          secondaryPromises.push(
            Promise.resolve(supabase.from("lessons").select("id, title, display_order").eq("major_id", l.major_id).eq("is_published", true).order("display_order"))
              .then(({ data: siblings }) => {
                if (siblings && siblings.length > 0) {
                  const currentIdx = siblings.findIndex((sb) => sb.id === id);
                  setPrevLesson(currentIdx > 0 ? { id: siblings[currentIdx - 1].id, title: siblings[currentIdx - 1].title } : null);
                  setNextLesson(currentIdx < siblings.length - 1 ? { id: siblings[currentIdx + 1].id, title: siblings[currentIdx + 1].title } : null);
                }
              })
          );
        }

        // Signed URL for presentation
        if (l.presentation_url) {
          const path = getPresentationPath(l.presentation_url);
          secondaryPromises.push(
            supabase.storage.from("lesson-presentations").createSignedUrl(path, 3600)
              .then(({ data: signedData }) => {
                if (signedData?.signedUrl) setSignedPresentationUrl(signedData.signedUrl);
              })
          );
        }

        // Progress check
        if (s) {
          setStudentId(s.id);
          secondaryPromises.push(
            Promise.resolve(supabase.from("lesson_progress").select("is_completed").eq("student_id", s.id).eq("lesson_id", id).maybeSingle())
              .then(({ data: progress }) => {
                if (progress?.is_completed) setIsCompleted(true);
              })
          );
        }

        // Show lesson content immediately, secondary data loads in background
        setLoading(false);
        await Promise.all(secondaryPromises);
      } else {
        if (s) setStudentId(s.id);
        setLoading(false);
      }
    };
    fetchData();
  }, [authLoading, id, user, isOffline]);

  const handleSaveOffline = async () => {
    if (!lesson || !id) return;
    setSavingOffline(true);
    try {
      const offlineData: OfflineLesson = {
        id: lesson.id,
        title: lesson.title,
        content: lesson.content,
        summary: lesson.summary,
        questions: questions,
        savedAt: new Date().toISOString(),
      };
      await saveLessonOffline(offlineData);
      setIsSavedOffline(true);
      toast.success("تم حفظ الدرس للقراءة بدون إنترنت");
    } catch {
      toast.error("فشل حفظ الدرس");
    }
    setSavingOffline(false);
  };

  const handleRemoveOffline = async () => {
    if (!id) return;
    await removeOfflineLesson(id);
    setIsSavedOffline(false);
    toast.success("تم حذف النسخة المحفوظة");
  };

  const toggleRevealAnswer = (questionId: string) => {
    setRevealedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const markComplete = async () => {
    if (!studentId || !id) return;
    const { error } = await supabase.from("lesson_progress").upsert(
      { student_id: studentId, lesson_id: id, is_completed: true, completed_at: new Date().toISOString() },
      { onConflict: "student_id,lesson_id" }
    );
    if (!error) {
      setIsCompleted(true);
      toast.success("تم تحديد الدرس كمكتمل ✓");
      trackFunnelEvent("lesson_completed", { lesson_id: id });
    }
  };

  // Track first lesson opened — show motivational toast
  useEffect(() => {
    if (!lesson || !id || authLoading || loading) return;
    if (!hasTrackedEvent("first_lesson_opened")) {
      trackFunnelEvent("first_lesson_opened", { lesson_id: id });
      toast("أنت الآن بدأت رحلة القبول 🎯", {
        description: "واصل التعلم وستحقق هدفك!",
        duration: 5000,
      });
    }
  }, [lesson, id, authLoading, loading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-3">
        <p className="text-muted-foreground">{isOffline ? "الدرس غير محفوظ للقراءة أوفلاين" : "الدرس غير موجود"}</p>
        {isOffline && (
          <Button variant="outline" size="sm" asChild>
            <Link to="/lessons">العودة للدروس</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-primary text-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 pt-3 pb-4">
          {/* Top bar: back + actions */}
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-white hover:bg-white/15 hover:text-white -mr-2 h-8 px-2 gap-1"
            >
              <Link to="/lessons">
                <ChevronLeft className="w-4 h-4" />
                <span className="text-sm">الدروس</span>
              </Link>
            </Button>

            <div className="flex items-center gap-0.5">
              {!isOffline && (
                isSavedOffline ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveOffline}
                    className="text-white hover:bg-white/15 hover:text-white h-8 px-2 gap-1"
                    aria-label="حذف المحفوظ"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline text-sm">حذف المحفوظ</span>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSaveOffline}
                    disabled={savingOffline}
                    className="text-white hover:bg-white/15 hover:text-white h-8 px-2 gap-1"
                    aria-label="حفظ أوفلاين"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline text-sm">حفظ أوفلاين</span>
                  </Button>
                )
              )}
              <ThemeToggle />
            </div>
          </div>

          {/* Title block */}
          <div className="mt-3 flex items-start gap-3">
            <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 ring-1 ring-white/20">
              <BookOpen className="w-5 h-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-white/70">درس</p>
              <h1 className="mt-0.5 text-xl sm:text-2xl font-bold leading-tight text-white break-words">
                {lesson.title}
              </h1>
              {/* Inline header chips */}
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                {isCompleted && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white ring-1 ring-white/25">
                    <Check className="w-3 h-3" /> مكتمل
                  </span>
                )}
                {lesson.grade_level && GRADE_LABELS[lesson.grade_level] && (
                  <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/90 ring-1 ring-white/15">
                    {GRADE_LABELS[lesson.grade_level]}
                  </span>
                )}
                {isSavedOffline && !isOffline && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/90 ring-1 ring-white/15">
                    <Download className="w-3 h-3" /> محفوظ
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Offline banner */}
      {isFromCache && (
        <div className="bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 text-center text-sm py-2 px-4 flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          أنت تقرأ نسخة محفوظة — بعض الميزات غير متاحة بدون إنترنت
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-6 md:pb-6">
        {/* Completion action (status chips now live in header) */}
        {!isCompleted && !isOffline && (
          <div className="mb-4">
            <Button variant="outline" size="sm" onClick={markComplete} className="gap-1">
              <Check className="w-4 h-4" /> تحديد كمكتمل
            </Button>
          </div>
        )}

        <Tabs defaultValue="content" dir="rtl">
          <TabsList className={`w-full grid h-auto ${isFromCache ? (signedPresentationUrl ? "grid-cols-4" : "grid-cols-3") : (signedPresentationUrl ? "grid-cols-5" : "grid-cols-4")}`}>
            <TabsTrigger value="content" className="flex items-center gap-1 text-[10px] sm:text-xs py-2"><FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />الشرح</TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-1 text-[10px] sm:text-xs py-2"><BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />الملخص</TabsTrigger>
            {signedPresentationUrl && (
              <TabsTrigger value="presentation" className="flex items-center gap-1 text-[10px] sm:text-xs py-2"><Presentation className="w-3 h-3 sm:w-3.5 sm:h-3.5" />العرض</TabsTrigger>
            )}
            <TabsTrigger value="quiz" className="flex items-center gap-1 text-[10px] sm:text-xs py-2"><HelpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />الأسئلة</TabsTrigger>
            {!isFromCache && (
              <TabsTrigger value="reviews" className="flex items-center gap-1 text-[10px] sm:text-xs py-2"><Star className="w-3 h-3 sm:w-3.5 sm:h-3.5" />التقييمات</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="content" className="mt-4">
            <Card className="overflow-hidden border-border/70 shadow-sm">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border/60 bg-muted/40">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary">
                  <FileText className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-none">شرح الدرس</p>
                  <p className="text-[11px] text-muted-foreground mt-1">اقرأ بتمعّن — يمكنك العودة في أي وقت</p>
                </div>
              </div>
              <CardContent className="py-6 px-5 sm:px-6">
                {lesson.content ? (
                  <article className="prose prose-sm sm:prose-base max-w-none text-foreground whitespace-pre-wrap leading-[1.95] tracking-[0.01em] text-[15px] sm:text-[16px] first-letter:text-primary first-letter:font-bold first-letter:text-2xl">
                    {lesson.content}
                  </article>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted text-muted-foreground mb-3">
                      <FileText className="w-6 h-6" />
                    </span>
                    <p className="text-muted-foreground text-sm">لا يوجد محتوى بعد</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="mt-4">
            <Card className="overflow-hidden border-border/70 shadow-sm">
              <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-border/60 bg-muted/40">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-none">ملخص الدرس</p>
                    <p className="text-[11px] text-muted-foreground mt-1">أبرز النقاط لمراجعة سريعة</p>
                  </div>
                </div>
                {lesson.summary && (
                  <SummaryPDFDownload title={lesson.title} text={lesson.summary} />
                )}
              </div>
              <CardContent className="py-6 px-5 sm:px-6">
                {lesson.summary ? (
                  <div className="relative rounded-lg bg-primary/[0.04] border-r-4 border-primary/40 px-4 py-4 sm:px-5 sm:py-5">
                    <article className="prose prose-sm sm:prose-base max-w-none text-foreground whitespace-pre-wrap leading-[1.9] text-[15px] sm:text-[16px]">
                      {lesson.summary}
                    </article>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted text-muted-foreground mb-3">
                      <BookOpen className="w-6 h-6" />
                    </span>
                    <p className="text-muted-foreground text-sm">لا يوجد ملخص بعد</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {signedPresentationUrl && (
            <TabsContent value="presentation" className="mt-4 space-y-4">
              <Card className="overflow-hidden border-border/70 shadow-sm">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-border/60 bg-muted/40">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary">
                    <Presentation className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-none">العرض التقديمي</p>
                    <p className="text-[11px] text-muted-foreground mt-1">اعرض شرائح الدرس بالشاشة الكاملة</p>
                  </div>
                </div>
                <CardContent className="py-4 px-4">
                  <div className="aspect-[16/9] w-full rounded-lg overflow-hidden border bg-muted">
                    <iframe
                      src={`https://docs.google.com/gview?url=${encodeURIComponent(signedPresentationUrl)}&embedded=true`}
                      className="w-full h-full"
                      frameBorder="0"
                      allowFullScreen
                      title="العرض التقديمي"
                    />
                  </div>
                  <div className="mt-3 flex justify-center">
                    <Button variant="outline" size="sm" className="gap-2" asChild>
                      <a href={signedPresentationUrl} download target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4" />
                        تحميل العرض التقديمي
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="quiz" className="mt-4 space-y-3">
            {questions.length === 0 ? (
              <Card className="border-border/70 shadow-sm">
                <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted text-muted-foreground mb-3">
                    <HelpCircle className="w-6 h-6" />
                  </span>
                  <p className="text-muted-foreground text-sm">لا توجد أسئلة لهذا الدرس</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Quiz toolbar */}
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary">
                      <HelpCircle className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-none">اختبر فهمك</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{questions.length} سؤال — فكّر قبل أن تكشف الإجابة</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 h-8"
                    onClick={() => {
                      if (revealedAnswers.size === questions.length) {
                        setRevealedAnswers(new Set());
                      } else {
                        setRevealedAnswers(new Set(questions.map((q) => q.id)));
                      }
                    }}
                  >
                    {revealedAnswers.size === questions.length ? (
                      <><EyeOff className="w-4 h-4" /><span className="hidden sm:inline">إخفاء الكل</span></>
                    ) : (
                      <><Eye className="w-4 h-4" /><span className="hidden sm:inline">إظهار الكل</span></>
                    )}
                  </Button>
                </div>

                {questions.map((q, i) => {
                  const isRevealed = revealedAnswers.has(q.id);
                  const isTrueFalse = q.question_type === "true_false";
                  const options = isTrueFalse ? (["a", "b"] as const) : (["a", "b", "c", "d"] as const);

                  return (
                    <Card
                      key={q.id}
                      className={`overflow-hidden border shadow-sm transition-colors ${
                        isRevealed ? "border-primary/30 bg-primary/[0.02]" : "border-border/70"
                      }`}
                    >
                      <CardContent className="p-4 sm:p-5">
                        {/* Question header */}
                        <div className="flex items-start gap-3 mb-3">
                          <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            {isTrueFalse && (
                              <Badge variant="outline" className="text-[10px] mb-1.5 border-primary/30 text-primary">
                                صح / خطأ
                              </Badge>
                            )}
                            <p className="font-semibold text-[14px] sm:text-[15px] leading-relaxed text-foreground">
                              {q.question_text}
                            </p>
                          </div>
                        </div>

                        {/* Options */}
                        <div className={`grid gap-2 ${isTrueFalse ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
                          {options.map((opt) => {
                            const optionText = isTrueFalse
                              ? (opt === "a" ? "صح" : "خطأ")
                              : ((q[`option_${opt}` as keyof Question] as string) || "");
                            const isCorrectOption = q.correct_option === opt;
                            const highlight = isRevealed && isCorrectOption;

                            return (
                              <div
                                key={opt}
                                className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-[13px] transition-colors ${
                                  highlight
                                    ? "border-green-500/60 bg-green-50 dark:bg-green-950/30 text-foreground"
                                    : "border-border bg-card text-foreground/90"
                                }`}
                              >
                                {!isTrueFalse && (
                                  <span
                                    className={`w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0 ${
                                      highlight
                                        ? "border-green-500 bg-green-500 text-white"
                                        : "border-border text-muted-foreground"
                                    }`}
                                  >
                                    {opt.toUpperCase()}
                                  </span>
                                )}
                                <span className="flex-1 leading-snug">{optionText}</span>
                                {highlight && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />}
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation */}
                        {isRevealed && q.explanation && (
                          <div className="mt-3 rounded-lg border border-border/60 bg-muted/50 p-3">
                            <p className="text-[11px] font-bold text-primary mb-1 tracking-wide">الشرح</p>
                            <p className="text-[13px] text-foreground leading-relaxed">{q.explanation}</p>
                          </div>
                        )}

                        {/* Reveal action */}
                        <Button
                          variant={isRevealed ? "outline" : "default"}
                          size="sm"
                          className="mt-3 w-full sm:w-auto gap-1.5"
                          onClick={() => toggleRevealAnswer(q.id)}
                        >
                          {isRevealed ? (
                            <><EyeOff className="w-4 h-4" /> إخفاء الإجابة</>
                          ) : (
                            <><Eye className="w-4 h-4" /> أظهر الإجابة</>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </>
            )}
          </TabsContent>

          {!isFromCache && (
            <TabsContent value="reviews" className="mt-4">
              <LessonReviews lessonId={id!} studentId={studentId} />
            </TabsContent>
          )}
        </Tabs>

        {/* Prev/Next lesson navigation */}
        {(prevLesson || nextLesson) && (
          <div className="mt-6 flex items-stretch gap-3">
            {prevLesson ? (
              <Button variant="outline" className="flex-1 h-auto py-3 px-4 justify-start text-right gap-2" asChild>
                <Link to={`/lessons/${prevLesson.id}`}>
                  <ChevronRight className="w-5 h-5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">الدرس السابق</p>
                    <p className="text-sm font-medium truncate">{prevLesson.title}</p>
                  </div>
                </Link>
              </Button>
            ) : <div className="flex-1" />}
            {nextLesson ? (
              <Button variant="outline" className="flex-1 h-auto py-3 px-4 justify-end text-left gap-2" asChild>
                <Link to={`/lessons/${nextLesson.id}`}>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">الدرس التالي</p>
                    <p className="text-sm font-medium truncate">{nextLesson.title}</p>
                  </div>
                  <ChevronLeft className="w-5 h-5 shrink-0" />
                </Link>
              </Button>
            ) : <div className="flex-1" />}
          </div>
        )}
        {/* Floating AI Tutor for lesson context */}
        {!isFromCache && lesson && (
          <ChatWidget
            lessonContext={{ title: lesson.title, summary: lesson.summary }}
          />
        )}
      </main>
    </div>
  );
};

export default LessonDetail;
