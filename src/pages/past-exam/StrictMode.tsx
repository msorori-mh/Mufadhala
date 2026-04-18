import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Timer, ArrowRight, ArrowLeft, CheckCircle2, XCircle, MinusCircle, RotateCcw, Trophy, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { OPTION_LABELS, type PastExamQuestion, type PastExamModelInfo } from "./types";
import { useAuth } from "@/hooks/useAuth";
import { useStudentData } from "@/hooks/useStudentData";
import { savePastExamAttempt } from "@/lib/pastExamAttempts";
import { isNativePlatform } from "@/lib/capacitor";
import { App as CapacitorApp } from "@capacitor/app";

type Phase = "intro" | "active" | "finished";

interface Props {
  model: PastExamModelInfo;
  questions: PastExamQuestion[];
  onBackToSelect: () => void;
  customDurationMinutes?: number | null;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const StrictMode = ({ model, questions, onBackToSelect, customDurationMinutes }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: student } = useStudentData(user?.id);
  const total = questions.length;
  // Priority: admin-set duration > student-custom duration > 1-min-per-question fallback > min 5 min
  const rawDurationMinutes = (model.duration_minutes && model.duration_minutes > 0)
    ? model.duration_minutes
    : (customDurationMinutes && customDurationMinutes > 0)
      ? customDurationMinutes
      : Math.max(5, total); // 1 minute per question, min 5 min
  const effectiveDurationMinutes = Math.max(1, rawDurationMinutes);
  const durationSec = effectiveDurationMinutes * 60;

  const [phase, setPhase] = useState<Phase>("intro");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(durationSec);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [endedAt, setEndedAt] = useState<number | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const warned5Ref = useRef(false);
  const warned1Ref = useRef(false);
  const savedRef = useRef(false);

  // Countdown
  useEffect(() => {
    if (phase !== "active") return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Auto submit at 0
  useEffect(() => {
    if (phase === "active" && timeLeft === 0) {
      toast.error("انتهى الوقت! تم تسليم الاختبار تلقائياً.");
      finishExam();
    }
    if (phase === "active" && timeLeft === 300 && !warned5Ref.current) {
      warned5Ref.current = true;
      toast.warning("تبقى 5 دقائق");
    }
    if (phase === "active" && timeLeft === 60 && !warned1Ref.current) {
      warned1Ref.current = true;
      toast.warning("تبقت دقيقة واحدة");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  // beforeunload guard
  useEffect(() => {
    if (phase !== "active") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  // Android hardware back button — block exit during active exam
  useEffect(() => {
    if (phase !== "active" || !isNativePlatform()) return;
    let listenerHandle: { remove: () => void } | null = null;
    (async () => {
      const handle = await CapacitorApp.addListener("backButton", () => {
        // Open exit confirmation instead of navigating away
        setConfirmExit(true);
      });
      listenerHandle = handle;
    })();
    return () => {
      listenerHandle?.remove();
    };
  }, [phase]);

  // Browser back button (popstate) — same protection for web/PWA
  useEffect(() => {
    if (phase !== "active") return;
    // Push a sentinel state so back press triggers popstate without leaving
    window.history.pushState({ strictExam: true }, "");
    const onPop = () => {
      setConfirmExit(true);
      // Re-push to keep the user on this page until they confirm
      window.history.pushState({ strictExam: true }, "");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [phase]);

  const startExam = () => {
    setPhase("active");
    setStartedAt(Date.now());
    setTimeLeft(durationSec);
    warned5Ref.current = false;
    warned1Ref.current = false;
  };

  const finishExam = () => {
    setEndedAt(Date.now());
    setPhase("finished");
  };

  const stats = useMemo(() => {
    let correct = 0, wrong = 0, blank = 0;
    questions.forEach((q, idx) => {
      const a = answers[idx];
      if (!a) blank++;
      else if (a === q.q_correct) correct++;
      else wrong++;
    });
    return { correct, wrong, blank, pct: total ? Math.round((correct / total) * 100) : 0 };
  }, [answers, questions, total]);

  // Persist attempt once when finished
  useEffect(() => {
    if (phase !== "finished" || savedRef.current || !student?.id) return;
    savedRef.current = true;
    const elapsed = startedAt && endedAt ? Math.round((endedAt - startedAt) / 1000) : 0;
    savePastExamAttempt({
      studentId: student.id,
      modelId: model.id,
      mode: "strict",
      score: stats.correct,
      total,
      blankCount: stats.blank,
      elapsedSeconds: elapsed,
      answers,
    });
  }, [phase, student?.id, model.id, stats.correct, stats.blank, total, startedAt, endedAt, answers]);

  // ===== INTRO =====
  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <header className="sticky top-0 z-30 bg-card border-b border-border">
          <div className="px-4 py-3 max-w-3xl mx-auto flex items-center gap-3">
            <Button variant="ghost" size="icon" className="shrink-0 -mr-2" onClick={onBackToSelect}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <p className="text-sm font-bold truncate flex-1">{model.title}</p>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <Timer className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-xl font-bold">الامتحان الصارم</h1>
            <p className="text-sm text-muted-foreground">استعد جيداً قبل البدء</p>
          </div>

          <Card className="border-2 border-destructive/30 bg-destructive/5">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm leading-relaxed">
                  <p className="font-bold text-foreground">قبل أن تبدأ، اعلم أن:</p>
                  <ul className="space-y-1.5 text-foreground/80">
                    <li>⏱️ مدة الاختبار <span className="font-bold text-destructive">{effectiveDurationMinutes} دقيقة</span></li>
                    <li>📝 عدد الأسئلة <span className="font-bold">{total} سؤال</span></li>
                    <li>🔒 لن تظهر الإجابات الصحيحة إلا بعد التسليم</li>
                    <li>⚠️ عند انتهاء الوقت، يتم التسليم تلقائياً</li>
                    <li>🚫 مغادرة الصفحة قد تفقدك تقدمك</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2.5">
            <Button size="lg" variant="destructive" className="w-full text-base h-14 rounded-2xl font-bold" onClick={startExam}>
              ابدأ الامتحان الآن
            </Button>
            <Button variant="outline" size="lg" className="w-full" onClick={onBackToSelect}>
              رجوع
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // ===== FINISHED =====
  if (phase === "finished") {
    const isGood = stats.pct >= 70;
    const elapsedSec = startedAt && endedAt ? Math.round((endedAt - startedAt) / 1000) : 0;
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <header className="sticky top-0 z-30 bg-card border-b border-border">
          <div className="px-4 py-3 max-w-3xl mx-auto flex items-center gap-3">
            <p className="text-sm font-bold truncate flex-1">نتيجة الامتحان</p>
            <Button variant="ghost" size="sm" onClick={() => navigate("/past-exams")}>
              إنهاء
            </Button>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-5 space-y-5 pb-10">
          {/* Score header */}
          <div className="text-center space-y-3">
            <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ${isGood ? "bg-secondary/15" : "bg-primary/10"}`}>
              <Trophy className={`w-12 h-12 ${isGood ? "text-secondary" : "text-primary"}`} />
            </div>
            <div className={`text-5xl font-bold ${isGood ? "text-secondary" : "text-primary"}`}>{stats.pct}%</div>
            <p className="text-sm text-muted-foreground">{model.title}</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="border-2 border-secondary/30">
              <CardContent className="p-3 text-center">
                <CheckCircle2 className="w-5 h-5 text-secondary mx-auto mb-1" />
                <div className="text-lg font-bold text-secondary">{stats.correct}</div>
                <div className="text-[11px] text-muted-foreground">صحيح</div>
              </CardContent>
            </Card>
            <Card className="border-2 border-destructive/30">
              <CardContent className="p-3 text-center">
                <XCircle className="w-5 h-5 text-destructive mx-auto mb-1" />
                <div className="text-lg font-bold text-destructive">{stats.wrong}</div>
                <div className="text-[11px] text-muted-foreground">خاطئ</div>
              </CardContent>
            </Card>
            <Card className="border-2 border-border">
              <CardContent className="p-3 text-center">
                <MinusCircle className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                <div className="text-lg font-bold">{stats.blank}</div>
                <div className="text-[11px] text-muted-foreground">فارغ</div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            الوقت المستغرق: <span className="font-bold text-foreground">{formatTime(elapsedSec)}</span>
          </div>

          {/* Review section */}
          <div className="space-y-3 pt-2">
            <h2 className="text-base font-bold flex items-center gap-2">
              📋 المراجعة الشاملة
            </h2>
            {questions.map((q, idx) => {
              const userAns = answers[idx];
              const isCorrect = userAns === q.q_correct;
              const wasBlank = !userAns;
              const options = [
                { key: "a", text: q.q_option_a },
                { key: "b", text: q.q_option_b },
                { key: "c", text: q.q_option_c },
                { key: "d", text: q.q_option_d },
              ].filter((o) => o.text);

              return (
                <Card key={q.id} className={`border-2 ${wasBlank ? "border-border" : isCorrect ? "border-secondary/40" : "border-destructive/40"}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <p className="text-sm font-bold leading-[1.8] flex-1">{q.q_text}</p>
                      {wasBlank ? (
                        <MinusCircle className="w-5 h-5 text-muted-foreground shrink-0" />
                      ) : isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive shrink-0" />
                      )}
                    </div>

                    <div className="space-y-1.5 pr-9">
                      {options.map((opt) => {
                        const isOptCorrect = opt.key === q.q_correct;
                        const isOptUser = opt.key === userAns;
                        let cls = "border-border bg-card";
                        if (isOptCorrect) cls = "border-secondary bg-secondary/10";
                        else if (isOptUser && !isOptCorrect) cls = "border-destructive bg-destructive/10";
                        return (
                          <div key={opt.key} className={`rounded-lg border p-2.5 flex items-center gap-2 text-sm ${cls}`}>
                            <span className="w-6 h-6 rounded-md bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold shrink-0">
                              {OPTION_LABELS[opt.key]}
                            </span>
                            <span className="flex-1 leading-relaxed">{opt.text}</span>
                            {isOptCorrect && <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />}
                            {isOptUser && !isOptCorrect && <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                          </div>
                        );
                      })}
                    </div>

                    {q.q_explanation && (
                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mr-9">
                        <p className="text-xs font-bold text-primary mb-1">💡 الشرح</p>
                        <p className="text-xs leading-[1.8] text-foreground">{q.q_explanation}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex flex-col gap-2.5 pt-4">
            <Button size="lg" className="w-full text-base gap-2" onClick={onBackToSelect}>
              <RotateCcw className="w-4 h-4" />
              محاولة جديدة
            </Button>
            <Button variant="outline" size="lg" className="w-full" onClick={() => navigate("/past-exams")}>
              رجوع للنماذج
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // ===== ACTIVE =====
  const question = questions[currentIndex];
  const progressPct = ((currentIndex + 1) / total) * 100;
  const isLowTime = timeLeft <= 120;
  const answeredCount = Object.keys(answers).length;
  const timePct = durationSec > 0 ? Math.max(0, Math.min(100, (timeLeft / durationSec) * 100)) : 0;
  const timePctRounded = Math.round(timePct);
  const timeBarColorClass =
    timePct < 10
      ? "[&>div]:bg-destructive motion-safe:animate-pulse"
      : timePct < 20
        ? "[&>div]:bg-destructive"
        : timePct < 50
          ? "[&>div]:bg-secondary"
          : "[&>div]:bg-primary";
  const options = [
    { key: "a", text: question?.q_option_a },
    { key: "b", text: question?.q_option_b },
    { key: "c", text: question?.q_option_c },
    { key: "d", text: question?.q_option_d },
  ].filter((o) => o.text);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-30 bg-card border-b border-border">
        <div className="px-4 py-3 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm tabular-nums ${
                isLowTime ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-muted text-foreground"
              }`}
            >
              <Timer className="w-4 h-4" />
              {formatTime(timeLeft)}
            </div>
            <div className="flex-1 min-w-0 text-center">
              <p className="text-xs text-muted-foreground">السؤال {currentIndex + 1} من {total}</p>
              <p className="text-[11px] text-muted-foreground">أجبت على {answeredCount}</p>
            </div>
            <Button size="sm" variant="destructive" onClick={() => setConfirmSubmit(true)}>
              تسليم
            </Button>
          </div>
        </div>
        <Progress value={progressPct} className="h-1.5 rounded-none" />
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* Question grid navigation */}
        <div className="grid grid-cols-10 gap-1.5">
          {questions.map((_, idx) => {
            const isAnswered = !!answers[idx];
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`aspect-square rounded-md text-[11px] font-bold transition-colors ${
                  isCurrent ? "bg-primary text-primary-foreground ring-2 ring-primary/40"
                  : isAnswered ? "bg-secondary/20 text-secondary border border-secondary/40"
                  : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Question */}
        <Card className="border-2">
          <CardContent className="p-5">
            <p className="text-base font-bold leading-[1.9] text-foreground">{question.q_text}</p>
          </CardContent>
        </Card>

        {/* Options (no reveal) */}
        <div className="space-y-3">
          {options.map((opt) => {
            const isSelected = answers[currentIndex] === opt.key;
            const containerClass = isSelected
              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
              : "border-border bg-card hover:border-primary/40 active:scale-[0.98]";
            const labelBg = isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground";

            return (
              <button
                key={opt.key}
                onClick={() => setAnswers((prev) => ({ ...prev, [currentIndex]: opt.key }))}
                className={`w-full text-right rounded-2xl border-2 transition-all duration-150 flex items-center gap-3 p-4 min-h-[60px] ${containerClass}`}
              >
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${labelBg}`}>
                  {OPTION_LABELS[opt.key] || opt.key.toUpperCase()}
                </span>
                <span className="flex-1 text-[15px] leading-relaxed font-medium">{opt.text}</span>
              </button>
            );
          })}
        </div>

        {/* Nav buttons */}
        <div className="flex gap-3 pt-1 pb-6">
          <Button
            variant="outline"
            size="lg"
            className="flex-1 h-14 rounded-2xl font-bold gap-2"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          >
            <ArrowRight className="w-5 h-5" />
            السابق
          </Button>
          {currentIndex + 1 < total ? (
            <Button
              size="lg"
              className="flex-1 h-14 rounded-2xl font-bold gap-2"
              onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
            >
              التالي
              <ArrowLeft className="w-5 h-5" />
            </Button>
          ) : (
            <Button size="lg" variant="destructive" className="flex-1 h-14 rounded-2xl font-bold" onClick={() => setConfirmSubmit(true)}>
              تسليم الاختبار
            </Button>
          )}
        </div>
      </main>

      <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تسليم الاختبار؟</AlertDialogTitle>
            <AlertDialogDescription>
              أجبت على <span className="font-bold text-foreground">{answeredCount}</span> من <span className="font-bold text-foreground">{total}</span> سؤال.
              {answeredCount < total && (
                <span className="block mt-2 text-destructive">
                  تبقى {total - answeredCount} سؤال بدون إجابة وستحتسب فارغة.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmSubmit(false); finishExam(); }}>
              تأكيد التسليم
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmExit} onOpenChange={setConfirmExit}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              الخروج من الامتحان؟
            </AlertDialogTitle>
            <AlertDialogDescription>
              أنت في وضع الامتحان الصارم. الخروج الآن سيؤدي إلى{" "}
              <span className="font-bold text-destructive">فقدان كل تقدمك</span>{" "}
              ولن يتم حفظ إجاباتك ({answeredCount} من {total}).
              <span className="block mt-2 text-foreground/80">هل أنت متأكد من الخروج؟</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>متابعة الامتحان</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setConfirmExit(false);
                onBackToSelect();
              }}
            >
              نعم، اخرج
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StrictMode;
