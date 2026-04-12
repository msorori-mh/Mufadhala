import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { useQuery } from "@tanstack/react-query";
import {
  saveExamQuestions, getExamQuestions, savePendingExamResult,
  getPendingExamResults, type OfflineQuestion,
} from "@/lib/offlineStorage";
import {
  GraduationCap, ChevronLeft, Clock, AlertTriangle, CheckCircle2,
  XCircle, Loader2, Play, Trophy, RotateCcw, Download, WifiOff, CloudUpload,
  Share2, Copy, MessageCircle,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";

const fetchExamData = async (userId: string) => {
  const { data: s } = await supabase.from("students").select("id, major_id, college_id, user_id").eq("user_id", userId).maybeSingle();
  if (!s?.major_id) return { student: s, majorName: "", allQuestions: [] as Question[], pastAttempts: [] as ExamAttempt[], offlineInfo: { has: false, count: 0 } };

  const [{ data: major }, { data: lessons }, { data: attempts }] = await Promise.all([
    supabase.from("majors").select("name_ar").eq("id", s.major_id).maybeSingle(),
    supabase.from("lessons").select("id, subject_id").eq("major_id", s.major_id).eq("is_published", true),
    supabase.from("exam_attempts").select("id, score, total, started_at, completed_at, answers, major_id").eq("student_id", s.id).order("created_at", { ascending: false }),
  ]);

  const lessonIds = (lessons || []).map((l: any) => l.id);
  const { data: qs } = lessonIds.length > 0
    ? await supabase.from("questions").select("id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, lesson_id, subject")
        .in("lesson_id", lessonIds).order("display_order")
    : { data: [] };

  // Build subject map: prioritize college_subjects, fallback to major_subjects
  const lessonSubjectMap = new Map<string, string>();
  (lessons || []).forEach((l: any) => { if (l.subject_id) lessonSubjectMap.set(l.id, l.subject_id); });

  // Fetch subject names for display
  let subjectNameMap = new Map<string, string>();
  if (s.college_id) {
    const { data: cs } = await supabase.from("college_subjects").select("subject_id, subjects(id, name_ar)").eq("college_id", s.college_id);
    if (cs && cs.length > 0) {
      cs.forEach((c: any) => { if (c.subjects) subjectNameMap.set(c.subjects.id, c.subjects.name_ar); });
    }
  }
  if (subjectNameMap.size === 0 && s.major_id) {
    const { data: ms } = await supabase.from("major_subjects").select("subject_id, subjects(id, name_ar)").eq("major_id", s.major_id);
    if (ms && ms.length > 0) {
      ms.forEach((m: any) => { if (m.subjects) subjectNameMap.set(m.subjects.id, m.subjects.name_ar); });
    }
  }

  let allQuestions: Question[] = [];
  if (qs && lessons) {
    const lessonIdSet = new Set(lessons.map((l: any) => l.id));
    allQuestions = (qs as any[]).filter((q) => lessonIdSet.has(q.lesson_id)).map(q => ({
      ...q,
      subject: q.subject || lessonSubjectMap.get(q.lesson_id) || undefined,
    }));
  }

  // Check offline questions
  let offlineInfo = { has: false, count: 0 };
  try {
    const cached = await getExamQuestions(s.major_id);
    if (cached && cached.length > 0) offlineInfo = { has: true, count: cached.length };
  } catch {}

  return {
    student: s,
    majorName: major?.name_ar || "",
    allQuestions,
    pastAttempts: (attempts || []) as ExamAttempt[],
    offlineInfo,
  };
};

const MAX_QUESTIONS = 45;
const FULL_TIME = 90 * 60;
const DEFAULT_TRIAL_MINUTES = 5;
const PER_QUESTION_TIME = 2 * 60;
const MAX_ATTEMPTS = 3;

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
  subject?: string;
}

interface ExamAttempt {
  id: string;
  score: number;
  total: number;
  started_at: string;
  completed_at: string | null;
  answers: any;
}

type Phase = "intro" | "exam" | "result";

const ExamSimulator = () => {
  const { user, loading: authLoading, isStaff } = useAuth();
  const navigate = useNavigate();
  const { isActive: hasActiveSubscription, loading: subLoading } = useSubscription(user?.id);
  const isOffline = useOfflineStatus();
  const { toast } = useToast();
  const isTrial = !isStaff && !hasActiveSubscription;

  const [student, setStudent] = useState<any>(null);
  const [majorName, setMajorName] = useState("");
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [pastAttempts, setPastAttempts] = useState<ExamAttempt[]>([]);

  // Offline state
  const [hasOfflineQuestions, setHasOfflineQuestions] = useState(false);
  const [offlineQuestionCount, setOfflineQuestionCount] = useState(0);
  const [downloadingOffline, setDownloadingOffline] = useState(false);
  const [pendingResultsCount, setPendingResultsCount] = useState(0);
  const [isOfflineExam, setIsOfflineExam] = useState(false);

  // Exam state
  const [phase, setPhase] = useState<Phase>("intro");
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [totalTimeLeft, setTotalTimeLeft] = useState(FULL_TIME);
  const [trialExpired, setTrialExpired] = useState(false);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(PER_QUESTION_TIME);
  const [_attemptId, setAttemptId] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);

  // Result state
  const [resultScore, setResultScore] = useState(0);
  const [resultTotal, setResultTotal] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch exam data with React Query
  const { isLoading: dataLoading } = useQuery({
    queryKey: ["exam-data", user?.id],
    queryFn: () => fetchExamData(user!.id),
    enabled: !!user && !isOffline,
    staleTime: 2 * 60 * 1000,
    select: (data) => {
      // Sync to local state for exam phase mutations
      if (data.student) setStudent(data.student);
      setMajorName(data.majorName);
      setAllQuestions(data.allQuestions);
      setPastAttempts(data.pastAttempts);
      setHasOfflineQuestions(data.offlineInfo.has);
      setOfflineQuestionCount(data.offlineInfo.count);
      return data;
    },
  });

  // Fetch free exam trial duration from cache
  const { data: freeExamMinutes } = useQuery({
    queryKey: ["free-exam-minutes"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_cache", { _key: "free_exam_minutes" });
      return data != null ? Number(data) : DEFAULT_TRIAL_MINUTES;
    },
    staleTime: 5 * 60 * 1000,
  });

  const TRIAL_TIME = (freeExamMinutes ?? DEFAULT_TRIAL_MINUTES) * 60;
  const trialMinutesLabel = freeExamMinutes ?? DEFAULT_TRIAL_MINUTES;

  const loading = dataLoading && !isOffline;

  // Check pending results on phase change
  useEffect(() => {
    const checkOffline = async () => {
      try {
        const pending = await getPendingExamResults();
        setPendingResultsCount(pending.length);
      } catch {}
    };
    checkOffline();
  }, [phase]);

  // Handle offline-only mode
  useEffect(() => {
    if (isOffline && !authLoading && user) {
      // Set student from what we know for offline
      supabase.from("students").select("id, major_id, user_id").eq("user_id", user.id).maybeSingle()
        .then(({ data: s }) => { if (s) setStudent(s); });
    }
  }, [isOffline, authLoading, user]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, []);

  const shuffleAndPick = (arr: Question[] | OfflineQuestion[], count: number) => {
    // Group by subject for proportional distribution
    const bySubject = new Map<string, (Question | OfflineQuestion)[]>();
    arr.forEach(q => {
      const subj = (q as any).subject || "general";
      if (!bySubject.has(subj)) bySubject.set(subj, []);
      bySubject.get(subj)!.push(q);
    });

    // If only 1 subject or count >= total, just shuffle
    if (bySubject.size <= 1 || count >= arr.length) {
      const shuffled = [...arr].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    }

    // Proportional distribution
    const subjects = [...bySubject.entries()];
    const total = arr.length;
    const result: (Question | OfflineQuestion)[] = [];
    let remaining = count;

    // Allocate proportionally, ensure at least 1 per subject
    const allocations = subjects.map(([subj, qs]) => ({
      subj,
      qs: [...qs].sort(() => Math.random() - 0.5),
      allocated: Math.max(1, Math.round((qs.length / total) * count)),
    }));

    // Adjust if total allocated exceeds count
    let totalAllocated = allocations.reduce((s, a) => s + a.allocated, 0);
    while (totalAllocated > count) {
      const max = allocations.reduce((a, b) => a.allocated > b.allocated ? a : b);
      max.allocated--;
      totalAllocated--;
    }
    while (totalAllocated < count) {
      const min = allocations.reduce((a, b) => a.allocated < a.qs.length && a.allocated < b.allocated ? a : b);
      if (min.allocated < min.qs.length) { min.allocated++; totalAllocated++; }
      else break;
    }

    allocations.forEach(a => {
      result.push(...a.qs.slice(0, a.allocated));
    });

    return result.sort(() => Math.random() - 0.5);
  };

  const finishExam = useCallback(async (finalAnswers: Record<string, string>, questions: Question[]) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);

    if (isOffline || isOfflineExam) {
      // Calculate score locally
      const clientScore = questions.filter((q) => finalAnswers[q.id] === q.correct_option).length;
      setResultScore(clientScore);
      setResultTotal(questions.length);

      // Save as pending result
      if (student) {
        try {
          await savePendingExamResult({
            id: crypto.randomUUID(),
            studentId: student.id,
            majorId: student.major_id,
            answers: finalAnswers,
            score: clientScore,
            total: questions.length,
            startedAt: new Date(Date.now() - FULL_TIME * 1000).toISOString(),
            completedAt: new Date().toISOString(),
          });
          const pending = await getPendingExamResults();
          setPendingResultsCount(pending.length);
        } catch {}
      }

      setPhase("result");
      return;
    }

    // Online submission
    if (student) {
      const { data, error } = await supabase.functions.invoke("submit-exam", {
        body: { answers: finalAnswers },
      });

      if (error || !data?.success) {
        console.error("Exam submission failed:", error || data?.error);
        const clientScore = questions.filter((q) => finalAnswers[q.id] === q.correct_option).length;
        setResultScore(clientScore);
        setResultTotal(questions.length);
      } else {
        setResultScore(data.score);
        setResultTotal(data.total);
      }
    }

    setPhase("result");

    if (student) {
      const { data } = await supabase.from("exam_attempts").select("*")
        .eq("student_id", student.id).order("created_at", { ascending: false });
      if (data) setPastAttempts(data as ExamAttempt[]);
    }
  }, [student, isOffline, isOfflineExam]);

  const moveToNext = useCallback((currentAnswers: Record<string, string>, questions: Question[], idx: number) => {
    setShowExplanation(false);
    setTimerPaused(false);
    if (idx >= questions.length - 1) {
      finishExam(currentAnswers, questions);
    } else {
      setCurrentIndex(idx + 1);
      setQuestionTimeLeft(PER_QUESTION_TIME);
    }
  }, [finishExam]);

  // Total timer
  useEffect(() => {
    if (phase !== "exam" || timerPaused) return;
    timerRef.current = setInterval(() => {
      setTotalTimeLeft((prev) => {
        if (prev <= 1) {
          if (isTrial) {
            setTrialExpired(true);
          }
          finishExam(answers, examQuestions);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, answers, examQuestions, finishExam, timerPaused]);

  // Per-question timer
  useEffect(() => {
    if (phase !== "exam" || timerPaused) return;
    questionTimerRef.current = setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev <= 1) {
          moveToNext(answers, examQuestions, currentIndex);
          return PER_QUESTION_TIME;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (questionTimerRef.current) clearInterval(questionTimerRef.current); };
  }, [phase, currentIndex, answers, examQuestions, moveToNext, timerPaused]);

  const downloadForOffline = async () => {
    if (!student?.major_id || allQuestions.length === 0) return;
    setDownloadingOffline(true);
    try {
      const offlineQs: OfflineQuestion[] = allQuestions.map((q) => ({
        ...q,
        display_order: 0,
      }));
      await saveExamQuestions(student.major_id, offlineQs);
      setHasOfflineQuestions(true);
      setOfflineQuestionCount(offlineQs.length);
      toast({
        title: "تم التحميل",
        description: `تم حفظ ${offlineQs.length} سؤال للاستخدام بدون إنترنت`,
      });
    } catch {
      toast({
        title: "خطأ",
        description: "فشل حفظ الأسئلة",
        variant: "destructive",
      });
    } finally {
      setDownloadingOffline(false);
    }
  };

  const startExam = async () => {
    if (isOffline) {
      // Start offline exam from cached questions
      if (!student?.major_id) return;
      try {
        const cached = await getExamQuestions(student.major_id);
        if (!cached || cached.length === 0) {
          toast({ title: "لا توجد أسئلة محفوظة", description: "حمّل الأسئلة أولاً عند توفر الاتصال", variant: "destructive" });
          return;
        }
        const picked = shuffleAndPick(cached, MAX_QUESTIONS) as Question[];
        setExamQuestions(picked);
        setIsOfflineExam(true);
      } catch {
        return;
      }
    } else {
      if (!student) return;
      const picked = shuffleAndPick(allQuestions, MAX_QUESTIONS) as Question[];
      setExamQuestions(picked);
      setIsOfflineExam(false);
    }

    setCurrentIndex(0);
    setAnswers({});
    setTotalTimeLeft(isTrial ? TRIAL_TIME : FULL_TIME);
    setTrialExpired(false);
    setQuestionTimeLeft(PER_QUESTION_TIME);
    setAttemptId(null);
    setPhase("exam");
  };

  const selectAnswer = (option: string) => {
    if (showExplanation) return; // prevent double-click during explanation
    const q = examQuestions[currentIndex];
    const newAnswers = { ...answers, [q.id]: option };
    setAnswers(newAnswers);

    const isCorrect = option === q.correct_option;
    if (isCorrect) {
      // Correct: brief positive feedback then move on
      setTimeout(() => {
        setShowExplanation(false);
        moveToNext(newAnswers, examQuestions, currentIndex);
      }, 800);
    } else {
      // Wrong: pause timer, show explanation
      setTimerPaused(true);
      setShowExplanation(true);
    }
  };

  const dismissExplanation = () => {
    setShowExplanation(false);
    setTimerPaused(false);
    const newAnswers = answers;
    moveToNext(newAnswers, examQuestions, currentIndex);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (authLoading || loading || subLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!student?.major_id && !isOffline) {
    return (
      <div className="min-h-screen bg-background">
        <header className="gradient-primary text-white px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2"><GraduationCap className="w-6 h-6" /><span className="font-bold text-lg">محاكاة الاختبار</span></div>
            <div className="flex items-center gap-1"><ThemeToggle /><Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20 hover:text-white"><Link to="/dashboard"><ChevronLeft className="w-4 h-4 ml-1" />الرئيسية</Link></Button></div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-12 text-center">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold">اختر تخصصك أولاً من الملف الشخصي</p>
          <Button asChild className="mt-4"><Link to="/profile">الملف الشخصي</Link></Button>
        </main>
      </div>
    );
  }

  // ---- INTRO PHASE ----
  if (phase === "intro") {
    const canAccessFull = isStaff || hasActiveSubscription;
    const attemptsUsed = pastAttempts.length;
    const canStartOnline = (canAccessFull ? attemptsUsed < MAX_ATTEMPTS : true) && allQuestions.length > 0;
    const canStartOffline = isOffline && hasOfflineQuestions;
    const canStart = isOffline ? canStartOffline : canStartOnline;
    const questionsAvailable = isOffline ? offlineQuestionCount : Math.min(allQuestions.length, MAX_QUESTIONS);

    return (
      <div className="min-h-screen bg-background">
        <header className="gradient-primary text-white px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2"><GraduationCap className="w-6 h-6" /><span className="font-bold text-lg">محاكاة الاختبار</span></div>
            <div className="flex items-center gap-1"><ThemeToggle /><Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20 hover:text-white"><Link to="/dashboard"><ChevronLeft className="w-4 h-4 ml-1" />الرئيسية</Link></Button></div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-6">
          {/* Offline banner */}
          {isOffline && (
            <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
              <CardContent className="py-3 px-4 flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-orange-500 shrink-0" />
                <p className="text-sm text-orange-700 dark:text-orange-400">أنت في وضع أوفلاين — النتيجة ستُرسل تلقائياً عند عودة الاتصال</p>
              </CardContent>
            </Card>
          )}

          {/* Pending sync indicator */}
          {pendingResultsCount > 0 && (
            <Card className="border-blue-300 bg-blue-50 dark:bg-blue-950/20">
              <CardContent className="py-3 px-4 flex items-center gap-2">
                <CloudUpload className="w-4 h-4 text-blue-500 shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  {pendingResultsCount} نتيجة في انتظار المزامنة
                </p>
              </CardContent>
            </Card>
          )}

          <div>
            <h1 className="text-2xl font-bold text-foreground">محاكاة اختبار {majorName || "التخصص"}</h1>
            <p className="text-sm text-muted-foreground mt-1">تدرب بذكاء.. لتضمن القبول.</p>
          </div>

          {/* Trial notice for non-subscribers */}
          {!isOffline && isTrial && allQuestions.length > 0 && (
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
              <CardContent className="py-4 px-4 flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">تجربة مجانية — {trialMinutesLabel} دقائق فقط</p>
                  <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                    يمكنك تجربة محاكي الاختبار لمدة {trialMinutesLabel} دقائق. لفتح الاختبار الكامل (90 دقيقة)، فعّل اشتراكك.
                  </p>
                  <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={() => navigate("/subscription")}>
                    تفعيل الاشتراك
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="py-5 space-y-4">
              <h2 className="font-semibold text-foreground">تعليمات الاختبار</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><Clock className="w-4 h-4 mt-0.5 text-primary shrink-0" /><span><strong>{Math.min(questionsAvailable, MAX_QUESTIONS)} سؤال</strong> في <strong>{isTrial ? `${trialMinutesLabel} دقائق` : "90 دقيقة"}</strong> كحد أقصى</span></li>
                <li className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 text-orange-500 shrink-0" /><span>حد أقصى <strong>دقيقتين</strong> لكل سؤال — ينتقل تلقائياً عند انتهاء الوقت</span></li>
                {!isTrial && (
                  <li className="flex items-start gap-2"><RotateCcw className="w-4 h-4 mt-0.5 text-secondary shrink-0" /><span>مسموح بـ <strong>{MAX_ATTEMPTS} محاولات</strong> فقط {!isOffline && `(استخدمت ${attemptsUsed})`}</span></li>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Download for offline button */}
          {!isOffline && canAccessFull && allQuestions.length > 0 && (
            <Button
              variant="outline"
              className="w-full"
              onClick={downloadForOffline}
              disabled={downloadingOffline}
            >
              {downloadingOffline ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 ml-2" />
              )}
              {hasOfflineQuestions
                ? `تحديث الأسئلة المحفوظة (${offlineQuestionCount} سؤال)`
                : `تحميل ${allQuestions.length} سؤال للأوفلاين`}
            </Button>
          )}

          {/* Offline questions status */}
          {hasOfflineQuestions && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>{offlineQuestionCount} سؤال محفوظ للاستخدام بدون إنترنت</span>
            </div>
          )}

          {!isOffline && allQuestions.length === 0 && (
            <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
              <CardContent className="py-4 text-center text-sm text-muted-foreground">
                لا توجد أسئلة متاحة لتخصصك بعد. يرجى التواصل مع الإدارة.
              </CardContent>
            </Card>
          )}

          {isOffline && !hasOfflineQuestions && (
            <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
              <CardContent className="py-4 text-center text-sm text-muted-foreground">
                لا توجد أسئلة محفوظة. حمّل الأسئلة أولاً عند توفر الاتصال.
              </CardContent>
            </Card>
          )}

          <Button onClick={startExam} disabled={!canStart} className="w-full" size="lg">
            <Play className="w-5 h-5 ml-2" />
            {isOffline
              ? (hasOfflineQuestions ? "ابدأ اختبار أوفلاين" : "لا توجد أسئلة محفوظة")
              : (attemptsUsed >= MAX_ATTEMPTS && canAccessFull ? "استنفذت جميع المحاولات" : isTrial ? `ابدأ التجربة المجانية (${trialMinutesLabel} دقائق)` : "ابدأ الاختبار")}
          </Button>

          {/* Past attempts */}
          {pastAttempts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">المحاولات السابقة</h3>
              {pastAttempts.map((a, i) => (
                <Card key={a.id}>
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">المحاولة {pastAttempts.length - i}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.started_at).toLocaleDateString("ar-SA")}
                      </p>
                    </div>
                    <Badge variant={a.score / a.total >= 0.6 ? "default" : "destructive"} className="text-sm">
                      {a.score}/{a.total}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ---- EXAM PHASE ----
  if (phase === "exam") {
    const q = examQuestions[currentIndex];
    const progress = ((currentIndex) / examQuestions.length) * 100;
    const timeWarning = questionTimeLeft <= 30;
    const totalWarning = totalTimeLeft <= 300;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Offline indicator during exam */}
        {(isOffline || isOfflineExam) && (
          <div className="bg-orange-500 text-white text-center text-xs py-1 flex items-center justify-center gap-1">
            <WifiOff className="w-3 h-3" />
            وضع أوفلاين — النتيجة ستُحفظ محلياً
          </div>
        )}

        {/* Timer bar */}
        <div className="bg-card border-b px-4 py-2">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs">
                  {currentIndex + 1} / {examQuestions.length}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  أُجيب: {Object.keys(answers).length}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1 text-xs font-mono ${timeWarning ? "text-red-500 animate-pulse" : "text-muted-foreground"}`}>
                  <Clock className="w-3 h-3" />
                  {formatTime(questionTimeLeft)}
                </div>
                <div className={`flex items-center gap-1 text-xs font-mono ${totalWarning ? "text-red-500" : "text-foreground"}`}>
                  <Clock className="w-3 h-3" />
                  {formatTime(totalTimeLeft)}
                </div>
              </div>
            </div>
            <Progress value={progress} className="h-1.5" />
            <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 rounded-full ${timeWarning ? "bg-red-500" : "bg-primary/50"}`}
                style={{ width: `${(questionTimeLeft / PER_QUESTION_TIME) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question */}
        <main className="flex-1 max-w-2xl mx-auto px-4 py-6 w-full">
          <Card>
            <CardContent className="py-6 px-5">
              {/* Subject badge */}
              {q.subject && q.subject !== "general" && (
                <Badge variant="outline" className="mb-2 text-xs">
                  {q.subject === "biology" ? "أحياء" : q.subject === "chemistry" ? "كيمياء" : q.subject === "physics" ? "فيزياء" : q.subject === "math" ? "رياضيات" : q.subject === "english" ? "إنجليزي" : q.subject === "iq" ? "ذكاء" : q.subject}
                </Badge>
              )}
              <p className="font-semibold text-foreground text-base mb-5">{currentIndex + 1}. {q.question_text}</p>
              <div className="space-y-3">
                {(["a", "b", "c", "d"] as const).map((opt) => {
                  const text = q[`option_${opt}` as keyof Question] as string;
                  const userAnswer = answers[q.id];
                  const isSelected = userAnswer === opt;
                  const isCorrectOpt = q.correct_option === opt;
                  const answered = !!userAnswer;

                  let optClass = "border-border hover:border-primary/50 hover:bg-muted";
                  if (answered && showExplanation) {
                    if (isCorrectOpt) optClass = "border-green-500 bg-green-50 dark:bg-green-950/30";
                    else if (isSelected) optClass = "border-destructive bg-destructive/10";
                    else optClass = "border-border opacity-50";
                  } else if (answered && isSelected && !showExplanation) {
                    // Correct answer brief highlight
                    optClass = "border-green-500 bg-green-50 dark:bg-green-950/30";
                  } else if (isSelected) {
                    optClass = "border-primary bg-primary/10 shadow-sm";
                  }

                  return (
                    <button
                      key={opt}
                      onClick={() => selectAnswer(opt)}
                      disabled={!!userAnswer}
                      className={`flex items-center gap-2 sm:gap-3 w-full text-right p-3 sm:p-4 rounded-xl border-2 transition-all text-sm ${optClass}`}
                    >
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        answered && showExplanation && isCorrectOpt ? "bg-green-500 text-white" :
                        answered && showExplanation && isSelected ? "bg-destructive text-destructive-foreground" :
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}>
                        {answered && showExplanation && isCorrectOpt ? <CheckCircle2 className="w-4 h-4" /> :
                         answered && showExplanation && isSelected ? <XCircle className="w-4 h-4" /> :
                         opt.toUpperCase()}
                      </span>
                      <span className="flex-1">{text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Instant explanation */}
              {showExplanation && (
                <div className="mt-4 p-4 rounded-lg bg-destructive/5 border border-destructive/20 space-y-2">
                  <p className="text-sm font-semibold text-destructive flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> إجابة خاطئة
                  </p>
                  <p className="text-sm text-foreground">
                    الإجابة الصحيحة: <strong className="text-green-600">{(q as any)[`option_${q.correct_option}`]}</strong>
                  </p>
                  {q.explanation && (
                    <p className="text-sm text-muted-foreground">{q.explanation}</p>
                  )}
                  <Button size="sm" onClick={dismissExplanation} className="mt-2">
                    التالي ←
                  </Button>
                </div>
              )}

              {!showExplanation && (
                <div className="flex items-center justify-between mt-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveToNext(answers, examQuestions, currentIndex)}
                  >
                    تخطي →
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => finishExam(answers, examQuestions)}
                  >
                    إنهاء الاختبار
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // ---- RESULT PHASE ----
  const percentage = resultTotal > 0 ? Math.round((resultScore / resultTotal) * 100) : 0;
  const passed = percentage >= 60;

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-primary text-white px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2"><GraduationCap className="w-6 h-6" /><span className="font-bold text-lg">نتيجة الاختبار</span></div>
            <div className="flex items-center gap-1"><ThemeToggle /><Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20 hover:text-white"><Link to="/dashboard"><ChevronLeft className="w-4 h-4 ml-1" />الرئيسية</Link></Button></div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Offline result notice */}
        {isOfflineExam && (
          <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="py-3 px-4 flex items-center gap-2">
              <CloudUpload className="w-4 h-4 text-orange-500 shrink-0" />
              <p className="text-sm text-orange-700 dark:text-orange-400">
                هذه النتيجة محفوظة محلياً وستُرسل تلقائياً عند عودة الاتصال
              </p>
            </CardContent>
          </Card>
        )}

        {/* Trial expired upgrade prompt */}
        {trialExpired && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="py-5 text-center space-y-3">
              <Clock className="w-10 h-10 text-primary mx-auto" />
              <p className="font-semibold text-foreground">انتهت التجربة المجانية ({trialMinutesLabel} دقائق)</p>
              <p className="text-sm text-muted-foreground">
                فعّل اشتراكك لفتح الاختبار الكامل (90 دقيقة) مع {MAX_ATTEMPTS} محاولات وتحليل أداء مفصّل
              </p>
              <Button onClick={() => navigate("/subscription")}>
                تفعيل الاشتراك الآن
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className={passed ? "border-green-500" : "border-orange-500"}>
          <CardContent className="py-8 text-center">
            {passed ? (
              <Trophy className="w-16 h-16 text-green-500 mx-auto mb-3" />
            ) : (
              <XCircle className="w-16 h-16 text-orange-500 mx-auto mb-3" />
            )}
            <p className="text-4xl font-bold text-foreground">{percentage}%</p>
            <p className="text-lg text-muted-foreground mt-1">{resultScore} / {resultTotal}</p>
            <p className="text-sm mt-3">
              {trialExpired ? "هذه نتيجتك في الدقائق الخمس الأولى. فعّل اشتراكك لتتدرب على الاختبار الكامل!" : passed ? "أداء ممتاز! أنت جاهز للاختبار الحقيقي 🎉" : "تحتاج مزيداً من التدريب. راجع الدروس وحاول مرة أخرى"}
            </p>
          </CardContent>
        </Card>

        {/* Share Result */}
        <Card>
          <CardContent className="py-4">
            <p className="text-sm font-semibold text-muted-foreground mb-3 text-center">شارك نتيجتك</p>
            <div className="flex gap-2 justify-center flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  const text = `حققت ${percentage}% (${resultScore}/${resultTotal}) في اختبار المحاكاة على تطبيق مُفَاضَلَة! 🎓\nhttps://mufadhala.com`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
                }}
              >
                <MessageCircle className="w-4 h-4" />
                واتساب
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  const text = `حققت ${percentage}% في اختبار المحاكاة على #مُفَاضَلَة 🎓✨`;
                  const url = "https://mufadhala.com";
                  window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
                }}
              >
                <Share2 className="w-4 h-4" />
                X
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  const text = `حققت ${percentage}% (${resultScore}/${resultTotal}) في اختبار المحاكاة على تطبيق مُفَاضَلَة! 🎓\nhttps://mufadhala.com`;
                  navigator.clipboard.writeText(text);
                  toast({ title: "تم النسخ", description: "تم نسخ النتيجة إلى الحافظة" });
                }}
              >
                <Copy className="w-4 h-4" />
                نسخ
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Review answers */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">مراجعة الإجابات</h3>
          {examQuestions.map((q, i) => {
            const userAnswer = answers[q.id];
            const isCorrect = userAnswer === q.correct_option;
            return (
              <Card key={q.id} className={`border-r-4 ${isCorrect ? "border-r-green-500" : "border-r-red-500"}`}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-2">
                    {isCorrect ? <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{i + 1}. {q.question_text}</p>
                      {!isCorrect && (
                        <p className="text-xs text-muted-foreground mt-1">
                          إجابتك: <span className="text-red-500">{userAnswer ? (q as any)[`option_${userAnswer}`] : "لم تُجب"}</span>
                          {" • "}الصحيحة: <span className="text-green-600">{(q as any)[`option_${q.correct_option}`]}</span>
                        </p>
                      )}
                      {!isCorrect && q.explanation && <p className="text-xs text-muted-foreground mt-1 bg-muted p-2 rounded">{q.explanation}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Button onClick={() => { setPhase("intro"); setIsOfflineExam(false); }} className="flex-1">
            <RotateCcw className="w-4 h-4 ml-1" />العودة
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <Link to="/lessons">مراجعة الدروس</Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ExamSimulator;
