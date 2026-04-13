import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rocket, Star, Lock } from "lucide-react";

interface Props {
  completedLessons: number;
  totalLessons: number;
}

const UpgradeCTABanner = ({ completedLessons, totalLessons }: Props) => {
  // Only show after student has engaged with 2+ lessons
  if (completedLessons < 2) return null;

  const lockedCount = Math.max(0, totalLessons - 3); // approximate locked lessons

  return (
    <Card className="border-primary/30 bg-gradient-to-l from-primary/5 via-primary/10 to-primary/5 overflow-hidden relative">
      <CardContent className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Rocket className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">
              أنت على الطريق الصحيح! 🎯
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              أكملت {completedLessons} دروس — فعّل اشتراكك للوصول إلى {lockedCount}+ درس إضافي وبنك الأسئلة الكامل
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Button size="sm" asChild className="flex-1 gap-1.5">
            <Link to="/subscription">
              <Star className="w-3.5 h-3.5" />
              فعّل الاشتراك
            </Link>
          </Button>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span>أكثر من 10,000 طالب يستخدمون المنصة</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UpgradeCTABanner;
