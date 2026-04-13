import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, Loader2, Lock, TrendingUp, TrendingDown, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

interface ExamQuestion {
  id: string;
  question_text: string;
  subject: string;
  correct_option: string;
}

interface Props {
  questions: ExamQuestion[];
  answers: Record<string, string>;
  percentage: number;
  hasSubscription: boolean;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const AIPerformanceAnalysis = ({ questions, answers, percentage, hasSubscription }: Props) => {
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateAnalysis = async () => {
    if (!hasSubscription) {
      navigate("/subscription");
      return;
    }

    setLoading(true);
    try {
      // Build subject performance summary
      const subjectStats: Record<string, { correct: number; total: number }> = {};
      questions.forEach((q) => {
        const subj = q.subject || "general";
        if (!subjectStats[subj]) subjectStats[subj] = { correct: 0, total: 0 };
        subjectStats[subj].total++;
        if (answers[q.id] === q.correct_option) subjectStats[subj].correct++;
      });

      const subjectSummary = Object.entries(subjectStats)
        .map(([subj, stats]) => `${subj}: ${stats.correct}/${stats.total} (${Math.round((stats.correct / stats.total) * 100)}%)`)
        .join("\n");

      const wrongQuestions = questions
        .filter((q) => answers[q.id] !== q.correct_option)
        .slice(0, 5)
        .map((q) => q.question_text)
        .join("\n- ");

      const prompt = `حلل أداء الطالب في اختبار القبول الجامعي:

النتيجة الإجمالية: ${percentage}%

أداء حسب المادة:
${subjectSummary}

${wrongQuestions ? `أمثلة على أسئلة أخطأ فيها:\n- ${wrongQuestions}` : ""}

قدّم تحليلاً مختصراً يشمل:
1. **نقاط القوة** - المواد التي أبدع فيها
2. **نقاط الضعف** - المواد التي يحتاج تحسينها
3. **توصيات محددة** - خطوات عملية للتحسين
4. **تقييم عام** - جملة تحفيزية مع تقييم واقعي

كن مختصراً ومباشراً (أقل من 200 كلمة).`;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!resp.ok) {
        toast.error("حدث خطأ في تحليل الأداء");
        setLoading(false);
        return;
      }

      // Stream the response
      const reader = resp.body?.getReader();
      if (!reader) { setLoading(false); return; }
      const decoder = new TextDecoder();
      let buffer = "";
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              result += content;
              setAnalysis(result);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      setAnalysis(result);
    } catch {
      toast.error("حدث خطأ في الاتصال");
    }
    setLoading(false);
  };

  if (analysis) {
    return (
      <Card className="border-accent/30 bg-gradient-to-b from-accent/5 to-background">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-accent" />
            تحليل الأداء الذكي
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-accent/30 text-accent">
              <Sparkles className="w-2.5 h-2.5 ml-0.5" />
              AI
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="prose prose-sm dark:prose-invert max-w-none text-foreground [&>p]:my-1.5 [&>ul]:my-1 [&>ol]:my-1 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm">
            <ReactMarkdown>{analysis}</ReactMarkdown>
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-accent mt-2" />}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-accent/20">
      <CardContent className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              تحليل الأداء بالذكاء الاصطناعي
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-accent/30 text-accent">
                <Sparkles className="w-2.5 h-2.5 ml-0.5" />
                AI
              </Badge>
            </p>
            <p className="text-xs text-muted-foreground">
              {hasSubscription
                ? "اكتشف نقاط قوتك وضعفك مع توصيات مخصصة"
                : "اشترك لتحصل على تحليل ذكي لأدائك"}
            </p>
          </div>
        </div>
        <Button
          onClick={generateAnalysis}
          disabled={loading}
          className="w-full mt-3 gap-2"
          variant={hasSubscription ? "default" : "outline"}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> جارِ التحليل...</>
          ) : hasSubscription ? (
            <><Sparkles className="w-4 h-4" /> تحليل أدائي</>
          ) : (
            <><Lock className="w-4 h-4" /> فعّل الاشتراك للتحليل</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AIPerformanceAnalysis;
