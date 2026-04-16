import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Sparkles } from "lucide-react";

interface Props {
  percentage: number;
  totalQuestions: number;
  hasSubscription?: boolean;
}

const PostExamUpgrade = ({ percentage, totalQuestions, hasSubscription = false }: Props) => {
  const navigate = useNavigate();

  const handleCTA = () => {
    if (hasSubscription) {
      navigate("/past-exams");
    } else {
      navigate("/subscription");
    }
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-l from-primary/5 to-accent/5 overflow-hidden">
      <CardContent className="py-5 px-4 space-y-3">
        <div className="text-center">
          <h3 className="font-bold text-foreground">
            تحتاج تدريب أكثر 💡
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            للوصول إلى 80%، جرّب نماذج حقيقية
          </p>
        </div>

        <Button onClick={handleCTA} className="w-full gap-2">
          <Target className="w-4 h-4" />
          ابدأ التدريب الآن
        </Button>
      </CardContent>
    </Card>
  );
};

export default PostExamUpgrade;
