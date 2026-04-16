import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Target } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap, ChevronLeft, Clock, AlertTriangle, CheckCircle2,
  XCircle, Loader2, Play, Trophy, RotateCcw, Download, WifiOff, CloudUpload,
  Share2, Copy, MessageCircle, ShieldCheck, SkipForward, Flag,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import PostExamUpgrade from "@/components/PostExamUpgrade";
import AIPerformanceAnalysis from "@/components/AIPerformanceAnalysis";
import {
  useTrueExamEngine,
  formatTime,
  MAX_ATTEMPTS,
  EXAM_TOTAL_QUESTIONS,
  EXAM_PER_QUESTION_TIME,
  type Question,
} from "@/features/exams/hooks/useTrueExamEngine";

const ExamSimulator = () => {
  const navigate = useNavigate();
  const engine = useTrueExamEngine();

  // Repeated-usage banner: track completed sessions, show after 3+
  const [showUsageBanner, setShowUsageBanner] = useState(false);
  const [sessionCountChecked, setSessionCountChecked] = useState(false);

  useEffect(() => {
    if (engine.phase === "result") {
      // Increment completed session count
      const key = "simulator_completed_sessions";
      const count = parseInt(sessionStorage.getItem(key) || "0", 10) + 1;
      sessionStorage.setItem(key, String(count));
    }
  }, [engine.phase]);

  useEffect(() => {
    if (sessionCountChecked) return;
    const count = parseInt(sessionStorage.getItem("simulator_completed_sessions") || "0", 10);
    const dismissed = sessionStorage.getItem("usage_banner_dismissed");
    if (count >= 3 && !engine.hasActiveSubscription && !dismissed) {
      setShowUsageBanner(true);
    }
    setSessionCountChecked(true);
  }, [engine.hasActiveSubscription, sessionCountChecked]);

  // ── Loading ──────────────────────────────────────────────
  if (engine.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── No student data ──────────────────────────────────────
  if (!engine.hasStudentData && !engine.isOffline) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader isStaff={engine.isStaff} title="محاكاة الاختبار" />
        <main className="max-w-4xl mx-auto px-4 py-12 text-center">
          {engine.isStaff ? (
            <>
              <GraduationCap className="w-12 h-12 text-primary mx-auto mb-3" />
              <p className="font-semibold text-lg">محاكاة الاختبار مخصصة للطلاب المسجلين</p>
              <p className="text-muted-foreground mt-2">كمسؤول، يمكنك متابعة أداء الطلاب من تقارير الاختبارات</p>
              <Button asChild className="mt-4"><Link to="/admin/reports/exams">تقارير الاختبارات</Link></Button>
            </>
          ) : (
            <>
              <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold">لا توجد بيانات أكاديمية بعد</p>
              <p className="text-sm text-muted-foreground mt-1">يرجى التأكد من اختيار الكلية عند التسجيل</p>
              <Button asChild className="mt-4"><Link to="/dashboard">العودة للرئيسية</Link></Button>
            </>
          )}
        </main>
      </div>
    );
  }

  // ── INTRO PHASE ──────────────────────────────────────────
  if (engine.phase === "intro") {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="محاكاة الاختبار" backTo="/dashboard" backLabel="الرئيسية" />
        <main className="max-w-2xl mx-auto px-4 py-6 md:pb-6 space-y-6">
          {engine.isOffline && <OfflineBanner />}
          {engine.pendingResultsCount > 0 && <PendingSyncBanner count={engine.pendingResultsCount} />}

          <div>
            <h1 className="text-2xl font-bold text-foreground">اختبر مستواك الآن</h1>
            <p className="text-sm text-muted-foreground mt-1">مجموعة أسئلة تحاكي اختبار القبول الحقيقي — اعرف مستواك قبل يوم المفاضلة</p>
          </div>

          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">وضع الاختبار الحقيقي</h2>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <span><strong>{EXAM_TOTAL_QUESTIONS} سؤال</strong> في <strong>50 دقيقة كحد أقصى</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Flag className="w-4 h-4 mt-0.5 text-orange-500 shrink-0" />
                  <span><strong>20 صح/خطأ</strong> + <strong>30 اختيار متعدد</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-orange-500 shrink-0" />
                  <span>دقيقة واحدة لكل سؤال — ينتقل تلقائياً عند انتهاء الوقت</span>
                </li>
                <li className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
                  <span><strong>لا تصحيح فوري</strong> — النتيجة والتفسير بعد الانتهاء فقط</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-500 shrink-0" />
                  <span>يجب الضغط على <strong>"تأكيد الإجابة"</strong> لتثبيت كل إجابة</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {!engine.isOffline && engine.canAccessFull && engine.allQuestions.length > 0 && (
            <Button variant="outline" className="w-full" onClick={engine.downloadForOffline} disabled={engine.downloadingOffline}>
              {engine.downloadingOffline ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Download className="w-4 h-4 ml-2" />}
              {engine.hasOfflineQuestions
                ? `تحديث الأسئلة المحفوظة (${engine.offlineQuestionCount} سؤال)`
                : `تحميل الأسئلة للأوفلاين`}
            </Button>
          )}

          {engine.hasOfflineQuestions && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>{engine.offlineQuestionCount} سؤال محفوظ للاستخدام بدون إنترنت</span>
            </div>
          )}

          {!engine.isOffline && engine.allQuestions.length === 0 && (
            <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
              <CardContent className="py-4 text-center text-sm text-muted-foreground">
                لا توجد أسئلة متاحة لتخصصك بعد. يرجى التواصل مع الإدارة.
              </CardContent>
            </Card>
          )}

          {engine.isOffline && !engine.hasOfflineQuestions && (
            <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
              <CardContent className="py-4 text-center text-sm text-muted-foreground">
                لا توجد أسئلة محفوظة. حمّل الأسئلة أولاً عند توفر الاتصال.
              </CardContent>
            </Card>
          )}

          <Button onClick={engine.startExam} disabled={!engine.canStart} className="w-full" size="lg">
            <Play className="w-5 h-5 ml-2" />
            ابدأ الاختبار
          </Button>
          <p className="text-xs text-center text-muted-foreground">تدرب الآن واكتشف نقاط قوتك وضعفك</p>

          {engine.pastAttempts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">المحاولات السابقة</h3>
              {engine.pastAttempts.map((a, i) => (
                <Card key={a.id}>
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">المحاولة {engine.pastAttempts.length - i}</p>
                      <p className="text-xs text-muted-foreground">{new Date(a.started_at).toLocaleDateString("ar-SA")}</p>
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

  // ── EXAM PHASE ───────────────────────────────────────────
  if (engine.phase === "exam" && engine.currentQuestion) {
    const q = engine.currentQuestion;
    const isTrueFalse = q.question_type === "true_false";
    const options = isTrueFalse ? (["a", "b"] as const) : (["a", "b", "c", "d"] as const);

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {(engine.isOffline || engine.isOfflineExam) && (
          <div className="bg-orange-500 text-white text-center text-xs py-1 flex items-center justify-center gap-1">
            <WifiOff className="w-3 h-3" />
            وضع أوفلاين — النتيجة ستُحفظ محلياً
          </div>
        )}

        {/* Top bar */}
        <div className="bg-card border-b px-4 py-2 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs font-mono">
                  السؤال {engine.currentIndex + 1} من {engine.examQuestions.length}
                </Badge>
                <span className="text-xs text-muted-foreground">ركّز وخذ وقتك</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1 text-xs font-mono ${engine.timeWarning ? "text-destructive animate-pulse font-bold" : "text-muted-foreground"}`}>
                  <Clock className="w-3 h-3" />{formatTime(engine.questionTimeLeft)}
                </div>
                <div className={`flex items-center gap-1 text-xs font-mono ${engine.totalWarning ? "text-destructive" : "text-foreground"}`}>
                  <Clock className="w-3 h-3" />{formatTime(engine.totalTimeLeft)}
                </div>
              </div>
            </div>
            <Progress value={engine.progress} className="h-1.5" />
            <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 rounded-full ${engine.timeWarning ? "bg-destructive" : "bg-primary/50"}`}
                style={{ width: `${(engine.questionTimeLeft / EXAM_PER_QUESTION_TIME) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question */}
        <main className="flex-1 max-w-2xl mx-auto px-4 py-6 w-full">
          <Card>
            <CardContent className="py-6 px-5">
              {q.subject && q.subject !== "general" && (
                <Badge variant="outline" className="mb-2 text-xs">
                  {q.subject === "biology" ? "أحياء" : q.subject === "chemistry" ? "كيمياء" : q.subject === "physics" ? "فيزياء" : q.subject === "math" ? "رياضيات" : q.subject === "english" ? "إنجليزي" : q.subject === "iq" ? "ذكاء" : q.subject}
                </Badge>
              )}
              {isTrueFalse && (
                <Badge variant="secondary" className="mb-2 text-xs mr-1">صح / خطأ</Badge>
              )}
              <p className="font-semibold text-foreground text-base mb-5">
                {engine.currentIndex + 1}. {q.question_text}
              </p>

              {/* Options — neutral selection only, NO green/red feedback */}
              <div className="space-y-3">
                {options.map((opt) => {
                  const text = q[`option_${opt}` as keyof Question] as string;
                  if (!text) return null;
                  const isSelected = engine.selectedOption === opt;

                  return (
                    <button
                      key={opt}
                      onClick={() => engine.selectOption(opt)}
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

              {/* Action buttons */}
              <div className="flex items-center justify-between mt-6 gap-2">
                <Button
                  onClick={engine.confirmAnswer}
                  disabled={!engine.selectedOption}
                  className="flex-1"
                  size="lg"
                >
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                  تأكيد الإجابة
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={engine.finishExam}
                  className="shrink-0"
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

  // ── RESULT PHASE ─────────────────────────────────────────
  const unansweredFinal = engine.examQuestions.length - Object.keys(engine.answers).length;
  const correctFinal = engine.examQuestions.filter(q => engine.answers[q.id] === q.correct_option).length;
  const wrongFinal = engine.examQuestions.filter(q => engine.answers[q.id] && engine.answers[q.id] !== q.correct_option).length;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="نتيجتك" backTo="/dashboard" backLabel="الرئيسية" />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {engine.isOfflineExam && (
          <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="py-3 px-4 flex items-center gap-2">
              <CloudUpload className="w-4 h-4 text-orange-500 shrink-0" />
              <p className="text-sm text-orange-700 dark:text-orange-400">
                هذه النتيجة محفوظة محلياً وستُرسل تلقائياً عند عودة الاتصال
              </p>
            </CardContent>
          </Card>
        )}

        {engine.examStatus === "expired" && (
          <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="py-4 text-center">
              <Clock className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <p className="font-semibold text-foreground">انتهى الوقت!</p>
              <p className="text-sm text-muted-foreground mt-1">تم تسليم الاختبار تلقائياً لأن الوقت انتهى</p>
            </CardContent>
          </Card>
        )}

        {/* Score Card */}
        <Card className={engine.percentage >= 50 ? "border-green-500" : "border-orange-500"}>
          <CardContent className="py-8 text-center">
            {engine.percentage >= 80 ? <Trophy className="w-16 h-16 text-green-500 mx-auto mb-3" /> : engine.percentage >= 50 ? <CheckCircle2 className="w-16 h-16 text-yellow-500 mx-auto mb-3" /> : <XCircle className="w-16 h-16 text-orange-500 mx-auto mb-3" />}
            <p className="text-4xl font-bold text-foreground">{engine.percentage}%</p>
            <p className="text-lg text-muted-foreground mt-1">{engine.resultScore} / {engine.resultTotal}</p>
            <div className="mt-3 space-y-1">
              {engine.percentage >= 80 ? (
                <>
                  <p className="text-sm font-semibold text-green-600">أداء ممتاز 👏</p>
                  <p className="text-xs text-muted-foreground">أنت قريب جدًا من تحقيق نتيجة قوية في المفاضلة</p>
                </>
              ) : engine.percentage >= 50 ? (
                <>
                  <p className="text-sm font-semibold text-yellow-600">أداء جيد 👍</p>
                  <p className="text-xs text-muted-foreground">تحتاج بعض المراجعة لرفع مستواك أكثر</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-orange-600">تحتاج تدريب أكثر 💡</p>
                  <p className="text-xs text-muted-foreground">ركّز على الدروس وحاول مرة أخرى</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats breakdown */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="py-4 text-center">
              <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-xl font-bold text-green-600">{correctFinal}</p>
              <p className="text-xs text-muted-foreground">صحيحة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <XCircle className="w-5 h-5 text-destructive mx-auto mb-1" />
              <p className="text-xl font-bold text-destructive">{wrongFinal}</p>
              <p className="text-xs text-muted-foreground">خاطئة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <SkipForward className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-xl font-bold text-muted-foreground">{unansweredFinal}</p>
              <p className="text-xs text-muted-foreground">لم تُجب</p>
            </CardContent>
          </Card>
        </div>

        <ShareResult percentage={engine.percentage} score={engine.resultScore} total={engine.resultTotal} toast={engine.toast} />

        <AIPerformanceAnalysis
          questions={engine.examQuestions}
          answers={engine.answers}
          percentage={engine.percentage}
          hasSubscription={engine.hasActiveSubscription}
        />

        <PostExamUpgrade percentage={engine.percentage} totalQuestions={engine.examQuestions.length} hasSubscription={engine.hasActiveSubscription} />

        {/* Full Review Report */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">مراجعة تفصيلية للإجابات</h3>
          {engine.examQuestions.map((q, i) => {
            const userAnswer = engine.answers[q.id];
            const isCorrect = userAnswer === q.correct_option;
            const isUnanswered = !userAnswer;

            return (
              <Card key={q.id} className={`border-r-4 ${isCorrect ? "border-r-green-500" : isUnanswered ? "border-r-muted-foreground" : "border-r-destructive"}`}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-2">
                    {isCorrect ? <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> :
                     isUnanswered ? <SkipForward className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /> :
                     <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{i + 1}. {q.question_text}</p>

                      {isUnanswered && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="text-muted-foreground font-medium">لم تُجب</span>
                          {" • "}الصحيحة: <span className="text-green-600 font-medium">{(q as any)[`option_${q.correct_option}`]}</span>
                        </p>
                      )}

                      {!isCorrect && !isUnanswered && (
                        <p className="text-xs text-muted-foreground mt-1">
                          إجابتك: <span className="text-destructive font-medium">{(q as any)[`option_${userAnswer}`]}</span>
                          {" • "}الصحيحة: <span className="text-green-600 font-medium">{(q as any)[`option_${q.correct_option}`]}</span>
                        </p>
                      )}

                      {!isCorrect && q.explanation && (
                        <p className="text-xs text-muted-foreground mt-1 bg-muted p-2 rounded">{q.explanation}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Button onClick={engine.resetToIntro} className="flex-1">
            <RotateCcw className="w-4 h-4 ml-1" />أعد المحاولة
          </Button>
          <Button variant="outline" asChild className="flex-1">
            <Link to="/past-exams">جرّب نموذجًا حقيقيًا</Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

// ── Small presentational helpers ───────────────────────────

function PageHeader({ title, backTo, backLabel, isStaff }: { title: string; backTo?: string; backLabel?: string; isStaff?: boolean }) {
  const to = backTo || (isStaff ? "/admin" : "/dashboard");
  const label = backLabel || (isStaff ? "لوحة التحكم" : "الرئيسية");
  return (
    <header className="gradient-primary text-white px-4 py-4">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2"><GraduationCap className="w-6 h-6" /><span className="font-bold text-lg">{title}</span></div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20 hover:text-white">
            <Link to={to}><ChevronLeft className="w-4 h-4 ml-1" />{label}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function OfflineBanner() {
  return (
    <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
      <CardContent className="py-3 px-4 flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-orange-500 shrink-0" />
        <p className="text-sm text-orange-700 dark:text-orange-400">أنت في وضع أوفلاين — النتيجة ستُرسل تلقائياً عند عودة الاتصال</p>
      </CardContent>
    </Card>
  );
}

function PendingSyncBanner({ count }: { count: number }) {
  return (
    <Card className="border-blue-300 bg-blue-50 dark:bg-blue-950/20">
      <CardContent className="py-3 px-4 flex items-center gap-2">
        <CloudUpload className="w-4 h-4 text-blue-500 shrink-0" />
        <p className="text-sm text-blue-700 dark:text-blue-400">{count} نتيجة في انتظار المزامنة</p>
      </CardContent>
    </Card>
  );
}

function ShareResult({ percentage, score, total, toast }: { percentage: number; score: number; total: number; toast: any }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-sm font-semibold text-muted-foreground mb-3 text-center">شارك نتيجتك</p>
        <div className="flex gap-2 justify-center flex-wrap">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => {
            const text = `حققت ${percentage}% (${score}/${total}) في اختبار المحاكاة على تطبيق مُفَاضَلَة! 🎓\nhttps://mufadhala.com`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
          }}>
            <MessageCircle className="w-4 h-4" />واتساب
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => {
            const text = `حققت ${percentage}% في اختبار المحاكاة على #مُفَاضَلَة 🎓✨`;
            window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent("https://mufadhala.com")}`, "_blank");
          }}>
            <Share2 className="w-4 h-4" />X
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => {
            const text = `حققت ${percentage}% (${score}/${total}) في اختبار المحاكاة على تطبيق مُفَاضَلَة! 🎓\nhttps://mufadhala.com`;
            navigator.clipboard.writeText(text);
            toast({ title: "تم النسخ", description: "تم نسخ النتيجة إلى الحافظة" });
          }}>
            <Copy className="w-4 h-4" />نسخ
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ExamSimulator;
