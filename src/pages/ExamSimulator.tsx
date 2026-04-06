import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import {
  GraduationCap, ChevronLeft, Clock, AlertTriangle, CheckCircle2,
  XCircle, Loader2, Play, Trophy, RotateCcw
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const MAX_QUESTIONS = 45;
const TOTAL_TIME = 90 * 60; // 90 min in seconds
const PER_QUESTION_TIME = 2 * 60; // 2 min in seconds
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

  const [student, setStudent] = useState<any>(null);
  const [majorName, setMajorName] = useState("");
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [pastAttempts, setPastAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  // Exam state
  const [phase, setPhase] = useState<Phase>("intro");
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [totalTimeLeft, setTotalTimeLeft] = useState(TOTAL_TIME);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(PER_QUESTION_TIME);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  // Result state
  const [resultScore, setResultScore] = useState(0);
  const [resultTotal, setResultTotal] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch data
  useEffect(() => {
    if (authLoading || !user) return;
    const fetch = async () => {
      const { data: s } = await supabase.from("students").select("*").eq("user_id", user.id).maybeSingle();
      if (!s?.major_id) { setLoading(false); return; }
      setStudent(s);

      const [{ data: major }, { data: qs }, { data: attempts }] = await Promise.all([
        supabase.from("majors").select("name_ar").eq("id", s.major_id).maybeSingle(),
        supabase.from("questions").select("id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, lesson_id")
          .order("display_order"),
        supabase.from("exam_attempts").select("*").eq("student_id", s.id).order("created_at", { ascending: false }),
      ]);

      if (major) setMajorName(major.name_ar);
      if (attempts) setPastAttempts(attempts as ExamAttempt[]);

      // Filter questions belonging to published lessons of student's major
      if (qs) {
        const { data: lessons } = await supabase.from("lessons")
          .select("id").eq("major_id", s.major_id).eq("is_published", true);
        const lessonIds = new Set((lessons || []).map((l: any) => l.id));
        const filtered = (qs as any[]).filter((q) => lessonIds.has(q.lesson_id));
        setAllQuestions(filtered as Question[]);
      }
      setLoading(false);
    };
    fetch();
  }, [authLoading, user]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, []);

  const shuffleAndPick = (arr: Question[], count: number): Question[] => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

  const finishExam = useCallback(async (finalAnswers: Record<string, string>, questions: Question[]) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);

    const score = questions.filter((q) => finalAnswers[q.id] === q.correct_option).length;
    setResultScore(score);
    setResultTotal(questions.length);

    // Save attempt
    if (attemptId) {
      await supabase.from("exam_attempts").update({
        score,
        total: questions.length,
        answers: finalAnswers,
        completed_at: new Date().toISOString(),
      }).eq("id", attemptId);
    }

    setPhase("result");

    // Refresh attempts
    if (student) {
      const { data } = await supabase.from("exam_attempts").select("*")
        .eq("student_id", student.id).order("created_at", { ascending: false });
      if (data) setPastAttempts(data as ExamAttempt[]);
    }
  }, [attemptId, student]);

  const moveToNext = useCallback((currentAnswers: Record<string, string>, questions: Question[], idx: number) => {
    if (idx >= questions.length - 1) {
      finishExam(currentAnswers, questions);
    } else {
      setCurrentIndex(idx + 1);
      setQuestionTimeLeft(PER_QUESTION_TIME);
    }
  }, [finishExam]);

  // Total timer
  useEffect(() => {
    if (phase !== "exam") return;
    timerRef.current = setInterval(() => {
      setTotalTimeLeft((prev) => {
        if (prev <= 1) {
          finishExam(answers, examQuestions);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, answers, examQuestions, finishExam]);

  // Per-question timer
  useEffect(() => {
    if (phase !== "exam") return;
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
  }, [phase, currentIndex, answers, examQuestions, moveToNext]);

  const startExam = async () => {
    if (!student) return;
    const picked = shuffleAndPick(allQuestions, MAX_QUESTIONS);
    setExamQuestions(picked);
    setCurrentIndex(0);
    setAnswers({});
    setTotalTimeLeft(TOTAL_TIME);
    setQuestionTimeLeft(PER_QUESTION_TIME);

    const { data } = await supabase.from("exam_attempts").insert({
      student_id: student.id,
      major_id: student.major_id,
      total: picked.length,
    }).select("id").single();

    if (data) setAttemptId(data.id);
    setPhase("exam");
  };

  const selectAnswer = (option: string) => {
    const q = examQuestions[currentIndex];
    const newAnswers = { ...answers, [q.id]: option };
    setAnswers(newAnswers);

    // Auto-advance after short delay
    setTimeout(() => {
      moveToNext(newAnswers, examQuestions, currentIndex);
    }, 300);
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

  if (!student?.major_id) {
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
    const canAccess = isStaff || hasActiveSubscription;
    const attemptsUsed = pastAttempts.length;
    const canStart = canAccess && attemptsUsed < MAX_ATTEMPTS && allQuestions.length > 0;
    const questionsAvailable = Math.min(allQuestions.length, MAX_QUESTIONS);

    return (
      <div className="min-h-screen bg-background">
        <header className="gradient-primary text-white px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2"><GraduationCap className="w-6 h-6" /><span className="font-bold text-lg">محاكاة الاختبار</span></div>
            <div className="flex items-center gap-1"><ThemeToggle /><Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20 hover:text-white"><Link to="/dashboard"><ChevronLeft className="w-4 h-4 ml-1" />الرئيسية</Link></Button></div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">محاكاة اختبار {majorName}</h1>
            <p className="text-sm text-muted-foreground mt-1">تدرّب تحت ضغط الوقت كاختبار المفاضلة الحقيقي</p>
          </div>

          <Card>
            <CardContent className="py-5 space-y-4">
              <h2 className="font-semibold text-foreground">تعليمات الاختبار</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><Clock className="w-4 h-4 mt-0.5 text-primary shrink-0" /><span><strong>{questionsAvailable} سؤال</strong> في <strong>90 دقيقة</strong> كحد أقصى</span></li>
                <li className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 text-orange-500 shrink-0" /><span>حد أقصى <strong>دقيقتين</strong> لكل سؤال — ينتقل تلقائياً عند انتهاء الوقت</span></li>
                <li className="flex items-start gap-2"><RotateCcw className="w-4 h-4 mt-0.5 text-secondary shrink-0" /><span>مسموح بـ <strong>{MAX_ATTEMPTS} محاولات</strong> فقط (استخدمت {attemptsUsed})</span></li>
              </ul>
            </CardContent>
          </Card>

          {allQuestions.length === 0 && (
            <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
              <CardContent className="py-4 text-center text-sm text-muted-foreground">
                لا توجد أسئلة متاحة لتخصصك بعد. يرجى التواصل مع الإدارة.
              </CardContent>
            </Card>
          )}

          {!canAccess && (
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900">
              <CardContent className="py-4 text-center">
                <p className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">يجب تفعيل اشتراكك للوصول إلى الاختبارات</p>
                <Button className="mt-2" size="sm" onClick={() => navigate("/subscription")}>تفعيل الاشتراك</Button>
              </CardContent>
            </Card>
          )}

          <Button onClick={startExam} disabled={!canStart} className="w-full" size="lg">
            <Play className="w-5 h-5 ml-2" />
            {!canAccess ? "يجب تفعيل الاشتراك أولاً" : attemptsUsed >= MAX_ATTEMPTS ? "استنفذت جميع المحاولات" : "ابدأ الاختبار"}
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
            {/* Question time progress */}
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
              <p className="font-semibold text-foreground text-base mb-5">{currentIndex + 1}. {q.question_text}</p>
              <div className="space-y-3">
                {(["a", "b", "c", "d"] as const).map((opt) => {
                  const text = q[`option_${opt}` as keyof Question] as string;
                  const isSelected = answers[q.id] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => selectAnswer(opt)}
                      className={`flex items-center gap-2 sm:gap-3 w-full text-right p-3 sm:p-4 rounded-xl border-2 transition-all text-sm ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border hover:border-primary/50 hover:bg-muted"
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}>
                        {opt.toUpperCase()}
                      </span>
                      <span className="flex-1">{text}</span>
                    </button>
                  );
                })}
              </div>

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
              {passed ? "أداء ممتاز! أنت جاهز للاختبار الحقيقي 🎉" : "تحتاج مزيداً من التدريب. راجع الدروس وحاول مرة أخرى"}
            </p>
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
                      {q.explanation && <p className="text-xs text-muted-foreground mt-1 bg-muted p-2 rounded">{q.explanation}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Button onClick={() => setPhase("intro")} className="flex-1">
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
