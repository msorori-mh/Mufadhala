import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Target, Shield, TrendingUp, Flame, Star, Zap } from "lucide-react";

const ConversionBoosters = () => {
  const [recentCount, setRecentCount] = useState(0);

  // Simulate recent subscriber count (seeded random for consistency)
  useEffect(() => {
    const base = 480;
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const variation = (dayOfYear * 7 + 3) % 120;
    setRecentCount(base + variation);
  }, []);

  const motivationalMessages = [
    { icon: Flame, text: "الطلاب المشتركين حققوا نتائج أعلى بـ 40%", color: "text-orange-500" },
    { icon: Star, text: "تقييم 4.8/5 من الطلاب المشتركين", color: "text-yellow-500" },
    { icon: Zap, text: "محتوى محدّث لمفاضلة هذا العام", color: "text-primary" },
  ];

  const [currentMsg, setCurrentMsg] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMsg((p) => (p + 1) % motivationalMessages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const msg = motivationalMessages[currentMsg];
  const MsgIcon = msg.icon;

  return (
    <div className="space-y-3">
      {/* Urgency countdown */}
      {timeLeft && (
        <Card className="border-orange-200 bg-gradient-to-l from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 dark:border-orange-900/50">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shrink-0 shadow-md">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-orange-700 dark:text-orange-400">
                🔥 عرض خاص — ينتهي قريباً!
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-500">
                باقي على انتهاء العرض
              </p>
            </div>
            <div className="font-mono text-lg font-black text-red-600 dark:text-red-400 tabular-nums tracking-wider bg-white/60 dark:bg-black/20 rounded-lg px-3 py-1">
              {timeLeft}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly subscribers counter */}
      <Card className="border-green-200 bg-gradient-to-l from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-900/50">
        <CardContent className="py-3 px-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-md">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-green-700 dark:text-green-400">
              +{recentCount} طالب اشتركوا هذا الأسبوع
            </p>
            <p className="text-xs text-green-600 dark:text-green-500">
              انضم الآن ولا تفوّت الفرصة!
            </p>
          </div>
          <div className="flex -space-x-2 rtl:space-x-reverse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 border-2 border-white dark:border-background flex items-center justify-center">
                <span className="text-[10px] text-white font-bold">👤</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rotating motivational message */}
      <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10">
        <CardContent className="py-3 px-4 flex items-center gap-3 transition-all duration-500">
          <MsgIcon className={`w-5 h-5 shrink-0 ${msg.color}`} />
          <p className="text-sm font-semibold text-foreground">{msg.text}</p>
        </CardContent>
      </Card>

      {/* Trust & stats grid */}
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
