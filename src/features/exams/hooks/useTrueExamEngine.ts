import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveSubjectIds } from "@/lib/contentFilter";
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
export const EXAM_TOTAL_QUESTIONS = 50;
export const EXAM_TRUE_FALSE_COUNT = 20;
export const EXAM_MCQ_COUNT = 30;
export const EXAM_TOTAL_TIME = 50 * 60; // 50 minutes
export const EXAM_PER_QUESTION_TIME = 60; // 1 minute
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
  question_type?: string;
}

export interface ExamAttempt {
  id: string;
  score: number;
  total: number;
  started_at: string;
  completed_at: string | null;
  answers: any;
}

export type ExamStatus = "not_started" | "in_progress" | "submitted" | "expired";
export type Phase = "intro" | "exam" | "result";

// ── Helpers ────────────────────────────────────────────────
export function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickExamQuestions(allQuestions: Question[]): Question[] {
  const trueFalse = allQuestions.filter(q => q.question_type === "true_false");
  const mcq = allQuestions.filter(q => q.question_type !== "true_false");

  const pickedTF = shuffleArray(trueFalse).slice(0, EXAM_TRUE_FALSE_COUNT);
  const pickedMCQ = shuffleArray(mcq).slice(0, EXAM_MCQ_COUNT);

  // If not enough of one type, fill from the other (preserve type for sorting below)
  let combinedTF = [...pickedTF];
  let combinedMCQ = [...pickedMCQ];
  const totalPicked = combinedTF.length + combinedMCQ.length;
  if (totalPicked < EXAM_TOTAL_QUESTIONS) {
    const usedIds = new Set([...combinedTF, ...combinedMCQ].map(q => q.id));
    const remaining = shuffleArray(allQuestions.filter(q => !usedIds.has(q.id)));
    for (const q of remaining) {
      if (combinedTF.length + combinedMCQ.length >= EXAM_TOTAL_QUESTIONS) break;
      if (q.question_type === "true_false") combinedTF.push(q);
      else combinedMCQ.push(q);
    }
  }

  // TF questions first, then MCQ — within each group order is shuffled (random selection)
  return [...combinedTF, ...combinedMCQ].slice(0, EXAM_TOTAL_QUESTIONS);
}

// ── Data fetcher ───────────────────────────────────────────
const fetchExamData = async (userId: string) => {
  const { data: s } = await supabase
    .from("students")
    .select("id, major_id, college_id, user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!s || !s.college_id)
    return { student: s, majorName: "", allQuestions: [] as Question[], pastAttempts: [] as ExamAttempt[], offlineInfo: { has: false, count: 0 } };

  const { subjectIds } = await resolveSubjectIds(supabase, s.college_id);
  if (subjectIds.length === 0)
    return { student: s, majorName: "", allQuestions: [] as Question[], pastAttempts: [] as ExamAttempt[], offlineInfo: { has: false, count: 0 } };

  const [{ data: nameData }, { data: lessonsWithTitles }, { data: attempts }] = await Promise.all([
    supabase.from("colleges").select("name_ar").eq("id", s.college_id).maybeSingle(),
    supabase.from("lessons").select("id, title, subject_id").in("subject_id", subjectIds).eq("is_published", true),
    supabase.from("exam_attempts").select("id, score, total, started_at, completed_at, answers, major_id").eq("student_id", s.id).order("created_at", { ascending: false }),
  ]);

  const seenTitles = new Set<string>();
  const uniqueLessonIds: string[] = [];
  const lessonSubjectMap = new Map<string, string>();
  (lessonsWithTitles || []).forEach((l: any) => {
    const key = `${l.title}::${l.subject_id}`;
    if (!seenTitles.has(key)) { seenTitles.add(key); uniqueLessonIds.push(l.id); }
    if (l.subject_id) lessonSubjectMap.set(l.id, l.subject_id);
  });

  const { data: qs } = uniqueLessonIds.length > 0
    ? await supabase.from("questions")
        .select("id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, lesson_id, subject, question_type")
        .in("lesson_id", uniqueLessonIds).order("display_order")
    : { data: [] };

  let allQuestions: Question[] = [];
  if (qs) {
    const uniqueSet = new Set(uniqueLessonIds);
    allQuestions = (qs as any[]).filter(q => uniqueSet.has(q.lesson_id)).map(q => ({
      ...q,
      subject: q.subject || lessonSubjectMap.get(q.lesson_id) || undefined,
    }));
  }

  let offlineInfo = { has: false, count: 0 };
  try {
    const cached = await getExamQuestions(s.major_id);
    if (cached && cached.length > 0) offlineInfo = { has: true, count: cached.length };
  } catch {}

  return { student: s, majorName: nameData?.name_ar || "", allQuestions, pastAttempts: (attempts || []) as ExamAttempt[], offlineInfo };
};

// ── Hook ───────────────────────────────────────────────────
export function useTrueExamEngine() {
  const { user, loading: authLoading, isStaff } = useAuth();
  const { isActive: hasActiveSubscription, isPaid, loading: subLoading } = useSubscription(user?.id);
  const isOffline = useOfflineStatus();
  const { toast } = useToast();

  // Data
  const [student, setStudent] = useState<any>(null);
  const [majorName, setMajorName] = useState("");
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [pastAttempts, setPastAttempts] = useState<ExamAttempt[]>([]);

  // Offline
  const [hasOfflineQuestions, setHasOfflineQuestions] = useState(false);
  const [offlineQuestionCount, setOfflineQuestionCount] = useState(0);
  const [downloadingOffline, setDownloadingOffline] = useState(false);
  const [pendingResultsCount, setPendingResultsCount] = useState(0);
  const [isOfflineExam, setIsOfflineExam] = useState(false);

  // Exam state
  const [phase, setPhase] = useState<Phase>("intro");
  const [examStatus, setExamStatus] = useState<ExamStatus>("not_started");
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [totalTimeLeft, setTotalTimeLeft] = useState(EXAM_TOTAL_TIME);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(EXAM_PER_QUESTION_TIME);

  // Result
  const [resultScore, setResultScore] = useState(0);
  const [resultTotal, setResultTotal] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSubmittingRef = useRef(false);

  // ── Data loading ─────────────────────────────────────────
  const { data: examData, isLoading: dataLoading } = useQuery({
    queryKey: ["true-exam-data", user?.id],
    queryFn: () => fetchExamData(user!.id),
    enabled: !!user && !isOffline,
    staleTime: 2 * 60 * 1000,
  });

  useEffect(() => {
    if (!examData) return;
    if (examData.student) setStudent(examData.student);
    setMajorName(examData.majorName);
    setAllQuestions(examData.allQuestions);
    setPastAttempts(examData.pastAttempts);
    setHasOfflineQuestions(examData.offlineInfo.has);
    setOfflineQuestionCount(examData.offlineInfo.count);
  }, [examData]);

  useEffect(() => {
    getPendingExamResults().then(r => setPendingResultsCount(r.length)).catch(() => {});
  }, [phase]);

  useEffect(() => {
    if (isOffline && !authLoading && user) {
      supabase.from("students").select("id, major_id, user_id").eq("user_id", user.id).maybeSingle()
        .then(({ data: s }) => { if (s) setStudent(s); });
    }
  }, [isOffline, authLoading, user]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, []);

  const loading = (dataLoading && !isOffline) || authLoading || subLoading;
  const hasStudentData = !!(student?.major_id || student?.college_id);

  // ── Submit exam ──────────────────────────────────────────
  const submitExam = useCallback(async (finalAnswers: Record<string, string>, questions: Question[], status: "submitted" | "expired") => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    if (timerRef.current) clearInterval(timerRef.current);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);

    setExamStatus(status);

    if (isOffline || isOfflineExam) {
      const clientScore = questions.filter(q => finalAnswers[q.id] === q.correct_option).length;
      setResultScore(clientScore);
      setResultTotal(questions.length);
      if (student) {
        try {
          await savePendingExamResult({
            id: crypto.randomUUID(), studentId: student.id, majorId: student.major_id,
            answers: finalAnswers, score: clientScore, total: questions.length,
            startedAt: new Date(Date.now() - EXAM_TOTAL_TIME * 1000).toISOString(), completedAt: new Date().toISOString(),
          });
          const pending = await getPendingExamResults();
          setPendingResultsCount(pending.length);
        } catch {}
      }
      setPhase("result");
      isSubmittingRef.current = false;
      return;
    }

    if (student) {
      const { data, error } = await supabase.functions.invoke("submit-exam", { body: { answers: finalAnswers } });
      if (error || !data?.success) {
        const clientScore = questions.filter(q => finalAnswers[q.id] === q.correct_option).length;
        setResultScore(clientScore);
        setResultTotal(questions.length);
      } else {
        setResultScore(data.score);
        setResultTotal(data.total);
      }
    }

    setPhase("result");

    if (student) {
      const { data } = await supabase.from("exam_attempts")
        .select("id, score, total, started_at, completed_at, answers, major_id")
        .eq("student_id", student.id).order("created_at", { ascending: false });
      if (data) setPastAttempts(data as ExamAttempt[]);
    }
    isSubmittingRef.current = false;
  }, [student, isOffline, isOfflineExam]);

  // ── Move to next question ────────────────────────────────
  const moveToNextQuestion = useCallback((currentAnswers: Record<string, string>, questions: Question[], idx: number) => {
    setSelectedOption(null);
    if (idx >= questions.length - 1) {
      submitExam(currentAnswers, questions, "submitted");
    } else {
      setCurrentIndex(idx + 1);
      setQuestionTimeLeft(EXAM_PER_QUESTION_TIME);
    }
  }, [submitExam]);

  // ── Global timer ─────────────────────────────────────────
  useEffect(() => {
    if (phase !== "exam") return;
    timerRef.current = setInterval(() => {
      setTotalTimeLeft(prev => {
        if (prev <= 1) {
          submitExam(answers, examQuestions, "expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, answers, examQuestions, submitExam]);

  // ── Per-question timer ───────────────────────────────────
  useEffect(() => {
    if (phase !== "exam") return;
    questionTimerRef.current = setInterval(() => {
      setQuestionTimeLeft(prev => {
        if (prev <= 1) {
          // Auto-move: no answer selected = unanswered
          moveToNextQuestion(answers, examQuestions, currentIndex);
          return EXAM_PER_QUESTION_TIME;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (questionTimerRef.current) clearInterval(questionTimerRef.current); };
  }, [phase, currentIndex, answers, examQuestions, moveToNextQuestion]);

  // ── Actions ──────────────────────────────────────────────
  const selectOption = useCallback((option: string) => {
    if (examStatus !== "in_progress") return;
    setSelectedOption(option);
  }, [examStatus]);

  const confirmAnswer = useCallback(() => {
    if (!selectedOption || examStatus !== "in_progress") return;
    const q = examQuestions[currentIndex];
    const newAnswers = { ...answers, [q.id]: selectedOption };
    setAnswers(newAnswers);
    moveToNextQuestion(newAnswers, examQuestions, currentIndex);
  }, [selectedOption, examStatus, examQuestions, currentIndex, answers, moveToNextQuestion]);

  const finishExam = useCallback(() => {
    // Save current selected option if any before finishing
    let finalAnswers = { ...answers };
    if (selectedOption && examQuestions[currentIndex]) {
      finalAnswers[examQuestions[currentIndex].id] = selectedOption;
    }
    setAnswers(finalAnswers);
    submitExam(finalAnswers, examQuestions, "submitted");
  }, [answers, selectedOption, examQuestions, currentIndex, submitExam]);

  const downloadForOffline = useCallback(async () => {
    if (!student?.major_id || allQuestions.length === 0) return;
    setDownloadingOffline(true);
    try {
      const offlineQs: OfflineQuestion[] = allQuestions.map(q => ({ ...q, display_order: 0 }));
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
    let questions: Question[] = [];

    if (isOffline) {
      if (!student?.major_id) return;
      try {
        const cached = await getExamQuestions(student.major_id);
        if (!cached || cached.length === 0) {
          toast({ title: "لا توجد أسئلة محفوظة", description: "حمّل الأسئلة أولاً عند توفر الاتصال", variant: "destructive" });
          return;
        }
        questions = pickExamQuestions(cached as Question[]);
        setIsOfflineExam(true);
      } catch { return; }
    } else {
      if (!student) return;
      questions = pickExamQuestions(allQuestions);
      setIsOfflineExam(false);
    }

    setExamQuestions(questions);
    setCurrentIndex(0);
    setAnswers({});
    setSelectedOption(null);
    setTotalTimeLeft(EXAM_TOTAL_TIME);
    setQuestionTimeLeft(EXAM_PER_QUESTION_TIME);
    setExamStatus("in_progress");
    setPhase("exam");
    isSubmittingRef.current = false;
  }, [isOffline, student, allQuestions, toast]);

  const resetToIntro = useCallback(() => {
    setPhase("intro");
    setExamStatus("not_started");
    setIsOfflineExam(false);
    setSelectedOption(null);
    isSubmittingRef.current = false;
  }, []);

  // ── Derived ──────────────────────────────────────────────
  const currentQuestion = phase === "exam" ? examQuestions[currentIndex] : null;
  const progress = examQuestions.length > 0 ? ((currentIndex + 1) / examQuestions.length) * 100 : 0;
  const answeredCount = Object.keys(answers).length;
  const unansweredCount = examQuestions.length - answeredCount;
  const timeWarning = questionTimeLeft <= 15;
  const totalWarning = totalTimeLeft <= 300;
  const correctCount = examQuestions.filter(q => answers[q.id] === q.correct_option).length;
  const wrongCount = examQuestions.filter(q => answers[q.id] && answers[q.id] !== q.correct_option).length;
  const percentage = resultTotal > 0 ? Math.round((resultScore / resultTotal) * 100) : 0;
  const passed = percentage >= 60;
  const attemptsUsed = pastAttempts.length;
  // Trial users are NOT paid → enforce free limit on them too
  const canAccessFull = isStaff || isPaid;
  const freeAttemptUsed = !isPaid && !isStaff && pastAttempts.filter(a => a.completed_at).length >= 1;
  const canStart = (allQuestions.length > 0 || (isOffline && hasOfflineQuestions)) && !freeAttemptUsed;
  const questionsAvailable = isOffline ? offlineQuestionCount : Math.min(allQuestions.length, EXAM_TOTAL_QUESTIONS);

  return {
    user, isStaff, loading, isOffline, hasActiveSubscription, isPaid,
    student, majorName, allQuestions, pastAttempts, hasStudentData,
    hasOfflineQuestions, offlineQuestionCount, downloadingOffline, pendingResultsCount, isOfflineExam,
    phase, examStatus, examQuestions, currentQuestion, currentIndex,
    selectedOption, answers, answeredCount, unansweredCount,
    totalTimeLeft, questionTimeLeft, timeWarning, totalWarning, progress,
    resultScore, resultTotal, percentage, passed, correctCount, wrongCount,
    canAccessFull, attemptsUsed, canStart, freeAttemptUsed, questionsAvailable,
    startExam, selectOption, confirmAnswer, finishExam, downloadForOffline, resetToIntro, toast,
  };
}
