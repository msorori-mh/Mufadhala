import { achievements, type AchievementStats } from "@/data/achievements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";

interface AchievementsBadgesProps {
  stats: AchievementStats;
}

const AchievementsBadges = ({ stats }: AchievementsBadgesProps) => {
  const items = achievements.map((a) => ({
    ...a,
    unlocked: a.check(stats),
  }));

  const unlockedCount = items.filter((i) => i.unlocked).length;

  if (stats.totalExams === 0 && stats.completedLessons === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            الإنجازات
          </span>
          <span className="text-xs font-normal text-muted-foreground">
            {unlockedCount}/{items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 sm:grid-cols-5 gap-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="flex flex-col items-center gap-1 group relative"
              >
                <div
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all ${
                    item.unlocked
                      ? `${item.bgColor} shadow-sm`
                      : "bg-muted/50 opacity-40 grayscale"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 sm:w-5.5 sm:h-5.5 ${
                      item.unlocked ? item.color : "text-muted-foreground"
                    }`}
                  />
                </div>
                <span
                  className={`text-[9px] sm:text-[10px] text-center leading-tight line-clamp-2 ${
                    item.unlocked ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}
                >
                  {item.title}
                </span>
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 pointer-events-none">
                  <div className="bg-popover text-popover-foreground text-[10px] rounded-lg px-2.5 py-1.5 shadow-lg border whitespace-nowrap">
                    {item.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AchievementsBadges;
