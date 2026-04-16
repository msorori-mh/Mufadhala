import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, BarChart3, Sparkles, Target, BookOpen } from "lucide-react";

interface Props {
  percentage: number;
  totalQuestions: number;
}

const PostExamUpgrade = ({ percentage, totalQuestions }: Props) => {
  const navigate = useNavigate();

  return (
    <Card className="border-primary/30 bg-gradient-to-l from-primary/5 to-accent/5 overflow-hidden">
      <CardContent className="py-5 px-4 space-y-4">
        <div className="text-center">
          <h3 className="font-bold text-foreground">
            افتح جميع النماذج ودرّب نفسك بشكل أقوى
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            اشترك الآن واحصل على تحليل أداء مفصّل وتدريب غير محدود
          </p>
        </div>

        {/* Locked features preview */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: BarChart3, label: "تحليل نقاط الضعف", desc: "اعرف أين تحتاج تحسين" },
            { icon: Target, label: "مقارنة بالزملاء", desc: "اعرف ترتيبك بينهم" },
            { icon: BookOpen, label: "جميع الدروس", desc: "محتوى تعليمي كامل" },
            { icon: Sparkles, label: "اختبارات غير محدودة", desc: "تدرب بلا حدود" },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-background/50 border border-border/50">
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <f.icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-foreground leading-tight">{f.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={() => navigate("/subscription")} className="w-full gap-2">
            <Sparkles className="w-4 h-4" />
            اشترك الآن
          </Button>
          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">✓ أكثر من 10,000 طالب</Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">✓ رفع فرص القبول</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PostExamUpgrade;
