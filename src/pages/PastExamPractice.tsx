import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock } from "lucide-react";
import { trackSubscriptionClick } from "@/lib/conversionTracking";
import { isPaymentUIEnabled } from "@/lib/platformGate";
import ModeSelector from "./past-exam/ModeSelector";
import TrainingMode from "./past-exam/TrainingMode";
import StrictMode from "./past-exam/StrictMode";
import type { PastExamMode } from "./past-exam/types";

const PastExamPractice = () => {
  const { modelId } = useParams<{ modelId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPaid: hasActiveSubscription } = useSubscription(user?.id);

  const [mode, setMode] = useState<PastExamMode>("select");
  const [customDurationMinutes, setCustomDurationMinutes] = useState<number | null>(null);

  // Fetch model info
  const { data: model, isLoading: modelLoading } = useQuery({
    queryKey: ["past-exam-model", modelId],
    queryFn: async () => {
      const { data } = await supabase
        .from("past_exam_models")
        .select("id, title, year, is_paid, is_published, university_id, duration_minutes, suggested_duration_minutes")
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
  const locked = !!model?.is_paid && !hasActiveSubscription;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-4" dir="rtl">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl mt-4" />
        <div className="space-y-3 mt-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (locked) {
    const paymentsVisible = isPaymentUIEnabled();
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center px-6 space-y-4 max-w-xs">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Lock className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold">
            {paymentsVisible ? "يتطلب اشتراك للوصول" : "هذا النموذج غير متاح في هذه النسخة"}
          </h2>
          {paymentsVisible && (
            <p className="text-sm text-muted-foreground leading-relaxed">اشترك للوصول إلى جميع نماذج الأعوام السابقة والتدرّب عليها</p>
          )}
          <div className="flex flex-col gap-2.5 pt-2">
            {paymentsVisible && (
              <Button size="lg" className="w-full text-base" onClick={() => { trackSubscriptionClick("past_exams", { model_id: modelId, reason: "practice_locked" }); navigate("/subscription"); }}>اشترك الآن</Button>
            )}
            <Button variant={paymentsVisible ? "outline" : "default"} size="lg" className="w-full" onClick={() => navigate("/past-exams")}>رجوع</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!model || !questions.length) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center px-6 space-y-3">
          <p className="text-muted-foreground">لا توجد أسئلة في هذا النموذج</p>
          <Button variant="outline" onClick={() => navigate("/past-exams")}>رجوع</Button>
        </div>
      </div>
    );
  }

  if (mode === "training") {
    return <TrainingMode model={model} questions={questions} onBackToSelect={() => setMode("select")} />;
  }

  if (mode === "strict_intro" || mode === "strict_active" || mode === "strict_finished") {
    return <StrictMode model={model} questions={questions} onBackToSelect={() => setMode("select")} customDurationMinutes={customDurationMinutes} />;
  }

  return (
    <ModeSelector
      model={model}
      totalQuestions={questions.length}
      isFreeModel={!model.is_paid}
      onSelectTraining={() => setMode("training")}
      onSelectStrict={(duration) => {
        setCustomDurationMinutes(duration ?? null);
        setMode("strict_intro");
      }}
    />
  );
};

export default PastExamPractice;
