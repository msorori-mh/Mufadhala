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
import { ArrowRight, CheckCircle2, XCircle, Lock } from "lucide-react";

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
        .select("id, title, year, is_paid, is_published")
        .eq("id", modelId!)
        .single();
      return data;
    },
    enabled: !!modelId,
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
  const locked = model?.is_paid && !hasActiveSubscription;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4" dir="rtl">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (locked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center px-6 space-y-4">
          <Lock className="w-16 h-16 mx-auto text-muted-foreground" />
          <h2 className="text-lg font-bold">هذا النموذج متاح للمشتركين فقط</h2>
          <p className="text-sm text-muted-foreground">اشترك للوصول إلى جميع النماذج السابقة</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/subscription")}>اشترك الآن</Button>
            <Button variant="outline" onClick={() => navigate("/past-exams")}>رجوع</Button>
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
  const progressPct = ((currentIndex + 1) / total) * 100;
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center px-6 space-y-4 max-w-sm">
          <div className="text-5xl font-bold text-primary">{pct}%</div>
          <p className="text-lg font-semibold">
            أجبت {score} من {total} بشكل صحيح
          </p>
          <p className="text-sm text-muted-foreground">{model?.title}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => { setCurrentIndex(0); setSelectedOption(null); setRevealed(false); setScore(0); setFinished(false); }}>
              أعد المحاولة
            </Button>
            <Button variant="outline" onClick={() => navigate("/past-exams")}>
              رجوع
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/past-exams")}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{model?.title}</p>
            <p className="text-xs text-muted-foreground">
              السؤال {currentIndex + 1} من {total}
            </p>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">{score}/{currentIndex + (revealed ? 1 : 0)}</Badge>
        </div>
        <Progress value={progressPct} className="h-1 mt-2 max-w-3xl mx-auto" />
      </header>

      {/* Question */}
      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-base font-semibold leading-relaxed">{question.q_text}</p>
          </CardContent>
        </Card>

        {/* Options */}
        <div className="space-y-2">
          {options.map((opt) => {
            const isCorrect = opt.key === question.q_correct;
            const isSelected = opt.key === selectedOption;
            let borderClass = "border-border";
            if (revealed && isCorrect) borderClass = "border-secondary bg-secondary/10";
            else if (revealed && isSelected && !isCorrect) borderClass = "border-destructive bg-destructive/10";
            else if (isSelected) borderClass = "border-primary bg-primary/5";

            return (
              <button
                key={opt.key}
                disabled={revealed}
                onClick={() => setSelectedOption(opt.key)}
                className={`w-full text-right p-4 rounded-xl border-2 transition-all ${borderClass} flex items-center gap-3`}
              >
                <span className="w-7 h-7 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold shrink-0">
                  {opt.key.toUpperCase()}
                </span>
                <span className="flex-1 text-sm">{opt.text}</span>
                {revealed && isCorrect && <CheckCircle2 className="w-5 h-5 text-secondary shrink-0" />}
                {revealed && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-destructive shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {revealed && question.q_explanation && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-xs font-bold text-primary mb-1">الشرح:</p>
              <p className="text-sm text-foreground leading-relaxed">{question.q_explanation}</p>
            </CardContent>
          </Card>
        )}

        {/* Action */}
        <div className="flex gap-3">
          {!revealed ? (
            <Button className="flex-1" disabled={!selectedOption} onClick={handleCheck}>
              تحقق من الإجابة
            </Button>
          ) : (
            <Button className="flex-1" onClick={handleNext}>
              {currentIndex + 1 >= total ? "عرض النتيجة" : "السؤال التالي"}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default PastExamPractice;
