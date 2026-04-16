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
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────
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

// ── Main Page ──────────────────────────────────────────────
const PastExams = () => {
  const navigate = useNavigate();
  const { user, student, loading: accessLoading, isStaff } = useStudentAccess();
  const { isActive: hasSubscription } = useSubscription(user?.id);

  const [selectedUniversityId, setSelectedUniversityId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  // Exam state
  const [examStarted, setExamStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState<Record<number, boolean>>({});
  const [finished, setFinished] = useState(false);

  // ── Fetch universities ─────────────────────────────────
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

  // ── Fetch models for selected university ───────────────
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

  // ── Fetch questions for selected model ─────────────────
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
    enabled: !!selectedModelId && examStarted,
  });

  const selectedModel = models.find(m => m.id === selectedModelId);
  const questions = modelQuestions.map(mq => mq.questions);
  const totalQ = questions.length;

  // Group models by year
  const modelsByYear = useMemo(() => {
    const map: Record<number, PastExamModel[]> = {};
    models.forEach(m => {
      if (!map[m.year]) map[m.year] = [];
      map[m.year].push(m);
    });
    return Object.entries(map).sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [models]);

  // ── Handlers ───────────────────────────────────────────
  const handleSelectAnswer = (option: string) => {
    if (showResult[currentQ]) return;
    setAnswers(prev => ({ ...prev, [currentQ]: option }));
    setShowResult(prev => ({ ...prev, [currentQ]: true }));
  };

  const handleNext = () => {
    if (currentQ < totalQ - 1) setCurrentQ(prev => prev + 1);
    else setFinished(true);
  };

  const handlePrev = () => {
    if (currentQ > 0) setCurrentQ(prev => prev - 1);
  };

  const handleRestart = () => {
    setCurrentQ(0);
    setAnswers({});
    setShowResult({});
    setFinished(false);
  };

  const handleBackToModels = () => {
    setSelectedModelId(null);
    setExamStarted(false);
    handleRestart();
  };

  const score = useMemo(() => {
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correct_option) correct++;
    });
    return correct;
  }, [answers, questions]);

  // ── Auth guard ─────────────────────────────────────────
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

  // ── Access check for paid models ───────────────────────
  const canAccessModel = (model: PastExamModel) => {
    if (!model.is_paid) return true;
    return hasSubscription;
  };

  // ── RENDER: Finished ───────────────────────────────────
  if (finished && examStarted) {
    const pct = totalQ > 0 ? Math.round((score / totalQ) * 100) : 0;
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <PageHeader title={selectedModel?.title || "النتيجة"} onBack={handleBackToModels} />
        <main className="max-w-2xl mx-auto px-4 py-8 text-center space-y-6">
          <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center ${pct >= 70 ? "bg-secondary/15" : pct >= 50 ? "bg-accent/15" : "bg-destructive/15"}`}>
            {pct >= 70 ? <CheckCircle2 className="w-12 h-12 text-secondary" /> : <XCircle className="w-12 h-12 text-destructive" />}
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">{pct}%</p>
            <p className="text-muted-foreground">{score} من {totalQ} إجابة صحيحة</p>
          </div>
          <Progress value={pct} className="h-3 max-w-xs mx-auto" />
          <div className="flex gap-3 justify-center flex-wrap">
            <Button onClick={handleRestart} variant="outline"><RotateCcw className="w-4 h-4 ml-2" />إعادة المحاولة</Button>
            <Button onClick={handleBackToModels}><ArrowRight className="w-4 h-4 ml-2" />العودة للنماذج</Button>
          </div>

          {/* Review answers */}
          <div className="text-right space-y-3 mt-8">
            <h3 className="font-bold text-lg">مراجعة الإجابات</h3>
            {questions.map((q, i) => {
              const userAns = answers[i];
              const isCorrect = userAns === q.correct_option;
              return (
                <Card key={q.id} className={`border-r-4 ${isCorrect ? "border-r-secondary" : "border-r-destructive"}`}>
                  <CardContent className="p-4 space-y-2">
                    <p className="font-medium text-sm">{i + 1}. {q.question_text}</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {["a", "b", "c", "d"].map(opt => {
                        if (q.question_type === "true_false" && (opt === "c" || opt === "d")) return null;
                        const text = q[`option_${opt}` as keyof typeof q] as string;
                        const isUserChoice = userAns === opt;
                        const isCorrectOpt = q.correct_option === opt;
                        return (
                          <div key={opt} className={`text-xs px-3 py-1.5 rounded-md border ${isCorrectOpt ? "bg-secondary/10 border-secondary text-secondary font-semibold" : isUserChoice ? "bg-destructive/10 border-destructive text-destructive" : "border-border text-muted-foreground"}`}>
                            {text}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && (
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">💡 {q.explanation}</p>
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

  // ── RENDER: Exam in progress ───────────────────────────
  if (examStarted && selectedModelId) {
    if (questionsLoading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      );
    }

    if (totalQ === 0) {
      return (
        <div className="min-h-screen bg-background" dir="rtl">
          <PageHeader title={selectedModel?.title || "نموذج"} onBack={handleBackToModels} />
          <main className="max-w-2xl mx-auto px-4 py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold">لا توجد أسئلة في هذا النموذج بعد</p>
            <Button onClick={handleBackToModels} className="mt-4">العودة</Button>
          </main>
        </div>
      );
    }

    const q = questions[currentQ];
    const answered = showResult[currentQ];
    const options = q.question_type === "true_false"
      ? [{ key: "a", text: q.option_a }, { key: "b", text: q.option_b }]
      : [{ key: "a", text: q.option_a }, { key: "b", text: q.option_b }, { key: "c", text: q.option_c }, { key: "d", text: q.option_d }];

    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <PageHeader title={selectedModel?.title || "نموذج"} onBack={handleBackToModels} />
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          {/* Progress */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-primary">{currentQ + 1}/{totalQ}</span>
            <Progress value={((currentQ + 1) / totalQ) * 100} className="h-2 flex-1" />
          </div>

          {/* Question */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <p className="font-semibold text-foreground leading-relaxed">{q.question_text}</p>
              <div className="space-y-2">
                {options.map(opt => {
                  const isSelected = answers[currentQ] === opt.key;
                  const isCorrect = q.correct_option === opt.key;
                  let cls = "border-border hover:border-primary/50 cursor-pointer";
                  if (answered) {
                    if (isCorrect) cls = "border-secondary bg-secondary/10";
                    else if (isSelected && !isCorrect) cls = "border-destructive bg-destructive/10";
                    else cls = "border-border opacity-60";
                  } else if (isSelected) {
                    cls = "border-primary bg-primary/10";
                  }
                  return (
                    <button
                      key={opt.key}
                      onClick={() => handleSelectAnswer(opt.key)}
                      disabled={!!answered}
                      className={`w-full text-right px-4 py-3 rounded-lg border-2 transition-all text-sm ${cls}`}
                    >
                      {opt.text}
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {answered && q.explanation && (
                <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
                  💡 {q.explanation}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex gap-3">
            {currentQ > 0 && (
              <Button variant="outline" onClick={handlePrev} className="flex-1">
                <ChevronRight className="w-4 h-4 ml-1" />السابق
              </Button>
            )}
            {answered && (
              <Button onClick={handleNext} className="flex-1">
                {currentQ < totalQ - 1 ? <>التالي<ChevronLeft className="w-4 h-4 mr-1" /></> : <>إنهاء<Flag className="w-4 h-4 mr-1" /></>}
              </Button>
            )}
            {!answered && (
              <Button variant="ghost" onClick={handleNext} className="flex-1 text-muted-foreground">
                <SkipForward className="w-4 h-4 ml-1" />تخطي
              </Button>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ── RENDER: Model selection ────────────────────────────
  if (selectedUniversityId && !examStarted) {
    const uniName = universities.find(u => u.id === selectedUniversityId)?.name_ar || "";
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <PageHeader title={`نماذج ${uniName}`} onBack={() => setSelectedUniversityId(null)} />
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          {modelsLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
          ) : models.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold text-foreground">لا توجد نماذج متاحة لهذه الجامعة بعد</p>
              <p className="text-sm text-muted-foreground mt-1">سيتم إضافة نماذج الأعوام السابقة قريباً</p>
            </div>
          ) : (
            modelsByYear.map(([year, yearModels]) => (
              <div key={year} className="space-y-2">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  {year}
                </h3>
                {yearModels.map(model => {
                  const locked = !canAccessModel(model);
                  return (
                    <Card
                      key={model.id}
                      className={`cursor-pointer hover:shadow-md active:scale-[0.98] transition-all ${locked ? "opacity-70" : ""}`}
                      onClick={() => {
                        if (locked) return;
                        setSelectedModelId(model.id);
                        setExamStarted(true);
                      }}
                    >
                      <CardContent className="flex items-center gap-3 p-4">
                        <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${locked ? "bg-muted" : "bg-primary/10"}`}>
                          {locked ? <Lock className="w-5 h-5 text-muted-foreground" /> : <Play className="w-5 h-5 text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground">{model.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {model.track && <Badge variant="secondary" className="text-[10px]">{model.track}</Badge>}
                            {model.duration_minutes && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Clock className="w-3 h-3" />{model.duration_minutes} دقيقة
                              </span>
                            )}
                            {model.is_paid ? (
                              <Badge variant="outline" className="text-[10px] border-accent text-accent">مدفوع</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] border-secondary text-secondary">مجاني</Badge>
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

  // ── RENDER: University selection ────────────────────────
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <PageHeader title="نماذج الأعوام السابقة" onBack={() => navigate("/dashboard")} />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <p className="text-sm text-muted-foreground">اختر الجامعة لعرض نماذج اختبارات القبول السابقة</p>
        {uniLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
        ) : (
          <div className="space-y-2">
            {universities.map(uni => (
              <Card
                key={uni.id}
                className="cursor-pointer hover:shadow-md active:scale-[0.98] transition-all"
                onClick={() => setSelectedUniversityId(uni.id)}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
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

// ── Shared Header ────────────────────────────────────────
function PageHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <header className="gradient-primary text-white px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors">
            <ArrowRight className="w-5 h-5" />
          </button>
        )}
        <GraduationCap className="w-5 h-5" />
        <h1 className="font-bold text-base flex-1">{title}</h1>
        <ThemeToggle />
      </div>
    </header>
  );
}

export default PastExams;
