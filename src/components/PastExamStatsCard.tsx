import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, Trophy, Timer, Target } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  studentId: string | undefined;
}

const PastExamStatsCard = ({ studentId }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["past-exam-attempts-stats", studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const { data: attempts } = await supabase
        .from("past_exam_attempts")
        .select("id, mode, score, total, blank_count, elapsed_seconds, completed_at, model_id")
        .eq("student_id", studentId)
        .order("completed_at", { ascending: false })
        .limit(20);

      if (!attempts || attempts.length === 0) return { attempts: [], models: new Map() };

      const modelIds = Array.from(new Set(attempts.map((a) => a.model_id)));
      const { data: models } = await supabase
        .from("past_exam_models")
        .select("id, title, year")
        .in("id", modelIds);

      const modelMap = new Map((models || []).map((m) => [m.id, m]));
      return { attempts, models: modelMap };
    },
    enabled: !!studentId,
    staleTime: 60 * 1000,
  });

  if (isLoading || !data || data.attempts.length === 0) return null;

  type AttemptRow = {
    id: string;
    mode: string;
    score: number;
    total: number;
    blank_count: number;
    elapsed_seconds: number;
    completed_at: string;
    model_id: string;
  };
  const attempts = data.attempts as AttemptRow[];
  const models = data.models as Map<string, { id: string; title: string; year: number }>;
  const strictAttempts = attempts.filter((a) => a.mode === "strict");
  const trainingAttempts = attempts.filter((a) => a.mode === "training");
  const totalAttempts = attempts.length;
  const avgPct = Math.round(
    attempts.reduce((sum: number, a) => sum + (a.total > 0 ? (a.score / a.total) * 100 : 0), 0) / totalAttempts
  );
  const bestPct = Math.round(
    Math.max(...attempts.map((a) => (a.total > 0 ? (a.score / a.total) * 100 : 0)))
  );
  const recent = attempts.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> نماذج الأعوام السابقة
          </span>
          <Badge variant="outline" className="text-xs">{totalAttempts} محاولة</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-primary/5 rounded-lg p-2.5 text-center">
            <Trophy className="w-4 h-4 mx-auto text-primary mb-1" />
            <p className="text-base font-bold text-primary">{avgPct}%</p>
            <p className="text-[10px] text-muted-foreground">المعدل</p>
          </div>
          <div className="bg-secondary/10 rounded-lg p-2.5 text-center">
            <Target className="w-4 h-4 mx-auto text-secondary mb-1" />
            <p className="text-base font-bold text-secondary">{bestPct}%</p>
            <p className="text-[10px] text-muted-foreground">الأفضل</p>
          </div>
          <div className="bg-muted rounded-lg p-2.5 text-center">
            <Timer className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
            <p className="text-base font-bold text-foreground">{strictAttempts.length}</p>
            <p className="text-[10px] text-muted-foreground">صارم</p>
          </div>
        </div>

        {/* Mode split */}
        <div className="flex gap-2 text-[11px]">
          <Badge variant="secondary" className="gap-1">📚 تدريب: {trainingAttempts.length}</Badge>
          <Badge variant="destructive" className="gap-1">⏱️ صارم: {strictAttempts.length}</Badge>
        </div>

        {/* Recent attempts */}
        <div className="space-y-1.5 pt-1">
          <p className="text-xs font-semibold text-muted-foreground">آخر المحاولات</p>
          {recent.map((a) => {
            const m = models.get(a.model_id);
            const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
            const isGood = pct >= 70;
            return (
              <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{m?.title || "نموذج محذوف"}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                      {a.mode === "strict" ? "صارم" : "تدريب"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {a.score}/{a.total}
                      {a.blank_count > 0 && ` · ${a.blank_count} فارغ`}
                    </span>
                  </div>
                </div>
                <div className={`text-sm font-bold ${isGood ? "text-secondary" : pct >= 50 ? "text-primary" : "text-destructive"}`}>
                  {pct}%
                </div>
              </div>
            );
          })}
        </div>

        <Link
          to="/past-exams"
          className="block text-center text-xs text-primary font-semibold pt-1 hover:underline"
        >
          استعراض جميع النماذج ←
        </Link>
      </CardContent>
    </Card>
  );
};

export default PastExamStatsCard;
