import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Brain, Sparkles, Loader2, CheckCircle2, XCircle,
  RotateCcw, ChevronDown, ChevronUp, Lock, AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useStudentAccess } from "@/hooks/useStudentAccess";

interface AIQuestion {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
}

// Map DB subject codes → generator subject keys (used in the edge function prompt)
const DB_CODE_TO_GENERATOR: Record<string, { value: string; label: string }> = {
  Bio: { value: "biology", label: "أحياء" },
  chemistry: { value: "chemistry", label: "كيمياء" },
  physics: { value: "physics", label: "فيزياء" },
  math: { value: "math", label: "رياضيات" },
  english: { value: "english", label: "إنجليزي" },
  computer: { value: "computer", label: "حاسوب" },
};

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "سهل", emoji: "🟢" },
  { value: "medium", label: "متوسط", emoji: "🟡" },
  { value: "hard", label: "صعب", emoji: "🔴" },
];

interface Props {
  hasSubscription: boolean;
}

const AIPracticeQuestions = ({ hasSubscription }: Props) => {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("biology");
  const [difficulty, setDifficulty] = useState("medium");
  const [questions, setQuestions] = useState<AIQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedExplanation, setExpandedExplanation] = useState<number | null>(null);

  const generate = async () => {
    if (!hasSubscription) {
      toast.error("هذه الميزة متاحة للمشتركين فقط");
      return;
    }

    setLoading(true);
    setQuestions([]);
    setAnswers({});
    setShowResults(false);

    try {
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: { subject, count: 5, difficulty },
      });

      if (error) {
        toast.error("حدث خطأ في توليد الأسئلة");
        console.error(error);
      } else if (data?.questions) {
        setQuestions(data.questions);
      } else {
        toast.error("لم يتم توليد أسئلة");
      }
    } catch {
      toast.error("حدث خطأ في الاتصال");
    }
    setLoading(false);
  };

  const selectAnswer = (qIndex: number, option: string) => {
    if (showResults) return;
    setAnswers((prev) => ({ ...prev, [qIndex]: option }));
  };

  const submitAnswers = () => {
    if (Object.keys(answers).length < questions.length) {
      toast.error("يرجى الإجابة على جميع الأسئلة");
      return;
    }
    setShowResults(true);
  };

  const score = showResults
    ? questions.filter((q, i) => answers[i] === q.correct_option).length
    : 0;
  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          مولّد الأسئلة الذكي
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary">
            <Sparkles className="w-2.5 h-2.5 ml-0.5" />
            AI
          </Badge>
          {!hasSubscription && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
              <Lock className="w-2.5 h-2.5 ml-0.5" />
              Premium
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {/* Generator controls */}
        {questions.length === 0 && !loading && (
          <>
            <p className="text-xs text-muted-foreground">
              اختر المادة ومستوى الصعوبة وسيقوم الذكاء الاصطناعي بتوليد أسئلة تدريبية مشابهة لاختبار المفاضلة
            </p>

            {/* Subject selection */}
            <div>
              <p className="text-xs font-semibold text-foreground mb-1.5">المادة</p>
              <div className="flex flex-wrap gap-1.5">
                {SUBJECT_OPTIONS.map((s) => (
                  <Badge
                    key={s.value}
                    variant={subject === s.value ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => setSubject(s.value)}
                  >
                    {s.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Difficulty selection */}
            <div>
              <p className="text-xs font-semibold text-foreground mb-1.5">المستوى</p>
              <div className="flex gap-1.5">
                {DIFFICULTY_OPTIONS.map((d) => (
                  <Badge
                    key={d.value}
                    variant={difficulty === d.value ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => setDifficulty(d.value)}
                  >
                    {d.emoji} {d.label}
                  </Badge>
                ))}
              </div>
            </div>

            {hasSubscription ? (
              <Button onClick={generate} className="w-full gap-2">
                <Sparkles className="w-4 h-4" />
                توليد 5 أسئلة
              </Button>
            ) : (
              <Button onClick={() => navigate("/subscription")} variant="outline" className="w-full gap-2">
                <Lock className="w-4 h-4" />
                فعّل الاشتراك لاستخدام المولّد
              </Button>
            )}
          </>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-2 py-6">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">جارِ توليد الأسئلة...</p>
          </div>
        )}

        {/* Results summary */}
        {showResults && (
          <Card className={percentage >= 60 ? "border-green-200 bg-green-50/50 dark:bg-green-950/10" : "border-orange-200 bg-orange-50/50 dark:bg-orange-950/10"}>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold text-foreground">{percentage}%</p>
              <p className="text-sm text-muted-foreground">{score} / {questions.length} إجابات صحيحة</p>
            </CardContent>
          </Card>
        )}

        {/* Questions */}
        {questions.length > 0 && (
          <div className="space-y-3">
            {questions.map((q, i) => {
              const userAnswer = answers[i];
              const isCorrect = showResults && userAnswer === q.correct_option;
              const isWrong = showResults && userAnswer && userAnswer !== q.correct_option;

              return (
                <Card key={i} className={`border-r-4 ${showResults ? (isCorrect ? "border-r-green-500" : isWrong ? "border-r-red-500" : "border-r-muted") : "border-r-primary/30"}`}>
                  <CardContent className="py-3 px-3">
                    <p className="text-sm font-medium mb-2">
                      {i + 1}. {q.question_text}
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {(["a", "b", "c", "d"] as const).map((opt) => {
                        const optText = q[`option_${opt}` as keyof AIQuestion] as string;
                        const isSelected = userAnswer === opt;
                        const isCorrectOpt = showResults && opt === q.correct_option;

                        let cls = "text-xs p-2 rounded-lg border cursor-pointer transition-colors text-right";
                        if (showResults) {
                          if (isCorrectOpt) cls += " border-green-500 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400";
                          else if (isSelected && !isCorrectOpt) cls += " border-red-500 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400";
                          else cls += " opacity-50";
                        } else {
                          cls += isSelected ? " border-primary bg-primary/10" : " hover:border-primary/50";
                        }

                        return (
                          <button key={opt} className={cls} onClick={() => selectAnswer(i, opt)}>
                            <span className="font-semibold ml-1">{opt})</span> {optText}
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanation toggle */}
                    {showResults && (
                      <button
                        onClick={() => setExpandedExplanation(expandedExplanation === i ? null : i)}
                        className="flex items-center gap-1 text-[10px] text-primary mt-2 hover:underline"
                      >
                        {expandedExplanation === i ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {expandedExplanation === i ? "إخفاء الشرح" : "عرض الشرح"}
                      </button>
                    )}
                    {expandedExplanation === i && (
                      <p className="text-[11px] text-muted-foreground mt-1.5 p-2 bg-muted rounded-md">
                        {q.explanation}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Actions */}
            <div className="flex gap-2">
              {!showResults ? (
                <Button onClick={submitAnswers} className="flex-1">
                  <CheckCircle2 className="w-4 h-4 ml-1" />
                  تحقق من الإجابات
                </Button>
              ) : (
                <Button onClick={() => { setQuestions([]); setAnswers({}); setShowResults(false); }} className="flex-1">
                  <RotateCcw className="w-4 h-4 ml-1" />
                  أسئلة جديدة
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIPracticeQuestions;
