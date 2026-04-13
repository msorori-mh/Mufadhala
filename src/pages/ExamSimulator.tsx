import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap, ChevronLeft, Clock, AlertTriangle, CheckCircle2,
  XCircle, Loader2, Play, Trophy, RotateCcw, Download, WifiOff, CloudUpload,
  Share2, Copy, MessageCircle,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import PostExamUpgrade from "@/components/PostExamUpgrade";
import {
  useExamEngine,
  formatTime,
  MAX_ATTEMPTS,
  PER_QUESTION_TIME,
  type Question,
} from "@/features/exams/hooks/useExamEngine";

const ExamSimulator = () => {
  const navigate = useNavigate();
  const engine = useExamEngine();

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
        <main className="max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-6">
          {engine.isOffline && <OfflineBanner />}
          {engine.pendingResultsCount > 0 && <PendingSyncBanner count={engine.pendingResultsCount} />}

          <div>
            <h1 className="text-2xl font-bold text-foreground">محاكاة اختبار {engine.majorName || "التخصص"}</h1>
            <p className="text-sm text-muted-foreground mt-1">تدرب بذكاء.. لتضمن القبول.</p>
          </div>

          {!engine.isOffline && engine.isTrial && engine.allQuestions.length > 0 && (
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
              <CardContent className="py-4 px-4 flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">تجربة مجانية — {engine.trialMinutesLabel} دقائق فقط</p>
                  <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                    يمكنك تجربة محاكي الاختبار لمدة {engine.trialMinutesLabel} دقائق. لفتح الاختبار الكامل (90 دقيقة)، فعّل اشتراكك.
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
                <li className="flex items-start gap-2"><Clock className="w-4 h-4 mt-0.5 text-primary shrink-0" /><span><strong>{engine.questionsAvailable} سؤال</strong> في <strong>{engine.isTrial ? `${engine.trialMinutesLabel} دقائق` : "90 دقيقة"}</strong> كحد أقصى</span></li>
                <li className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 text-orange-500 shrink-0" /><span>حد أقصى <strong>دقيقتين</strong> لكل سؤال — ينتقل تلقائياً عند انتهاء الوقت</span></li>
                {!engine.isTrial && (
                  <li className="flex items-start gap-2"><RotateCcw className="w-4 h-4 mt-0.5 text-secondary shrink-0" /><span>مسموح بـ <strong>{MAX_ATTEMPTS} محاولات</strong> فقط {!engine.isOffline && `(استخدمت ${engine.attemptsUsed})`}</span></li>
                )}
              </ul>
            </CardContent>
          </Card>

          {!engine.isOffline && engine.canAccessFull && engine.allQuestions.length > 0 && (
            <Button variant="outline" className="w-full" onClick={engine.downloadForOffline} disabled={engine.downloadingOffline}>
              {engine.downloadingOffline ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Download className="w-4 h-4 ml-2" />}
              {engine.hasOfflineQuestions
                ? `تحديث الأسئلة المحفوظة (${engine.offlineQuestionCount} سؤال)`
                : `تحميل ${engine.allQuestions.length} سؤال للأوفلاين`}
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
            {engine.isOffline
              ? (engine.hasOfflineQuestions ? "ابدأ اختبار أوفلاين" : "لا توجد أسئلة محفوظة")
              : (engine.attemptsUsed >= MAX_ATTEMPTS && engine.canAccessFull ? "استنفذت جميع المحاولات" : engine.isTrial ? `ابدأ التجربة المجانية (${engine.trialMinutesLabel} دقائق)` : "ابدأ الاختبار")}
          </Button>

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
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {(engine.isOffline || engine.isOfflineExam) && (
          <div className="bg-orange-500 text-white text-center text-xs py-1 flex items-center justify-center gap-1">
            <WifiOff className="w-3 h-3" />
            وضع أوفلاين — النتيجة ستُحفظ محلياً
          </div>
        )}

        <div className="bg-card border-b px-4 py-2">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs">{engine.currentIndex + 1} / {engine.examQuestions.length}</Badge>
                <span className="text-xs text-muted-foreground">أُجيب: {engine.answeredCount}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1 text-xs font-mono ${engine.timeWarning ? "text-red-500 animate-pulse" : "text-muted-foreground"}`}>
                  <Clock className="w-3 h-3" />{formatTime(engine.questionTimeLeft)}
                </div>
                <div className={`flex items-center gap-1 text-xs font-mono ${engine.totalWarning ? "text-red-500" : "text-foreground"}`}>
                  <Clock className="w-3 h-3" />{formatTime(engine.totalTimeLeft)}
                </div>
              </div>
            </div>
            <Progress value={engine.progress} className="h-1.5" />
            <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 rounded-full ${engine.timeWarning ? "bg-red-500" : "bg-primary/50"}`}
                style={{ width: `${(engine.questionTimeLeft / PER_QUESTION_TIME) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <main className="flex-1 max-w-2xl mx-auto px-4 py-6 w-full">
          <Card>
            <CardContent className="py-6 px-5">
              {q.subject && q.subject !== "general" && (
                <Badge variant="outline" className="mb-2 text-xs">
                  {q.subject === "biology" ? "أحياء" : q.subject === "chemistry" ? "كيمياء" : q.subject === "physics" ? "فيزياء" : q.subject === "math" ? "رياضيات" : q.subject === "english" ? "إنجليزي" : q.subject === "iq" ? "ذكاء" : q.subject}
                </Badge>
              )}
              <p className="font-semibold text-foreground text-base mb-5">{engine.currentIndex + 1}. {q.question_text}</p>
              <div className="space-y-3">
                {(["a", "b", "c", "d"] as const).map((opt) => {
                  const text = q[`option_${opt}` as keyof Question] as string;
                  const userAnswer = engine.answers[q.id];
                  const isSelected = userAnswer === opt;
                  const isCorrectOpt = q.correct_option === opt;
                  const answered = !!userAnswer;

                  let optClass = "border-border hover:border-primary/50 hover:bg-muted";
                  if (answered && engine.showExplanation) {
                    if (isCorrectOpt) optClass = "border-green-500 bg-green-50 dark:bg-green-950/30";
                    else if (isSelected) optClass = "border-destructive bg-destructive/10";
                    else optClass = "border-border opacity-50";
                  } else if (answered && isSelected && !engine.showExplanation) {
                    optClass = "border-green-500 bg-green-50 dark:bg-green-950/30";
                  } else if (isSelected) {
                    optClass = "border-primary bg-primary/10 shadow-sm";
                  }

                  return (
                    <button
                      key={opt}
                      onClick={() => engine.selectAnswer(opt)}
                      disabled={!!userAnswer}
                      className={`flex items-center gap-2 sm:gap-3 w-full text-right p-3 sm:p-4 rounded-xl border-2 transition-all text-sm ${optClass}`}
                    >
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        answered && engine.showExplanation && isCorrectOpt ? "bg-green-500 text-white" :
                        answered && engine.showExplanation && isSelected ? "bg-destructive text-destructive-foreground" :
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}>
                        {answered && engine.showExplanation && isCorrectOpt ? <CheckCircle2 className="w-4 h-4" /> :
                         answered && engine.showExplanation && isSelected ? <XCircle className="w-4 h-4" /> :
                         opt.toUpperCase()}
                      </span>
                      <span className="flex-1">{text}</span>
                    </button>
                  );
                })}
              </div>

              {engine.showExplanation && (
                <div className="mt-4 p-4 rounded-lg bg-destructive/5 border border-destructive/20 space-y-2">
                  <p className="text-sm font-semibold text-destructive flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> إجابة خاطئة
                  </p>
                  <p className="text-sm text-foreground">
                    الإجابة الصحيحة: <strong className="text-green-600">{(q as any)[`option_${q.correct_option}`]}</strong>
                  </p>
                  {q.explanation && <p className="text-sm text-muted-foreground">{q.explanation}</p>}
                  <Button size="sm" onClick={engine.dismissExplanation} className="mt-2">التالي ←</Button>
                </div>
              )}

              {!engine.showExplanation && (
                <div className="flex items-center justify-between mt-6">
                  <Button variant="ghost" size="sm" onClick={() => engine.moveToNext(engine.answers, engine.examQuestions, engine.currentIndex)}>
                    تخطي →
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => engine.finishExam(engine.answers, engine.examQuestions)}>
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

  // ── RESULT PHASE ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="نتيجة الاختبار" backTo="/dashboard" backLabel="الرئيسية" />
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

        {engine.trialExpired && (
          <Card className="border-primary bg-primary/5">
            <CardContent className="py-5 text-center space-y-3">
              <Clock className="w-10 h-10 text-primary mx-auto" />
              <p className="font-semibold text-foreground">انتهت التجربة المجانية ({engine.trialMinutesLabel} دقائق)</p>
              <p className="text-sm text-muted-foreground">
                فعّل اشتراكك لفتح الاختبار الكامل (90 دقيقة) مع {MAX_ATTEMPTS} محاولات وتحليل أداء مفصّل
              </p>
              <Button onClick={() => navigate("/subscription")}>تفعيل الاشتراك الآن</Button>
            </CardContent>
          </Card>
        )}

        <Card className={engine.passed ? "border-green-500" : "border-orange-500"}>
          <CardContent className="py-8 text-center">
            {engine.passed ? <Trophy className="w-16 h-16 text-green-500 mx-auto mb-3" /> : <XCircle className="w-16 h-16 text-orange-500 mx-auto mb-3" />}
            <p className="text-4xl font-bold text-foreground">{engine.percentage}%</p>
            <p className="text-lg text-muted-foreground mt-1">{engine.resultScore} / {engine.resultTotal}</p>
            <p className="text-sm mt-3">
              {engine.trialExpired ? "هذه نتيجتك في الدقائق الخمس الأولى. فعّل اشتراكك لتتدرب على الاختبار الكامل!" : engine.passed ? "أداء ممتاز! أنت جاهز للاختبار الحقيقي 🎉" : "تحتاج مزيداً من التدريب. راجع الدروس وحاول مرة أخرى"}
            </p>
          </CardContent>
        </Card>

        <ShareResult percentage={engine.percentage} score={engine.resultScore} total={engine.resultTotal} toast={engine.toast} />

        {/* Upgrade CTA for free users after exam */}
        {!engine.hasSubscription && !engine.trialExpired && (
          <PostExamUpgrade percentage={engine.percentage} totalQuestions={engine.examQuestions.length} />
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">مراجعة الإجابات</h3>
          {engine.examQuestions.map((q, i) => {
            const userAnswer = engine.answers[q.id];
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
          <Button onClick={engine.resetToIntro} className="flex-1">
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
