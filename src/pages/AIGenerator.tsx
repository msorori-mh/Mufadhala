import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import AIPracticeQuestions from "@/components/AIPracticeQuestions";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";

const AIGenerator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sub = useSubscription(user?.id);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          رجوع
        </Button>

        <AIPracticeQuestions hasSubscription={sub.isActive} />
      </div>
    </div>
  );
};

export default AIGenerator;
