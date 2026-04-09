import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp, TrendingDown, CheckCircle2, AlertTriangle,
  Sparkles, BookOpen, Target,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

interface SubjectStat {
  subject: string;
  label: string;
  correct: number;
  total: number;
  pct: number;
}

interface SubjectPerformanceDetailProps {
  subjectPerformance: Record<string, { correct: number; total: number }>;
  subjectLabels: Record<string, string>;
}

const STRENGTH_THRESHOLD = 70;
const WEAKNESS_THRESHOLD = 50;

const getSubjectLevel = (pct: number) => {
  if (pct >= 90) return { label: "متميز", variant: "default" as const, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" };
  if (pct >= 70) return { label: "جيد", variant: "secondary" as const, color: "text-primary", bg: "bg-primary/5 border-primary/20" };
  if (pct >= 50) return { label: "متوسط", variant: "outline" as const, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800" };
  return { label: "ضعيف", variant: "destructive" as const, color: "text-destructive", bg: "bg-destructive/5 border-destructive/20" };
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  color: "hsl(var(--foreground))",
  fontSize: "12px",
};

const SubjectPerformanceDetail = ({
  subjectPerformance,
  subjectLabels,
}: SubjectPerformanceDetailProps) => {
  const subjects: SubjectStat[] = Object.entries(subjectPerformance)
    .filter(([, v]) => v.total >= 1)
    .map(([key, v]) => ({
      subject: key,
      label: subjectLabels[key] || key,
      correct: v.correct,
      total: v.total,
      pct: Math.round((v.correct / v.total) * 100),
    }))
    .sort((a, b) => b.pct - a.pct);

  if (subjects.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">أكمل بعض الاختبارات لعرض تحليل أدائك حسب المواد</p>
        </CardContent>
      </Card>
    );
  }

  const strengths = subjects.filter((s) => s.pct >= STRENGTH_THRESHOLD);
  const weaknesses = subjects.filter((s) => s.pct < WEAKNESS_THRESHOLD);
  const overall = subjects.length > 0
    ? Math.round(subjects.reduce((sum, s) => sum + s.pct, 0) / subjects.length)
    : 0;

  const chartData = subjects.map((s) => ({
    name: s.label,
    score: s.pct,
    fill:
      s.pct >= 70
        ? "hsl(var(--primary))"
        : s.pct >= 50
        ? "hsl(var(--warning, 38 92% 50%))"
        : "hsl(var(--destructive))",
  }));

  return (
    <div className="space-y-4">
      {/* Overall Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            تحليل تفصيلي حسب المادة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">المتوسط العام للمواد</span>
            <span className="text-lg font-bold text-foreground">{overall}%</span>
          </div>
          <Progress value={overall} className="h-2.5" />

          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="flex items-center gap-1.5 text-sm">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-muted-foreground">نقاط القوة:</span>
              <span className="font-semibold text-green-600">{strengths.length}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <TrendingDown className="w-4 h-4 text-destructive" />
              <span className="text-muted-foreground">نقاط الضعف:</span>
              <span className="font-semibold text-destructive">{weaknesses.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart Comparison */}
      {subjects.length >= 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">مقارنة الأداء بين المواد</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "النسبة"]} />
                  <Bar dataKey="score" name="النسبة" radius={[0, 6, 6, 0]} barSize={20}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strengths Section */}
      {strengths.length > 0 && (
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              نقاط القوة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {strengths.map((s) => (
              <SubjectRow key={s.subject} stat={s} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Weaknesses Section */}
      {weaknesses.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              نقاط الضعف — تحتاج مراجعة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {weaknesses.map((s) => (
              <SubjectRow key={s.subject} stat={s} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* All subjects detail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            تفصيل كل مادة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {subjects.map((s) => {
            const level = getSubjectLevel(s.pct);
            return (
              <div key={s.subject} className={`p-3 rounded-lg border ${level.bg}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground">{s.label}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={level.variant} className="text-xs">{level.label}</Badge>
                    <span className={`text-lg font-bold ${level.color}`}>{s.pct}%</span>
                  </div>
                </div>
                <Progress value={s.pct} className="h-2 mb-1.5" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{s.correct} إجابة صحيحة من {s.total}</span>
                  <span>{s.total - s.correct} خطأ</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Smart Recommendations */}
      {weaknesses.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4 space-y-2">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              توصيات لتحسين أدائك
            </p>
            {weaknesses.slice(0, 3).map((s, i) => (
              <p key={s.subject} className="text-sm text-muted-foreground">
                {i + 1}. ركّز على مادة <strong className="text-foreground">{s.label}</strong> — مستواك الحالي {s.pct}%، تحتاج {STRENGTH_THRESHOLD - s.pct}% إضافية للوصول لمستوى جيد
              </p>
            ))}
            {strengths.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                ✅ أداؤك ممتاز في: {strengths.map((s) => s.label).join("، ")}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const SubjectRow = ({ stat }: { stat: SubjectStat }) => {
  const level = getSubjectLevel(stat.pct);
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">{stat.label}</span>
        <span className="text-xs text-muted-foreground">({stat.total} سؤال)</span>
      </div>
      <div className="flex items-center gap-2">
        <Progress value={stat.pct} className="h-2 w-16" />
        <span className={`text-sm font-bold min-w-[3ch] text-left ${level.color}`}>{stat.pct}%</span>
      </div>
    </div>
  );
};

export default SubjectPerformanceDetail;
