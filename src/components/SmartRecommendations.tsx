import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, TrendingDown, TrendingUp, BookOpen, Target, Sparkles } from "lucide-react";

interface ExamAttempt {
  id: string;
  score: number;
  total: number;
  completed_at: string | null;
  major_id: string;
  answers?: any;
}

interface Props {
  attempts: ExamAttempt[];
  completedLessons: number;
  totalLessons: number;
  hasSubscription: boolean;
}

const SUBJECT_LABELS: Record<string, string> = {
  biology: "أحياء",
  chemistry: "كيمياء",
  physics: "فيزياء",
  math: "رياضيات",
  english: "إنجليزي",
  iq: "ذكاء",
  general: "عام",
};

const SmartRecommendations = ({ attempts, completedLessons, totalLessons, hasSubscription }: Props) => {
  const recommendations = useMemo(() => {
    const recs: { icon: typeof Brain; title: string; desc: string; action: string; path: string; priority: number }[] = [];

    // No data yet
    if (attempts.length === 0 && completedLessons === 0) {
      return [{
        icon: BookOpen,
        title: "ابدأ بأول درس",
        desc: "ابدأ بمراجعة الدروس لتبني أساساً قوياً قبل الاختبار",
        action: "عرض الدروس",
        path: "/lessons",
        priority: 1,
      }];
    }

    // Analyze exam performance by subject
    if (attempts.length > 0) {
      const subjectScores: Record<string, { correct: number; total: number }> = {};

      attempts.forEach((a) => {
        if (a.answers && typeof a.answers === "object") {
          // Try parsing detailed answers if available
          const answers = a.answers as Record<string, any>;
          Object.values(answers).forEach((ans: any) => {
            if (ans?.subject) {
              if (!subjectScores[ans.subject]) subjectScores[ans.subject] = { correct: 0, total: 0 };
              subjectScores[ans.subject].total++;
              if (ans.correct) subjectScores[ans.subject].correct++;
            }
          });
        }
      });

      // Find weak subjects (< 50% accuracy)
      const weakSubjects = Object.entries(subjectScores)
        .map(([subject, data]) => ({
          subject,
          accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
          total: data.total,
        }))
        .filter((s) => s.accuracy < 50 && s.total >= 3)
        .sort((a, b) => a.accuracy - b.accuracy);

      if (weakSubjects.length > 0) {
        const weakest = weakSubjects[0];
        recs.push({
          icon: TrendingDown,
          title: `ركّز على ${SUBJECT_LABELS[weakest.subject] || weakest.subject}`,
          desc: `معدلك في هذه المادة ${weakest.accuracy}% — راجع الدروس المتعلقة بها`,
          action: "مراجعة الدروس",
          path: "/lessons",
          priority: 1,
        });
      }

      // Overall performance trend
      const recent = attempts.slice(-3);
      const early = attempts.slice(0, 3);
      if (recent.length >= 2 && early.length >= 2) {
        const recentAvg = recent.reduce((s, a) => s + (a.score / a.total) * 100, 0) / recent.length;
        const earlyAvg = early.reduce((s, a) => s + (a.score / a.total) * 100, 0) / early.length;
        if (recentAvg > earlyAvg + 5) {
          recs.push({
            icon: TrendingUp,
            title: "أداؤك في تحسّن! 📈",
            desc: `تحسّنت بنسبة ${Math.round(recentAvg - earlyAvg)}% — واصل التدريب`,
            action: "اختبار جديد",
            path: "/exam",
            priority: 3,
          });
        }
      }

      // Last exam score low → suggest more practice
      const lastExam = attempts[attempts.length - 1];
      const lastPct = Math.round((lastExam.score / lastExam.total) * 100);
      if (lastPct < 60) {
        recs.push({
          icon: Target,
          title: "تحتاج مزيداً من التدريب",
          desc: `نتيجتك الأخيرة ${lastPct}% — راجع الدروس ثم أعد الاختبار`,
          action: "مراجعة الدروس",
          path: "/lessons",
          priority: 2,
        });
      }
    }

    // Lesson completion
    if (totalLessons > 0 && completedLessons < totalLessons) {
      const remaining = totalLessons - completedLessons;
      const pct = Math.round((completedLessons / totalLessons) * 100);
      if (pct < 50) {
        recs.push({
          icon: BookOpen,
          title: `${remaining} درس لم تكملها بعد`,
          desc: "أكمل الدروس قبل خوض الاختبار لتحسين نتيجتك",
          action: "أكمل الدروس",
          path: "/lessons",
          priority: 2,
        });
      }
    }

    // Haven't taken exam yet but have lessons
    if (attempts.length === 0 && completedLessons >= 2) {
      recs.push({
        icon: Target,
        title: "جرّب اختبار المحاكاة",
        desc: "لقد أكملت بعض الدروس — اختبر مستواك الآن!",
        action: "ابدأ الاختبار",
        path: "/exam",
        priority: 1,
      });
    }

    return recs.sort((a, b) => a.priority - b.priority).slice(0, 2);
  }, [attempts, completedLessons, totalLessons]);

  if (recommendations.length === 0) return null;

  return (
    <Card className="border-accent/20 bg-accent/5">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="w-4 h-4 text-accent" />
          توصيات ذكية
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-accent/30 text-accent">
            <Sparkles className="w-2.5 h-2.5 ml-0.5" />
            AI
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-4 pb-3">
        {recommendations.map((rec, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-background border">
            <div className="w-8 h-8 rounded-md bg-accent/10 flex items-center justify-center shrink-0">
              <rec.icon className="w-4 h-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">{rec.title}</p>
              <p className="text-[10px] text-muted-foreground">{rec.desc}</p>
            </div>
            <Button size="sm" variant="outline" asChild className="shrink-0 text-xs h-7">
              <Link to={rec.path}>{rec.action}</Link>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default SmartRecommendations;
