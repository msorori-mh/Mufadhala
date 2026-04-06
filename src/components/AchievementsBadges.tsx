import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { achievements, type AchievementStats } from "@/data/achievements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";
import AchievementUnlockToast from "@/components/AchievementUnlockToast";

interface AchievementsBadgesProps {
  stats: AchievementStats;
}

const STORAGE_KEY = "qubool-unlocked-achievements";

function getSavedUnlocked(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveUnlocked(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

const AchievementsBadges = ({ stats }: AchievementsBadgesProps) => {
  const items = achievements.map((a) => ({
    ...a,
    unlocked: a.check(stats),
  }));

  const unlockedIds = items.filter((i) => i.unlocked).map((i) => i.id);
  const unlockedCount = unlockedIds.length;

  const [newlyUnlocked, setNewlyUnlocked] = useState<typeof items>([]);
  const [currentToast, setCurrentToast] = useState<(typeof items)[0] | null>(null);

  // Detect new achievements
  useEffect(() => {
    if (stats.totalExams === 0 && stats.completedLessons === 0) return;

    const saved = getSavedUnlocked();
    const fresh = items.filter((i) => i.unlocked && !saved.includes(i.id));

    if (fresh.length > 0) {
      setNewlyUnlocked(fresh);
      saveUnlocked(unlockedIds);
    }
  }, [stats.totalExams, stats.avgScore, stats.bestScore, stats.completedLessons, stats.totalLessons]);

  // Show toasts one by one
  useEffect(() => {
    if (newlyUnlocked.length > 0 && !currentToast) {
      setCurrentToast(newlyUnlocked[0]);
    }
  }, [newlyUnlocked, currentToast]);

  const handleToastDismiss = useCallback(() => {
    setCurrentToast(null);
    setNewlyUnlocked((prev) => prev.slice(1));
  }, []);

  if (stats.totalExams === 0 && stats.completedLessons === 0) return null;

  return (
    <>
      {currentToast && (
        <AchievementUnlockToast
          title={currentToast.title}
          description={currentToast.description}
          icon={currentToast.icon}
          color={currentToast.color}
          bgColor={currentToast.bgColor}
          onDismiss={handleToastDismiss}
        />
      )}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              الإنجازات
            </span>
            <Link to="/achievements" className="text-xs font-normal text-primary hover:underline">
              {unlockedCount}/{items.length} — عرض الكل
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 sm:grid-cols-5 gap-2">
            {items.map((item) => {
              const Icon = item.icon;
              const isNew = newlyUnlocked.some((n) => n.id === item.id) || currentToast?.id === item.id;
              return (
                <div
                  key={item.id}
                  className="flex flex-col items-center gap-1 group relative"
                >
                  <div
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all ${
                      item.unlocked
                        ? `${item.bgColor} shadow-sm ${isNew ? "animate-scale-in ring-2 ring-primary/40" : ""}`
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
    </>
  );
};

export default AchievementsBadges;
