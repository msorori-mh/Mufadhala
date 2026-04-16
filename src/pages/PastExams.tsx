import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import ThemeToggle from "@/components/ThemeToggle";
import {
  GraduationCap, ChevronLeft, ChevronRight, BookOpen, Lock, Clock,
  CheckCircle2, XCircle, AlertTriangle, Loader2, ArrowRight,
  FileText, Calendar, Building2, Play, RotateCcw, SkipForward, Flag,
  HelpCircle, Crown, Sparkles, BookMarked,
} from "lucide-react";

/* ─────────────── Types ─────────────── */
interface PastExamModel {
  id: string;
  title: string;
  university_id: string;
  year: number;
  track: string | null;
  is_published: boolean;
  is_paid: boolean;
  duration_minutes: number | null;
}

interface ModelQuestion {
  order_index: number;
  questions: {
    id: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_option: string;
    explanation: string;
    question_type: string;
  };
}

/* ─────────────── Screens enum ─────────────── */
type Screen = "universities" | "models" | "details" | "paywall" | "exam" | "results";

/* ══════════════════════════════════════════════════════════ */
const PastExams = () => {
  const navigate = useNavigate();
  const { user, loading: accessLoading } = useStudentAccess();
  const { isActive: hasSubscription } = useSubscription(user?.id);

  /* Navigation state */
  const [screen, setScreen] = useState<Screen>("universities");
  const [selectedUniversityId, setSelectedUniversityId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  /* Exam state */
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState<Record<number, boolean>>({});

  /* ─── Queries ────────────────────────────────────────── */
  const { data: universities = [], isLoading: uniLoading } = useQuery({
    queryKey: ["past-exam-universities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("universities")
        .select("id, name_ar")
        .eq("is_active", true)
        .order("display_order");
      return data || [];
    },
  });

  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ["past-exam-models", selectedUniversityId],
    queryFn: async () => {
      const { data } = await supabase
        .from("past_exam_models")
        .select("id, title, university_id, year, track, is_published, is_paid, duration_minutes")
        .eq("university_id", selectedUniversityId!)
        .eq("is_published", true)
        .order("year", { ascending: false });
      return (data || []) as PastExamModel[];
    },
    enabled: !!selectedUniversityId,
  });

  // Fetch question counts for all models in current university
  const modelIds = models.map(m => m.id);
  const { data: questionCounts = {} } = useQuery({
    queryKey: ["past-exam-question-counts", modelIds],
    queryFn: async () => {
      if (modelIds.length === 0) return {};
      const { data } = await supabase
        .from("past_exam_model_questions")
        .select("model_id")
        .in("model_id", modelIds);
      const counts: Record<string, number> = {};
      (data || []).forEach(row => {
        counts[row.model_id] = (counts[row.model_id] || 0) + 1;
      });
      return counts;
    },
    enabled: modelIds.length > 0,
  });

  const { data: modelQuestions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ["past-exam-questions", selectedModelId],
    queryFn: async () => {
      const { data } = await supabase
        .from("past_exam_model_questions")
        .select("order_index, questions(id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, question_type)")
        .eq("model_id", selectedModelId!)
        .order("order_index");
      return (data || []) as unknown as ModelQuestion[];
    },
    enabled: !!selectedModelId && screen === "exam",
  });

  /* ─── Derived ─────────────────────────────────────────── */
  const selectedModel = models.find(m => m.id === selectedModelId);
  const selectedUni = universities.find(u => u.id === selectedUniversityId);
  const questions = modelQuestions.map(mq => mq.questions);
  const totalQ = questions.length;

  const modelsByYear = useMemo(() => {
    const map: Record<number, PastExamModel[]> = {};
    models.forEach(m => {
      if (!map[m.year]) map[m.year] = [];
      map[m.year].push(m);
    });
    return Object.entries(map).sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [models]);

  const score = useMemo(() => {
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correct_option) correct++;
    });
    return correct;
  }, [answers, questions]);

  /* ─── Navigation helpers ──────────────────────────────── */
  const goToUniversities = () => {
    setScreen("universities");
    setSelectedUniversityId(null);
    setSelectedModelId(null);
  };
  const goToModels = (uniId?: string) => {
    if (uniId) setSelectedUniversityId(uniId);
    setSelectedModelId(null);
    setScreen("models");
    resetExam();
  };
  const goToDetails = (modelId: string) => {
    setSelectedModelId(modelId);
    const model = models.find(m => m.id === modelId);
    if (model?.is_paid && !hasSubscription) {
      setScreen("paywall");
    } else {
      setScreen("details");
    }
  };
  const startExam = () => {
    resetExam();
    setScreen("exam");
  };
  const resetExam = () => {
    setCurrentQ(0);
    setAnswers({});
    setShowResult({});
  };

  /* ─── Exam handlers ───────────────────────────────────── */
  const handleSelectAnswer = (option: string) => {
    if (showResult[currentQ]) return;
    setAnswers(prev => ({ ...prev, [currentQ]: option }));
    setShowResult(prev => ({ ...prev, [currentQ]: true }));
  };
  const handleNext = () => {
    if (currentQ < totalQ - 1) setCurrentQ(prev => prev + 1);
    else setScreen("results");
  };
  const handlePrev = () => {
    if (currentQ > 0) setCurrentQ(prev => prev - 1);
  };

  /* ─── Auth guard ──────────────────────────────────────── */
  if (accessLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) {
    navigate("/login");
    return null;
  }

  /* ═══════════════════════════════════════════════════════
     SCREEN: Results
     ═══════════════════════════════════════════════════════ */
  if (screen === "results") {
    const pct = totalQ > 0 ? Math.round((score / totalQ) * 100) : 0;
    const grade = pct >= 80 ? "ممتاز! 🎉" : pct >= 60 ? "جيد جداً 👏" : pct >= 40 ? "تحتاج مراجعة 📖" : "حاول مرة أخرى 💪";
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <PageHeader title="النتيجة" onBack={() => goToModels()} />
        <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          {/* Score hero */}
          <div className="text-center space-y-4">
            <div className={`w-28 h-28 mx-auto rounded-full flex items-center justify-center ${
              pct >= 60 ? "bg-secondary/10 ring-4 ring-secondary/20" : "bg-destructive/10 ring-4 ring-destructive/20"
            }`}>
              <span className="text-4xl font-black text-foreground">{pct}%</span>
            </div>
            <p className="text-lg font-bold text-foreground">{grade}</p>
            <p className="text-sm text-muted-foreground">
              أجبت على <span className="font-semibold text-foreground">{score}</span> من <span className="font-semibold text-foreground">{totalQ}</span> بشكل صحيح
            </p>
            <Progress value={pct} className="h-3 max-w-xs mx-auto" />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-center">
            <Button onClick={() => { resetExam(); setScreen("exam"); }} variant="outline" className="h-12 px-5">
              <RotateCcw className="w-4 h-4 ml-2" />إعادة المحاولة
            </Button>
            <Button onClick={() => goToModels()} className="h-12 px-5">
              <ArrowRight className="w-4 h-4 ml-2" />نماذج أخرى
            </Button>
          </div>

          {/* Review */}
          <div className="space-y-3 pt-4">
            <h3 className="font-bold text-base text-foreground">📋 مراجعة الإجابات</h3>
            {questions.map((q, i) => {
              const userAns = answers[i];
              const isCorrect = userAns === q.correct_option;
              return (
                <Card key={q.id} className={`overflow-hidden border-r-4 ${isCorrect ? "border-r-secondary" : userAns ? "border-r-destructive" : "border-r-muted"}`}>
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-start gap-2">
                      <span className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold mt-0.5 ${
                        isCorrect ? "bg-secondary/15 text-secondary" : userAns ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"
                      }`}>{i + 1}</span>
                      <p className="font-medium text-sm text-foreground leading-relaxed">{q.question_text}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 mr-8">
                      {["a", "b", "c", "d"].map(opt => {
                        if (q.question_type === "true_false" && (opt === "c" || opt === "d")) return null;
                        const text = q[`option_${opt}` as keyof typeof q] as string;
                        const isUserChoice = userAns === opt;
                        const isCorrectOpt = q.correct_option === opt;
                        return (
                          <div key={opt} className={`text-xs px-3 py-2 rounded-lg border transition-all ${
                            isCorrectOpt
                              ? "bg-secondary/10 border-secondary/40 text-secondary font-semibold"
                              : isUserChoice
                                ? "bg-destructive/10 border-destructive/40 text-destructive"
                                : "border-border text-muted-foreground"
                          }`}>
                            <span className="font-bold ml-1.5">{opt.toUpperCase()}</span>
                            {text}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && (
                      <div className="bg-primary/5 border border-primary/10 p-3 rounded-lg text-xs text-foreground mr-8">
                        <span className="font-semibold text-primary">💡 الشرح:</span> {q.explanation}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     SCREEN: Exam (Training mode)
     ═══════════════════════════════════════════════════════ */
  if (screen === "exam") {
    if (questionsLoading) {
      return (
        <div className="min-h-screen bg-background" dir="rtl">
          <PageHeader title={selectedModel?.title || "نموذج"} onBack={() => goToDetails(selectedModelId!)} />
          <main className="max-w-2xl mx-auto px-4 py-10 space-y-4">
            <Skeleton className="h-3 w-full rounded-full" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </main>
        </div>
      );
    }

    if (totalQ === 0) {
      return (
        <div className="min-h-screen bg-background" dir="rtl">
          <PageHeader title={selectedModel?.title || "نموذج"} onBack={() => goToModels()} />
          <main className="max-w-2xl mx-auto px-4 py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="font-bold text-foreground text-base">لا توجد أسئلة في هذا النموذج بعد</p>
            <p className="text-sm text-muted-foreground mt-1">سيتم إضافة الأسئلة قريباً</p>
            <Button onClick={() => goToModels()} className="mt-6 h-12 px-6">العودة للنماذج</Button>
          </main>
        </div>
      );
    }

    const q = questions[currentQ];
    const answered = showResult[currentQ];
    const userAns = answers[currentQ];
    const options = q.question_type === "true_false"
      ? [{ key: "a", text: q.option_a, label: "صح" }, { key: "b", text: q.option_b, label: "خطأ" }]
      : [
          { key: "a", text: q.option_a, label: "أ" },
          { key: "b", text: q.option_b, label: "ب" },
          { key: "c", text: q.option_c, label: "ج" },
          { key: "d", text: q.option_d, label: "د" },
        ];

    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <PageHeader title={selectedModel?.title || "نموذج"} onBack={() => goToModels()} />
        <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary">السؤال {currentQ + 1} من {totalQ}</span>
              <span className="text-xs text-muted-foreground">
                {Object.keys(answers).length} إجابة
              </span>
            </div>
            <div className="relative">
              <Progress value={((currentQ + 1) / totalQ) * 100} className="h-2" />
            </div>
          </div>

          {/* Question card */}
          <Card className="border-0 shadow-md">
            <CardContent className="p-5 space-y-5">
              {/* Question number badge + text */}
              <div className="space-y-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{currentQ + 1}</span>
                </div>
                <p className="font-semibold text-foreground leading-[1.8] text-[15px]">{q.question_text}</p>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {options.map(opt => {
                  const isSelected = userAns === opt.key;
                  const isCorrect = q.correct_option === opt.key;

                  let containerCls = "border-border hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]";
                  let labelCls = "bg-muted text-muted-foreground";
                  let iconEl: React.ReactNode = null;

                  if (answered) {
                    if (isCorrect) {
                      containerCls = "border-secondary bg-secondary/8";
                      labelCls = "bg-secondary text-white";
                      iconEl = <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />;
                    } else if (isSelected && !isCorrect) {
                      containerCls = "border-destructive bg-destructive/8";
                      labelCls = "bg-destructive text-white";
                      iconEl = <XCircle className="w-5 h-5 text-destructive shrink-0" />;
                    } else {
                      containerCls = "border-border opacity-50";
                    }
                  } else if (isSelected) {
                    containerCls = "border-primary bg-primary/8 ring-2 ring-primary/20";
                    labelCls = "bg-primary text-white";
                  }

                  return (
                    <button
                      key={opt.key}
                      onClick={() => handleSelectAnswer(opt.key)}
                      disabled={!!answered}
                      className={`w-full text-right flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all ${containerCls}`}
                    >
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${labelCls}`}>
                        {opt.label}
                      </span>
                      <span className="text-sm flex-1 leading-relaxed">{opt.text}</span>
                      {iconEl}
                    </button>
                  );
                })}
              </div>

              {/* Explanation after answering */}
              {answered && q.explanation && (
                <div className="bg-primary/5 border border-primary/15 p-4 rounded-xl space-y-1">
                  <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />الشرح
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">{q.explanation}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation buttons */}
          <div className="flex gap-3 pb-4">
            {currentQ > 0 && (
              <Button variant="outline" onClick={handlePrev} className="flex-1 h-12 rounded-xl text-sm">
                <ChevronRight className="w-4 h-4 ml-1" />السابق
              </Button>
            )}
            {answered ? (
              <Button onClick={handleNext} className="flex-1 h-12 rounded-xl text-sm">
                {currentQ < totalQ - 1 ? (
                  <>السؤال التالي<ChevronLeft className="w-4 h-4 mr-1" /></>
                ) : (
                  <>عرض النتيجة<Flag className="w-4 h-4 mr-1" /></>
                )}
              </Button>
            ) : (
              <Button variant="ghost" onClick={handleNext} className="flex-1 h-12 rounded-xl text-sm text-muted-foreground">
                <SkipForward className="w-4 h-4 ml-1" />تخطي
              </Button>
            )}
          </div>
        </main>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     SCREEN: Paywall
     ═══════════════════════════════════════════════════════ */
  if (screen === "paywall") {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <PageHeader title="محتوى مدفوع" onBack={() => goToModels()} />
        <main className="max-w-md mx-auto px-4 py-12 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
            <Lock className="w-9 h-9 text-accent" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">هذا النموذج متاح للمشتركين فقط</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              اشترك الآن للوصول إلى جميع نماذج الأعوام السابقة والمحتوى المتميز
            </p>
          </div>

          {/* Benefits */}
          <div className="bg-card rounded-2xl border p-5 space-y-3 text-right">
            {[
              { icon: BookMarked, text: "جميع نماذج الأعوام السابقة" },
              { icon: BookOpen, text: "كامل المحتوى التعليمي" },
              { icon: HelpCircle, text: "أكثر من 3000 سؤال تدريبي" },
              { icon: Sparkles, text: "تحليل ذكي لأدائك" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-accent" />
                </div>
                <span className="text-sm text-foreground">{item.text}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={() => navigate("/subscription")}
            className="w-full h-13 rounded-xl text-base font-bold"
            size="lg"
          >
            <Crown className="w-5 h-5 ml-2" />اشترك الآن
          </Button>
          <button
            onClick={() => goToModels()}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            العودة للنماذج المجانية
          </button>
        </main>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     SCREEN: Model Details
     ═══════════════════════════════════════════════════════ */
  if (screen === "details" && selectedModel) {
    const qCount = questionCounts[selectedModel.id] || 0;
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <PageHeader title={selectedModel.title} onBack={() => goToModels()} />
        <main className="max-w-md mx-auto px-4 py-8 space-y-6">
          {/* Hero */}
          <div className="text-center space-y-3">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-9 h-9 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">{selectedModel.title}</h2>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoBox icon={Building2} label="الجامعة" value={selectedUni?.name_ar || ""} />
            <InfoBox icon={Calendar} label="السنة" value={String(selectedModel.year)} />
            <InfoBox icon={HelpCircle} label="عدد الأسئلة" value={qCount > 0 ? `${qCount} سؤال` : "—"} />
            <InfoBox icon={Clock} label="المدة" value={selectedModel.duration_minutes ? `${selectedModel.duration_minutes} دقيقة` : "مفتوح"} />
          </div>

          {selectedModel.track && (
            <div className="flex items-center justify-center">
              <Badge variant="secondary" className="text-xs px-3 py-1">{selectedModel.track}</Badge>
            </div>
          )}

          {/* Notice */}
          <div className="bg-muted/50 rounded-xl p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">وضع التدريب</p>
              <p className="text-xs text-muted-foreground mt-0.5">أجب على الأسئلة واطّلع على الإجابة الصحيحة والشرح بعد كل سؤال</p>
            </div>
          </div>

          {/* CTA */}
          <Button onClick={startExam} className="w-full h-14 rounded-xl text-base font-bold" size="lg" disabled={qCount === 0}>
            <Play className="w-5 h-5 ml-2" />ابدأ الحل
          </Button>
          {qCount === 0 && (
            <p className="text-center text-xs text-muted-foreground">لم يتم إضافة أسئلة لهذا النموذج بعد</p>
          )}
        </main>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     SCREEN: Models List (grouped by year)
     ═══════════════════════════════════════════════════════ */
  if (screen === "models" && selectedUniversityId) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <PageHeader title={`نماذج ${selectedUni?.name_ar || ""}`} onBack={goToUniversities} />
        <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
          {/* University banner */}
          <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">{selectedUni?.name_ar}</p>
              <p className="text-xs text-muted-foreground">{models.length} نموذج متاح</p>
            </div>
          </div>

          {modelsLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : models.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <FileText className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="font-bold text-foreground text-base">لا توجد نماذج متاحة بعد</p>
              <p className="text-sm text-muted-foreground mt-1">سيتم إضافة نماذج الأعوام السابقة قريباً</p>
            </div>
          ) : (
            modelsByYear.map(([year, yearModels]) => (
              <div key={year} className="space-y-2.5">
                {/* Year heading */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground text-base">{year}</h3>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Model cards */}
                {yearModels.map(model => {
                  const locked = model.is_paid && !hasSubscription;
                  const qCount = questionCounts[model.id] || 0;
                  return (
                    <Card
                      key={model.id}
                      className={`overflow-hidden cursor-pointer hover:shadow-md active:scale-[0.98] transition-all ${locked ? "opacity-80" : ""}`}
                      onClick={() => goToDetails(model.id)}
                    >
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                          locked ? "bg-muted" : "bg-primary/10"
                        }`}>
                          {locked ? (
                            <Lock className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <FileText className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="font-semibold text-sm text-foreground line-clamp-1">{model.title}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {qCount > 0 && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <HelpCircle className="w-3 h-3" />{qCount} سؤال
                              </span>
                            )}
                            {model.duration_minutes && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />{model.duration_minutes} د
                              </span>
                            )}
                            {model.track && (
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">{model.track}</Badge>
                            )}
                            {model.is_paid ? (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-accent/50 text-accent">
                                <Crown className="w-2.5 h-2.5 ml-0.5" />مدفوع
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-secondary/50 text-secondary">مجاني</Badge>
                            )}
                          </div>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ))
          )}
        </main>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     SCREEN: University Selection (default)
     ═══════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <PageHeader title="نماذج الأعوام السابقة" onBack={() => navigate("/dashboard")} />
      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Hero intro */}
        <div className="bg-gradient-to-br from-primary/8 to-primary/3 rounded-2xl p-5 space-y-2 border border-primary/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <BookMarked className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-sm">اختبر نفسك بنماذج حقيقية</h2>
              <p className="text-xs text-muted-foreground">نماذج مفاضلات السنوات الماضية من مختلف الجامعات</p>
            </div>
          </div>
        </div>

        {/* Subtitle */}
        <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          اختر الجامعة
        </h3>

        {uniLoading ? (
          <div className="space-y-2.5">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {universities.map(uni => (
              <Card
                key={uni.id}
                className="cursor-pointer hover:shadow-md active:scale-[0.98] transition-all overflow-hidden"
                onClick={() => goToModels(uni.id)}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-semibold text-sm text-foreground flex-1">{uni.name_ar}</span>
                  <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   Shared Components
   ═══════════════════════════════════════════════════════ */

function PageHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <header className="gradient-primary text-white px-4 py-3 sticky top-0 z-30">
      <div className="max-w-2xl mx-auto flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="p-2 -m-1 rounded-xl hover:bg-white/15 active:bg-white/25 transition-colors">
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
        <GraduationCap className="w-5 h-5 shrink-0" />
        <h1 className="font-bold text-sm flex-1 truncate">{title}</h1>
        <ThemeToggle />
      </div>
    </header>
  );
}

function InfoBox({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-card rounded-xl border p-3.5 text-center space-y-1.5">
      <div className="w-9 h-9 mx-auto rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-foreground truncate">{value}</p>
    </div>
  );
}

export default PastExams;
