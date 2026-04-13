import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getContentFilter } from "@/lib/contentFilter";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { useQuery } from "@tanstack/react-query";
import {
  saveExamQuestions, getExamQuestions, savePendingExamResult,
  getPendingExamResults, type OfflineQuestion,
} from "@/lib/offlineStorage";
import { useToast } from "@/hooks/use-toast";

// ── Constants ──────────────────────────────────────────────
export const MAX_QUESTIONS = 45;
export const FULL_TIME = 90 * 60;
export const DEFAULT_TRIAL_MINUTES = 5;
export const PER_QUESTION_TIME = 2 * 60;
export const MAX_ATTEMPTS = 3;

// ── Types ──────────────────────────────────────────────────
export interface Question {
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

export interface ExamAttempt {
  id: string;
  score: number;
  total: number;
  started_at: string;
  completed_at: string | null;
  answers: any;
}

export type Phase = "intro" | "exam" | "result";

// ── Data fetcher ───────────────────────────────────────────
const fetchExamData = async (userId: string) => {
  const { data: s } = await supabase
    .from("students")
    .select("id, major_id, college_id, user_id")
    .eq("user_id", userId)
    .maybeSingle();
  const filter = getContentFilter(s);
  if (!filter)
    return {
      student: s,
      majorName: "",
      allQuestions: [] as Question[],
      pastAttempts: [] as ExamAttempt[],
      offlineInfo: { has: false, count: 0 },
    };

  const [{ data: nameData }, { data: lessons }, { data: attempts }] =
    await Promise.all([
      filter.type === "major"
        ? supabase.from("majors").select("name_ar").eq("id", filter.value).maybeSingle()
        : supabase.from("colleges").select("name_ar").eq("id", filter.value).maybeSingle(),
      supabase
        .from("lessons")
        .select("id, subject_id")
        .eq(filter.field, filter.value)
        .eq("is_published", true),
      supabase
        .from("exam_attempts")
        .select("id, score, total, started_at, completed_at, answers, major_id")
        .eq("student_id", s.id)
        .order("created_at", { ascending: false }),
    ]);

  const lessonIds = (lessons || []).map((l: any) => l.id);
  const { data: qs } =
    lessonIds.length > 0
      ? await supabase
          .from("questions")
          .select(
            "id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, lesson_id, subject"
          )
          .in("lesson_id", lessonIds)
          .order("display_order")
      : { data: [] };

  const lessonSubjectMap = new Map<string, string>();
  (lessons || []).forEach((l: any) => {
    if (l.subject_id) lessonSubjectMap.set(l.id, l.subject_id);
  });

  let subjectNameMap = new Map<string, string>();
  if (s.college_id) {
    const { data: cs } = await supabase
      .from("college_subjects")
      .select("subject_id, subjects(id, name_ar)")
      .eq("college_id", s.college_id);
    if (cs && cs.length > 0) {
      cs.forEach((c: any) => {
        if (c.subjects) subjectNameMap.set(c.subjects.id, c.subjects.name_ar);
      });
    }
  }
  if (subjectNameMap.size === 0 && s.major_id) {
    const { data: ms } = await supabase
      .from("major_subjects")
      .select("subject_id, subjects(id, name_ar)")
      .eq("major_id", s.major_id);
    if (ms && ms.length > 0) {
      ms.forEach((m: any) => {
        if (m.subjects) subjectNameMap.set(m.subjects.id, m.subjects.name_ar);
      });
    }
  }

  let allQuestions: Question[] = [];
  if (qs && lessons) {
    const lessonIdSet = new Set(lessons.map((l: any) => l.id));
    allQuestions = (qs as any[])
      .filter((q) => lessonIdSet.has(q.lesson_id))
      .map((q) => ({
        ...q,
        subject: q.subject || lessonSubjectMap.get(q.lesson_id) || undefined,
      }));
  }

  let offlineInfo = { has: false, count: 0 };
  try {
    const cached = await getExamQuestions(s.major_id);
    if (cached && cached.length > 0) offlineInfo = { has: true, count: cached.length };
  } catch {}

  return {
    student: s,
    majorName: nameData?.name_ar || "",
    allQuestions,
    pastAttempts: (attempts || []) as ExamAttempt[],
    offlineInfo,
  };
};

// ── Helpers ────────────────────────────────────────────────
function shuffleAndPick(arr: (Question | OfflineQuestion)[], count: number) {
  const bySubject = new Map<string, (Question | OfflineQuestion)[]>();
  arr.forEach((q) => {
    const subj = (q as any).subject || "general";
    if (!bySubject.has(subj)) bySubject.set(subj, []);
    bySubject.get(subj)!.push(q);
  });

  if (bySubject.size <= 1 || count >= arr.length) {
    return [...arr].sort(() => Math.random() - 0.5).slice(0, count);
  }

  const subjects = [...bySubject.entries()];
  const total = arr.length;
  const result: (Question | OfflineQuestion)[] = [];

  const allocations = subjects.map(([subj, qs]) => ({
    subj,
    qs: [...qs].sort(() => Math.random() - 0.5),
    allocated: Math.max(1, Math.round((qs.length / total) * count)),
  }));

  let totalAllocated = allocations.reduce((s, a) => s + a.allocated, 0);
  while (totalAllocated > count) {
    const max = allocations.reduce((a, b) => (a.allocated > b.allocated ? a : b));
    max.allocated--;
    totalAllocated--;
  }
  while (totalAllocated < count) {
    const min = allocations.reduce((a, b) =>
      a.allocated < a.qs.length && a.allocated < b.allocated ? a : b
    );
    if (min.allocated < min.qs.length) {
      min.allocated++;
      totalAllocated++;
    } else break;
  }

  allocations.forEach((a) => result.push(...a.qs.slice(0, a.allocated)));
  return result.sort(() => Math.random() - 0.5);
}

export function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ── Hook ───────────────────────────────────────────────────
export function useExamEngine() {
  const { user, loading: authLoading, isStaff } = useAuth();
  const { isActive: hasActiveSubscription, loading: subLoading } = useSubscription(user?.id);
  const isOffline = useOfflineStatus();
  const { toast } = useToast();
  const isTrial = !isStaff && !hasActiveSubscription;

  // Data state
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
  const [showExplanation, setShowExplanation] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);

  // Result state
  const [resultScore, setResultScore] = useState(0);
  const [resultTotal, setResultTotal] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data loading ─────────────────────────────────────────
  const { isLoading: dataLoading } = useQuery({
    queryKey: ["exam-data", user?.id],
    queryFn: () => fetchExamData(user!.id),
    enabled: !!user && !isOffline,
    staleTime: 2 * 60 * 1000,
    select: (data) => {
      if (data.student) setStudent(data.student);
      setMajorName(data.majorName);
      setAllQuestions(data.allQuestions);
      setPastAttempts(data.pastAttempts);
      setHasOfflineQuestions(data.offlineInfo.has);
      setOfflineQuestionCount(data.offlineInfo.count);
      return data;
    },
  });

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
  const loading = (dataLoading && !isOffline) || authLoading || subLoading;

  // ── Side effects ─────────────────────────────────────────
  useEffect(() => {
    getPendingExamResults()
      .then((r) => setPendingResultsCount(r.length))
      .catch(() => {});
  }, [phase]);

  useEffect(() => {
    if (isOffline && !authLoading && user) {
      supabase
        .from("students")
        .select("id, major_id, user_id")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data: s }) => {
          if (s) setStudent(s);
        });
    }
  }, [isOffline, authLoading, user]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, []);

  // ── Actions ──────────────────────────────────────────────
  const finishExam = useCallback(
    async (finalAnswers: Record<string, string>, questions: Question[]) => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);

      if (isOffline || isOfflineExam) {
        const clientScore = questions.filter(
          (q) => finalAnswers[q.id] === q.correct_option
        ).length;
        setResultScore(clientScore);
        setResultTotal(questions.length);

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

      if (student) {
        const { data, error } = await supabase.functions.invoke("submit-exam", {
          body: { answers: finalAnswers },
        });
        if (error || !data?.success) {
          console.error("Exam submission failed:", error || data?.error);
          const clientScore = questions.filter(
            (q) => finalAnswers[q.id] === q.correct_option
          ).length;
          setResultScore(clientScore);
          setResultTotal(questions.length);
        } else {
          setResultScore(data.score);
          setResultTotal(data.total);
        }
      }

      setPhase("result");

      if (student) {
        const { data } = await supabase
          .from("exam_attempts")
          .select("*")
          .eq("student_id", student.id)
          .order("created_at", { ascending: false });
        if (data) setPastAttempts(data as ExamAttempt[]);
      }
    },
    [student, isOffline, isOfflineExam]
  );

  const moveToNext = useCallback(
    (currentAnswers: Record<string, string>, questions: Question[], idx: number) => {
      setShowExplanation(false);
      setTimerPaused(false);
      if (idx >= questions.length - 1) {
        finishExam(currentAnswers, questions);
      } else {
        setCurrentIndex(idx + 1);
        setQuestionTimeLeft(PER_QUESTION_TIME);
      }
    },
    [finishExam]
  );

  // Total timer
  useEffect(() => {
    if (phase !== "exam" || timerPaused) return;
    timerRef.current = setInterval(() => {
      setTotalTimeLeft((prev) => {
        if (prev <= 1) {
          if (isTrial) setTrialExpired(true);
          finishExam(answers, examQuestions);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
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
    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [phase, currentIndex, answers, examQuestions, moveToNext, timerPaused]);

  const downloadForOffline = useCallback(async () => {
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
      toast({ title: "تم التحميل", description: `تم حفظ ${offlineQs.length} سؤال للاستخدام بدون إنترنت` });
    } catch {
      toast({ title: "خطأ", description: "فشل حفظ الأسئلة", variant: "destructive" });
    } finally {
      setDownloadingOffline(false);
    }
  }, [student, allQuestions, toast]);

  const startExam = useCallback(async () => {
    if (isOffline) {
      if (!student?.major_id) return;
      try {
        const cached = await getExamQuestions(student.major_id);
        if (!cached || cached.length === 0) {
          toast({
            title: "لا توجد أسئلة محفوظة",
            description: "حمّل الأسئلة أولاً عند توفر الاتصال",
            variant: "destructive",
          });
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
    setPhase("exam");
  }, [isOffline, student, allQuestions, isTrial, TRIAL_TIME, toast]);

  const selectAnswer = useCallback(
    (option: string) => {
      if (showExplanation) return;
      const q = examQuestions[currentIndex];
      const newAnswers = { ...answers, [q.id]: option };
      setAnswers(newAnswers);

      if (option === q.correct_option) {
        setTimeout(() => {
          setShowExplanation(false);
          moveToNext(newAnswers, examQuestions, currentIndex);
        }, 800);
      } else {
        setTimerPaused(true);
        setShowExplanation(true);
      }
    },
    [showExplanation, examQuestions, currentIndex, answers, moveToNext]
  );

  const dismissExplanation = useCallback(() => {
    setShowExplanation(false);
    setTimerPaused(false);
    moveToNext(answers, examQuestions, currentIndex);
  }, [answers, examQuestions, currentIndex, moveToNext]);

  const resetToIntro = useCallback(() => {
    setPhase("intro");
    setIsOfflineExam(false);
  }, []);

  // ── Derived values ───────────────────────────────────────
  const currentQuestion = phase === "exam" ? examQuestions[currentIndex] : null;
  const progress = examQuestions.length > 0 ? (currentIndex / examQuestions.length) * 100 : 0;
  const answeredCount = Object.keys(answers).length;
  const timeWarning = questionTimeLeft <= 30;
  const totalWarning = totalTimeLeft <= 300;
  const percentage = resultTotal > 0 ? Math.round((resultScore / resultTotal) * 100) : 0;
  const passed = percentage >= 60;
  const attemptsUsed = pastAttempts.length;
  const canAccessFull = isStaff || hasActiveSubscription;
  const canStartOnline =
    (canAccessFull ? attemptsUsed < MAX_ATTEMPTS : true) && allQuestions.length > 0;
  const canStartOffline = isOffline && hasOfflineQuestions;
  const canStart = isOffline ? canStartOffline : canStartOnline;
  const questionsAvailable = isOffline
    ? offlineQuestionCount
    : Math.min(allQuestions.length, MAX_QUESTIONS);
  const hasStudentData = !!(student?.major_id || student?.college_id);

  return {
    // Auth / status
    user,
    isStaff,
    loading,
    isOffline,
    isTrial,
    hasActiveSubscription,

    // Student / data
    student,
    majorName,
    allQuestions,
    pastAttempts,
    hasStudentData,

    // Offline
    hasOfflineQuestions,
    offlineQuestionCount,
    downloadingOffline,
    pendingResultsCount,
    isOfflineExam,

    // Exam phase state
    phase,
    examQuestions,
    currentQuestion,
    currentIndex,
    answers,
    answeredCount,
    totalTimeLeft,
    questionTimeLeft,
    trialExpired,
    showExplanation,
    timerPaused,
    progress,
    timeWarning,
    totalWarning,

    // Result
    resultScore,
    resultTotal,
    percentage,
    passed,

    // Intro derived
    canAccessFull,
    attemptsUsed,
    canStart,
    questionsAvailable,
    trialMinutesLabel,

    // Actions
    startExam,
    selectAnswer,
    dismissExplanation,
    finishExam,
    moveToNext,
    downloadForOffline,
    resetToIntro,

    // Toast (for share actions in UI)
    toast,
  };
}
