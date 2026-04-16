import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, CheckCircle2, XCircle, Lock, RotateCcw, Trophy, ArrowLeft } from "lucide-react";
import { trackSubscriptionClick } from "@/lib/conversionTracking";

const OPTION_LABELS: Record<string, string> = { a: "أ", b: "ب", c: "ج", d: "د" };

const PastExamPractice = () => {
  const { modelId } = useParams<{ modelId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isActive: hasActiveSubscription } = useSubscription(user?.id);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  // Fetch model info
  const { data: model, isLoading: modelLoading } = useQuery({
    queryKey: ["past-exam-model", modelId],
    queryFn: async () => {
      const { data } = await supabase
        .from("past_exam_models")
        .select("id, title, year, is_paid, is_published, university_id")
        .eq("id", modelId!)
        .single();
      return data;
    },
    enabled: !!modelId,
  });

  // Check if this is the first (free) model for its university
  const { data: isFirstFreeModel } = useQuery({
    queryKey: ["is-first-free-model", model?.university_id, modelId],
    queryFn: async () => {
      if (!model?.university_id) return false;
      const { data: models } = await supabase
        .from("past_exam_models")
        .select("id, year")
        .eq("university_id", model.university_id)
        .eq("is_published", true)
        .order("year", { ascending: true })
        .limit(1);
      return models?.[0]?.id === modelId;
    },
    enabled: !!model?.university_id && !!modelId,
  });

  // Fetch questions
  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ["past-exam-model-questions", modelId],
    queryFn: async () => {
      const { data } = await supabase
        .from("past_exam_model_questions")
        .select("id, q_text, q_option_a, q_option_b, q_option_c, q_option_d, q_correct, q_explanation, order_index")
        .eq("model_id", modelId!)
        .not("q_text", "is", null)
        .order("order_index");
      return data || [];
    },
    enabled: !!modelId,
  });

  const isLoading = modelLoading || questionsLoading;
  const locked = !isFirstFreeModel && !hasActiveSubscription;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4" dir="rtl">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-32 w-full rounded-xl mt-4" />
        <div className="space-y-3 mt-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (locked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center px-6 space-y-4 max-w-xs">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Lock className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold">هذا النموذج متاح للمشتركين فقط</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">اشترك للوصول إلى جميع نماذج الأعوام السابقة والتدرّب عليها</p>
          <div className="flex flex-col gap-2.5 pt-2">
            <Button size="lg" className="w-full text-base" onClick={() => { trackSubscriptionClick("past_exams", { model_id: modelId, reason: "practice_locked" }); navigate("/subscription"); }}>اشترك الآن</Button>
            <Button variant="outline" size="lg" className="w-full" onClick={() => navigate("/past-exams")}>رجوع</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center px-6 space-y-3">
          <p className="text-muted-foreground">لا توجد أسئلة في هذا النموذج</p>
          <Button variant="outline" onClick={() => navigate("/past-exams")}>رجوع</Button>
        </div>
      </div>
    );
  }

  const question = questions[currentIndex];
  const total = questions.length;
  const progressPct = ((currentIndex + (revealed ? 1 : 0)) / total) * 100;
  const options = [
    { key: "a", text: question.q_option_a },
    { key: "b", text: question.q_option_b },
    { key: "c", text: question.q_option_c },
    { key: "d", text: question.q_option_d },
  ].filter((o) => o.text);

  const handleCheck = () => {
    if (!selectedOption) return;
    setRevealed(true);
    if (selectedOption === question.q_correct) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= total) {
      setFinished(true);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedOption(null);
    setRevealed(false);
  };

  if (finished) {
    const pct = Math.round((score / total) * 100);
    const isGood = pct >= 70;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center px-6 space-y-5 max-w-sm w-full">
          <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center ${isGood ? "bg-secondary/15" : "bg-primary/10"}`}>
            <Trophy className={`w-12 h-12 ${isGood ? "text-secondary" : "text-primary"}`} />
          </div>
          <div>
            <div className={`text-5xl font-bold ${isGood ? "text-secondary" : "text-primary"}`}>{pct}%</div>
            <p className="text-lg font-semibold mt-2">
              أجبت {score} من {total} بشكل صحيح
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{model?.title}</p>
          <div className="flex flex-col gap-2.5 pt-2">
            <Button size="lg" className="w-full text-base gap-2" onClick={() => { setCurrentIndex(0); setSelectedOption(null); setRevealed(false); setScore(0); setFinished(false); }}>
              <RotateCcw className="w-4 h-4" />
              أعد المحاولة
            </Button>
            <Button variant="outline" size="lg" className="w-full" onClick={() => navigate("/past-exams")}>
              رجوع للنماذج
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Sticky header with progress */}
      <header className="sticky top-0 z-30 bg-card border-b border-border">
        <div className="px-4 py-3 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="shrink-0 -mr-2" onClick={() => navigate("/past-exams")}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{model?.title}</p>
            </div>
            <Badge variant="outline" className="text-xs font-bold shrink-0 gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {score}/{currentIndex + (revealed ? 1 : 0)}
            </Badge>
          </div>
        </div>
        <Progress value={progressPct} className="h-1.5 rounded-none" />
      </header>

      {/* Question area */}
      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* Question number badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
              {currentIndex + 1}
            </span>
            <span className="text-sm font-medium text-muted-foreground">
              السؤال {currentIndex + 1} من {total}
            </span>
          </div>
        </div>

        {/* Question text */}
        <Card className="border-2">
          <CardContent className="p-5">
            <p className="text-base font-bold leading-[1.9] text-foreground">{question.q_text}</p>
          </CardContent>
        </Card>

        {/* Options */}
        <div className="space-y-3">
          {options.map((opt) => {
            const isCorrect = opt.key === question.q_correct;
            const isSelected = opt.key === selectedOption;

            let containerClass = "border-border bg-card hover:border-primary/40 active:scale-[0.98]";
            let labelBg = "bg-muted text-muted-foreground";
            let iconNode: React.ReactNode = null;

            if (revealed && isCorrect) {
              containerClass = "border-secondary bg-secondary/10";
              labelBg = "bg-secondary text-secondary-foreground";
              iconNode = <CheckCircle2 className="w-6 h-6 text-secondary shrink-0" />;
            } else if (revealed && isSelected && !isCorrect) {
              containerClass = "border-destructive bg-destructive/10";
              labelBg = "bg-destructive text-destructive-foreground";
              iconNode = <XCircle className="w-6 h-6 text-destructive shrink-0" />;
            } else if (revealed) {
              containerClass = "border-border bg-card opacity-60";
            } else if (isSelected) {
              containerClass = "border-primary bg-primary/5 ring-2 ring-primary/20";
              labelBg = "bg-primary text-primary-foreground";
            }

            return (
              <button
                key={opt.key}
                disabled={revealed}
                onClick={() => setSelectedOption(opt.key)}
                className={`w-full text-right rounded-2xl border-2 transition-all duration-150 flex items-center gap-3 p-4 min-h-[60px] ${containerClass}`}
              >
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${labelBg}`}>
                  {OPTION_LABELS[opt.key] || opt.key.toUpperCase()}
                </span>
                <span className="flex-1 text-[15px] leading-relaxed font-medium">{opt.text}</span>
                {iconNode}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {revealed && question.q_explanation && (
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-1.5">
              <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                💡 الشرح
              </p>
              <p className="text-sm text-foreground leading-[1.9]">{question.q_explanation}</p>
            </CardContent>
          </Card>
        )}

        {/* Action button — large, mobile-friendly */}
        <div className="pt-1 pb-6">
          {!revealed ? (
            <Button
              size="lg"
              className="w-full text-base h-14 rounded-2xl font-bold"
              disabled={!selectedOption}
              onClick={handleCheck}
            >
              تحقق من الإجابة
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full text-base h-14 rounded-2xl font-bold gap-2"
              onClick={handleNext}
            >
              {currentIndex + 1 >= total ? (
                <>عرض النتيجة <Trophy className="w-5 h-5" /></>
              ) : (
                <>السؤال التالي <ArrowLeft className="w-5 h-5" /></>
              )}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default PastExamPractice;
