import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GraduationCap, ChevronLeft, Loader2, Trophy, Clock, CalendarDays } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

interface AttemptWithMajor {
  id: string;
  score: number;
  total: number;
  started_at: string;
  completed_at: string | null;
  major_id: string;
  major_name?: string;
}

const ExamHistory = () => {
  const { user, loading: authLoading } = useAuth();
  const [attempts, setAttempts] = useState<AttemptWithMajor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    const fetchData = async () => {
      const { data: s } = await supabase.from("students").select("id").eq("user_id", user.id).maybeSingle();
      if (!s) { setLoading(false); return; }

      const { data: exams } = await supabase
        .from("exam_attempts")
        .select("id, score, total, started_at, completed_at, major_id")
        .eq("student_id", s.id)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false });

      if (exams && exams.length > 0) {
        // Get major names
        const majorIds = [...new Set(exams.map(e => e.major_id))];
        const { data: majors } = await supabase.from("majors").select("id, name_ar").in("id", majorIds);
        const majorMap = new Map(majors?.map(m => [m.id, m.name_ar]) ?? []);

        setAttempts(exams.map(e => ({ ...e, major_name: majorMap.get(e.major_id) || "غير محدد" })));
      }
      setLoading(false);
    };
    fetchData();
  }, [authLoading, user]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ar-IQ", { year: "numeric", month: "short", day: "numeric" });
  };

  const formatDuration = (start: string, end: string) => {
    const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    return `${mins} دقيقة`;
  };

  const getScoreColor = (pct: number) => {
    if (pct >= 80) return "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400";
    if (pct >= 60) return "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400";
    if (pct >= 40) return "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400";
    return "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400";
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-primary text-white px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6" />
            <span className="text-lg font-bold">سجل الاختبارات</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20 hover:text-white">
              <Link to="/dashboard"><ChevronLeft className="w-4 h-4 ml-1" />الرئيسية</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">سجل الاختبارات السابقة</h1>
        <p className="text-sm text-muted-foreground mb-6">{attempts.length} محاولة مكتملة</p>

        {attempts.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">لم تقم بأي اختبار بعد</p>
            <Button asChild className="mt-4"><Link to="/exam">ابدأ اختباراً</Link></Button>
          </div>
        ) : (
          <div className="space-y-3">
            {attempts.map((a, i) => {
              const pct = Math.round((a.score / a.total) * 100);
              return (
                <Card key={a.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="py-4 px-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
                          {attempts.length - i}
                        </span>
                        <span className="font-semibold text-foreground text-sm">{a.major_name}</span>
                      </div>
                      <Badge className={`text-xs ${getScoreColor(pct)}`}>
                        {pct}%
                      </Badge>
                    </div>
                    <div className="mr-9 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5" />
                        {a.score}/{a.total}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {formatDate(a.completed_at!)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDuration(a.started_at, a.completed_at!)}
                      </span>
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

export default ExamHistory;
