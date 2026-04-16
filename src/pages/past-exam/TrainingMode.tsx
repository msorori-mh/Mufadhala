import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, CheckCircle2, XCircle, RotateCcw, Trophy, ArrowLeft } from "lucide-react";
import { OPTION_LABELS, type PastExamQuestion, type PastExamModelInfo } from "./types";

interface Props {
  model: PastExamModelInfo;
  questions: PastExamQuestion[];
  onBackToSelect: () => void;
}

const TrainingMode = ({ model, questions, onBackToSelect }: Props) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const total = questions.length;
  const question = questions[currentIndex];
  const progressPct = ((currentIndex + (revealed ? 1 : 0)) / total) * 100;
  const options = [
    { key: "a", text: question?.q_option_a },
    { key: "b", text: question?.q_option_b },
    { key: "c", text: question?.q_option_c },
    { key: "d", text: question?.q_option_d },
  ].filter((o) => o.text);

  const handleCheck = () => {
    if (!selectedOption) return;
    setRevealed(true);
    if (selectedOption === question.q_correct) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (currentIndex + 1 >= total) { setFinished(true); return; }
    setCurrentIndex((i) => i + 1);
    setSelectedOption(null);
    setRevealed(false);
  };

  const reset = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setRevealed(false);
    setScore(0);
    setFinished(false);
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
            <p className="text-lg font-semibold mt-2">أجبت {score} من {total} بشكل صحيح</p>
          </div>
          <p className="text-sm text-muted-foreground">{model.title}</p>
          <div className="flex flex-col gap-2.5 pt-2">
            <Button size="lg" className="w-full text-base gap-2" onClick={reset}>
              <RotateCcw className="w-4 h-4" />
              أعد المحاولة
            </Button>
            <Button variant="outline" size="lg" className="w-full" onClick={onBackToSelect}>
              تغيير الوضع
            </Button>
            <Button variant="ghost" size="lg" className="w-full" onClick={() => navigate("/past-exams")}>
              رجوع للنماذج
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-30 bg-card border-b border-border">
        <div className="px-4 py-3 max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="shrink-0 -mr-2" onClick={onBackToSelect}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{model.title}</p>
              <p className="text-[11px] text-muted-foreground">وضع التدريب</p>
            </div>
            <Badge variant="outline" className="text-xs font-bold shrink-0 gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {score}/{currentIndex + (revealed ? 1 : 0)}
            </Badge>
          </div>
        </div>
        <Progress value={progressPct} className="h-1.5 rounded-none" />
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
            {currentIndex + 1}
          </span>
          <span className="text-sm font-medium text-muted-foreground">السؤال {currentIndex + 1} من {total}</span>
        </div>

        <Card className="border-2">
          <CardContent className="p-5">
            <p className="text-base font-bold leading-[1.9] text-foreground">{question.q_text}</p>
          </CardContent>
        </Card>

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

        {revealed && question.q_explanation && (
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-1.5">
              <p className="text-xs font-bold text-primary flex items-center gap-1.5">💡 الشرح</p>
              <p className="text-sm text-foreground leading-[1.9]">{question.q_explanation}</p>
            </CardContent>
          </Card>
        )}

        <div className="pt-1 pb-6">
          {!revealed ? (
            <Button size="lg" className="w-full text-base h-14 rounded-2xl font-bold" disabled={!selectedOption} onClick={handleCheck}>
              تحقق من الإجابة
            </Button>
          ) : (
            <Button size="lg" className="w-full text-base h-14 rounded-2xl font-bold gap-2" onClick={handleNext}>
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

export default TrainingMode;
