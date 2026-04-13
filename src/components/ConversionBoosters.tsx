import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, Shield, TrendingUp } from "lucide-react";

const ConversionBoosters = () => {
  // Urgency countdown — 48h from first visit
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const key = "promo_start";
    let start = localStorage.getItem(key);
    if (!start) {
      start = Date.now().toString();
      localStorage.setItem(key, start);
    }
    const deadline = parseInt(start) + 48 * 60 * 60 * 1000;

    const tick = () => {
      const diff = deadline - Date.now();
      if (diff <= 0) {
        setTimeLeft("");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h} ساعة و ${m} دقيقة`);
    };
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3">
      {/* Urgency */}
      {timeLeft && (
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/10 dark:border-orange-900/50">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                ⏰ عرض خاص لمدة 48 ساعة
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-500">
                باقي {timeLeft} على انتهاء العرض
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Social Proof + Trust */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border">
          <Users className="w-4 h-4 text-primary shrink-0" />
          <div>
            <p className="text-xs font-bold text-foreground">10,000+</p>
            <p className="text-[10px] text-muted-foreground">طالب يستخدم المنصة</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border">
          <TrendingUp className="w-4 h-4 text-green-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-foreground">85%</p>
            <p className="text-[10px] text-muted-foreground">حققوا تحسناً ملموساً</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border">
          <Shield className="w-4 h-4 text-blue-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-foreground">ضمان الجودة</p>
            <p className="text-[10px] text-muted-foreground">محتوى معتمد ودقيق</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border">
          <Clock className="w-4 h-4 text-accent shrink-0" />
          <div>
            <p className="text-xs font-bold text-foreground">تفعيل فوري</p>
            <p className="text-[10px] text-muted-foreground">بعد تأكيد الدفع</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversionBoosters;
