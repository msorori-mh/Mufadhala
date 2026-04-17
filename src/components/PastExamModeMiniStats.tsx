import { TrendingUp, Trophy, Target, Lock } from "lucide-react";
import type { ModeAttemptStats } from "@/lib/pastExamAttempts";

interface Props {
  stats: ModeAttemptStats;
  variant: "training" | "strict";
  loading?: boolean;
  /** Whether the student has a paid subscription (excludes trial) */
  isPaid?: boolean;
  /** Whether this model is the free sample for its university */
  isFreeModel?: boolean;
}

/**
 * Mini sparkline + summary chip showing the student's previous performance
 * for a specific mode on this past-exam model. Helps the student decide
 * which mode to pick based on their own history.
 */
const PastExamModeMiniStats = ({ stats, variant, loading, isPaid, isFreeModel }: Props) => {
  const colorClass = variant === "training" ? "text-secondary" : "text-destructive";
  const bgClass = variant === "training" ? "bg-secondary/10" : "bg-destructive/10";
  const borderClass = variant === "training" ? "border-secondary/30" : "border-destructive/30";
  const strokeColor = variant === "training" ? "hsl(var(--secondary))" : "hsl(var(--destructive))";

  // Free attempt is "used" when: student is not paid, this is a free sample model,
  // and they have at least one attempt on this mode.
  const freeAttemptUsed = !isPaid && isFreeModel && stats.attempts >= 1;

  if (loading) {
    return (
      <div className={`rounded-lg border ${borderClass} ${bgClass} p-2.5 animate-pulse`}>
        <div className="h-3 bg-muted rounded w-1/2 mb-2" />
        <div className="h-6 bg-muted rounded" />
      </div>
    );
  }

  if (stats.attempts === 0) {
    return (
      <div className={`rounded-lg border border-dashed ${borderClass} ${bgClass} p-2.5 text-center`}>
        <p className="text-[10px] text-muted-foreground">
          لم تُجرب هذا الوضع بعد · ستظهر هنا إحصائياتك بعد أول محاولة
        </p>
      </div>
    );
  }

  // Build sparkline path
  const pts = stats.lastPcts;
  const w = 100;
  const h = 24;
  const stepX = pts.length > 1 ? w / (pts.length - 1) : w;
  const path = pts
    .map((v, i) => {
      const x = i * stepX;
      const y = h - (v / 100) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className={`rounded-lg border ${borderClass} ${bgClass} p-2.5 space-y-2`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`text-[10px] font-bold ${colorClass} flex items-center gap-1`}>
          <TrendingUp className="w-3 h-3" />
          أداؤك السابق
        </p>
        <span className="text-[10px] text-muted-foreground">
          {stats.attempts} محاولة
        </span>
      </div>

      <div className="flex items-end gap-2.5">
        {/* Sparkline */}
        {pts.length > 1 ? (
          <svg
            viewBox={`0 0 ${w} ${h}`}
            className="flex-1 h-7"
            preserveAspectRatio="none"
            aria-label="رسم بياني لآخر المحاولات"
          >
            <path
              d={path}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {pts.map((v, i) => {
              const x = i * stepX;
              const y = h - (v / 100) * h;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="2"
                  fill={strokeColor}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>
        ) : (
          <div className="flex-1 h-7 flex items-center">
            <span className={`text-[11px] font-bold ${colorClass}`}>محاولة واحدة</span>
          </div>
        )}

        {/* Summary chips */}
        <div className="flex gap-1.5 shrink-0">
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground flex items-center gap-0.5 justify-center">
              <Target className="w-2.5 h-2.5" />
              متوسط
            </p>
            <p className={`text-xs font-bold ${colorClass} tabular-nums`}>{stats.avgPct}%</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-muted-foreground flex items-center gap-0.5 justify-center">
              <Trophy className="w-2.5 h-2.5" />
              أفضل
            </p>
            <p className={`text-xs font-bold ${colorClass} tabular-nums`}>{stats.bestPct}%</p>
          </div>
        </div>
      </div>

      {/* Free-attempt-used warning chip */}
      {freeAttemptUsed && (
        <div className="flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 p-2 mt-1">
          <Lock className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
          <p className="text-[10px] leading-tight text-destructive">
            <span className="font-bold">المحاولة المجانية مستخدمة</span> · هذا النموذج هو عينتك المجانية. اشترك للوصول إلى جميع نماذج الأعوام السابقة بلا حدود.
          </p>
        </div>
      )}
    </div>
  );
};

export default PastExamModeMiniStats;
