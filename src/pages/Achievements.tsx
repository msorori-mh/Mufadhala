import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useContentFilter } from "@/hooks/useContentFilter";
import { useQuery } from "@tanstack/react-query";
import { achievements, type AchievementStats } from "@/data/achievements";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowRight, Award, Lock, CheckCircle2, Loader2 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const Achievements = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthContext();
  const { student, filter, isLoading: studentLoading } = useContentFilter(user?.id);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["achievement-stats", student?.id, filter?.value],
    queryFn: async (): Promise<AchievementStats> => {
      if (!student) return { totalExams: 0, avgScore: 0, bestScore: 0, completedLessons: 0, totalLessons: 0 };

      const [{ data: exams }, { data: lessons }, { data: progress }] = await Promise.all([
        supabase.from("exam_attempts").select("score, total")
          .eq("student_id", student.id).not("completed_at", "is", null),
        filter
          ? supabase.from("lessons").select("id").eq(filter.field, filter.value).eq("is_published", true)
          : Promise.resolve({ data: [] as any[] }),
        supabase.from("lesson_progress").select("id").eq("student_id", student.id).eq("is_completed", true),
      ]);

      const totalExams = exams?.length ?? 0;
      const avgScore = totalExams > 0
        ? Math.round(exams!.reduce((sum, a) => sum + (a.score / a.total) * 100, 0) / totalExams)
        : 0;
      const bestScore = totalExams > 0
        ? Math.round(Math.max(...exams!.map(a => (a.score / a.total) * 100)))
        : 0;

      return {
        totalExams,
        avgScore,
        bestScore,
        completedLessons: progress?.length ?? 0,
        totalLessons: lessons?.length ?? 0,
      };
    },
    enabled: !!student,
    staleTime: 2 * 60 * 1000,
  });

  const loading = authLoading || studentLoading || statsLoading;
  const safeStats = stats ?? { totalExams: 0, avgScore: 0, bestScore: 0, completedLessons: 0, totalLessons: 0 };

  const items = achievements.map((a) => ({ ...a, unlocked: a.check(safeStats) }));
  const unlockedCount = items.filter((i) => i.unlocked).length;
  const percentage = Math.round((unlockedCount / items.length) * 100);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="gradient-primary text-white px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            <span className="font-bold">الإنجازات</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20 hover:text-white">
              <Link to="/dashboard"><ArrowRight className="w-4 h-4 ml-1" />الرئيسية</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-5">
        {/* Overall Progress */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">نسبة الإنجاز الكلية</span>
              <span className="text-lg font-bold text-primary">{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-3" />
            <p className="text-xs text-muted-foreground">
              حصلت على {unlockedCount} من أصل {items.length} إنجاز
              {percentage === 100 ? " 🎉 أحسنت! أكملت جميع الإنجازات" : ""}
            </p>
          </CardContent>
        </Card>

        {/* Stats Summary */}
        {!loading && (
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "الاختبارات", value: stats.totalExams },
              { label: "المعدل", value: `${stats.avgScore}%` },
              { label: "الدروس", value: `${stats.completedLessons}/${stats.totalLessons}` },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-3">
                  <div className="text-lg font-bold text-foreground">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Achievement Cards */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.id}
                  className={`transition-all ${
                    item.unlocked ? "border-primary/20" : "opacity-60"
                  }`}
                >
                  <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                    {/* Icon */}
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 ${
                        item.unlocked ? item.bgColor : "bg-muted/50 grayscale"
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 ${
                          item.unlocked ? item.color : "text-muted-foreground"
                        }`}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">{item.title}</span>
                        {item.unlocked ? (
                          <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>

                    {/* Status */}
                    <div className="shrink-0">
                      {item.unlocked ? (
                        <span className="text-[10px] font-medium text-accent bg-accent/10 px-2 py-1 rounded-full">
                          مكتمل ✓
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded-full">
                          مقفل
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Achievements;
