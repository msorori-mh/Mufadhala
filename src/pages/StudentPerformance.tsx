import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ThemeToggle from "@/components/ThemeToggle";
import SubjectPerformanceDetail from "@/components/SubjectPerformanceDetail";
import {
  ChevronRight, Loader2, Trophy, TrendingUp,
  Target, Users, BookOpen, BarChart3, CheckCircle, XCircle,
  Flame, Award,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";

interface ExamRow {
  id: string; score: number; total: number;
  completed_at: string | null; major_id: string;
}

interface LessonRow {
  id: string; title: string; major_id: string;
}

interface QuestionRow {
  id: string; lesson_id: string; correct_option: string; subject: string;
}

const SUBJECT_LABELS: Record<string, string> = {
  biology: "أحياء", chemistry: "كيمياء", physics: "فيزياء",
  math: "رياضيات", english: "إنجليزي", iq: "ذكاء", general: "عام",
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
  borderRadius: "8px", color: "hsl(var(--foreground))", fontSize: "12px",
};

const StudentPerformance = () => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [, setStudentId] = useState<string | null>(null);
  const [majorId, setMajorId] = useState<string | null>(null);
  const [majorName, setMajorName] = useState("");
  const [attempts, setAttempts] = useState<ExamRow[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [peerAttempts, setPeerAttempts] = useState<{ score: number; total: number }[]>([]);

  useEffect(() => {
    if (authLoading || !user) return;
    const fetchAll = async () => {
      const { data: s } = await supabase.from("students").select("id, major_id").eq("user_id", user.id).maybeSingle();
      if (!s || !s.major_id) { setLoading(false); return; }
      setStudentId(s.id);
      setMajorId(s.major_id);

      const [{ data: major }, { data: exams }, { data: les }, { data: prog }, { data: peers }] = await Promise.all([
        supabase.from("majors").select("name_ar").eq("id", s.major_id).single(),
        supabase.from("exam_attempts").select("id, score, total, completed_at, major_id")
          .eq("student_id", s.id).not("completed_at", "is", null).order("completed_at", { ascending: true }),
        supabase.from("lessons").select("id, title, major_id").eq("major_id", s.major_id).eq("is_published", true).order("display_order"),
        supabase.from("lesson_progress").select("lesson_id").eq("student_id", s.id).eq("is_completed", true),
        supabase.from("exam_attempts").select("score, total, student_id")
          .eq("major_id", s.major_id).not("completed_at", "is", null),
      ]);

      if (major) setMajorName(major.name_ar);
      if (exams) setAttempts(exams);
      if (les) {
        setLessons(les as LessonRow[]);
        const lessonIds = les.map((l) => l.id);
        if (lessonIds.length > 0) {
          const { data: qs } = await supabase.from("questions").select("id, lesson_id, correct_option, subject").in("lesson_id", lessonIds);
          if (qs) setQuestions(qs as QuestionRow[]);
        }
      }
      if (prog) setCompletedLessonIds(new Set(prog.map((p) => p.lesson_id)));
      if (peers) setPeerAttempts(peers.filter((p) => (p as any).student_id !== s.id));

      setLoading(false);
    };
    fetchAll();
  }, [authLoading, user]);

  if (authLoading || loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!majorId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4 p-4">
        <p className="text-muted-foreground">أكمل ملفك الشخصي واختر تخصصك أولاً</p>
        <Button asChild><Link to="/profile">الملف الشخصي</Link></Button>
      </div>
    );
  }

  const myExams = attempts.filter((a) => a.major_id === majorId);
  const myAvg = myExams.length > 0 ? Math.round(myExams.reduce((s, e) => s + (e.score / e.total) * 100, 0) / myExams.length) : 0;
  const myBest = myExams.length > 0 ? Math.round(Math.max(...myExams.map((e) => (e.score / e.total) * 100))) : 0;
  const myWorst = myExams.length > 0 ? Math.round(Math.min(...myExams.map((e) => (e.score / e.total) * 100))) : 0;

  // Improvement trend
  const lastThree = myExams.slice(-3);
  const firstThree = myExams.slice(0, 3);
  const recentAvg = lastThree.length > 0 ? Math.round(lastThree.reduce((s, e) => s + (e.score / e.total) * 100, 0) / lastThree.length) : 0;
  const earlyAvg = firstThree.length > 0 ? Math.round(firstThree.reduce((s, e) => s + (e.score / e.total) * 100, 0) / firstThree.length) : 0;
  const improvement = recentAvg - earlyAvg;

  // Peer comparison
  const allScores = [...peerAttempts, ...myExams].map((e) => (e.score / e.total) * 100);
  const sortedScores = [...allScores].sort((a, b) => b - a);
  const myRank = sortedScores.length > 0 ? sortedScores.findIndex((s) => s <= myBest) + 1 : 0;
  const percentile = sortedScores.length > 0 ? Math.round(((sortedScores.length - myRank) / sortedScores.length) * 100) : 0;
  const peerAvg = peerAttempts.length > 0 ? Math.round(peerAttempts.reduce((s, e) => s + (e.score / e.total) * 100, 0) / peerAttempts.length) : 0;

  // Lesson completion
  const completionPct = lessons.length > 0 ? Math.round((completedLessonIds.size / lessons.length) * 100) : 0;

  // Score trend chart
  const trendData = myExams.map((e, i) => ({
    name: `${i + 1}`,
    score: Math.round((e.score / e.total) * 100),
    date: e.completed_at ? new Date(e.completed_at).toLocaleDateString("ar", { month: "short", day: "numeric" }) : "",
  }));

  // Score distribution
  const distribution = [
    { range: "ضعيف\n0-40", count: 0, fill: "hsl(var(--destructive))" },
    { range: "مقبول\n41-60", count: 0, fill: "hsl(var(--warning, var(--accent)))" },
    { range: "جيد\n61-80", count: 0, fill: "hsl(var(--primary))" },
    { range: "ممتاز\n81-100", count: 0, fill: "hsl(var(--success, 142 76% 36%))" },
  ];
  myExams.forEach(a => {
    const pct = (a.score / a.total) * 100;
    if (pct <= 40) distribution[0].count++;
    else if (pct <= 60) distribution[1].count++;
    else if (pct <= 80) distribution[2].count++;
    else distribution[3].count++;
  });

  // Completion pie data
  const pieData = [
    { name: "مكتمل", value: completedLessonIds.size },
    { name: "متبقي", value: Math.max(0, lessons.length - completedLessonIds.size) },
  ];

  // Subject-based radar chart data (using question subjects from exam answers)
  const subjectPerformance = (() => {
    const subjectStats: Record<string, { correct: number; total: number }> = {};
    // Analyze all exam attempts answers against questions
    attempts.forEach((a) => {
      if (!a.completed_at) return;
      const answerData = (a as any).answers;
      if (!Array.isArray(answerData)) return;
      answerData.forEach((ans: any) => {
        if (!ans.question_id || !ans.selected) return;
        const q = questions.find((qq) => qq.id === ans.question_id);
        if (!q) return;
        const subj = q.subject || "general";
        if (!subjectStats[subj]) subjectStats[subj] = { correct: 0, total: 0 };
        subjectStats[subj].total++;
        if (ans.selected === q.correct_option) subjectStats[subj].correct++;
      });
    });
    return subjectStats;
  })();

  const radarData = Object.entries(subjectPerformance)
    .filter(([, v]) => v.total >= 1)
    .map(([key, v]) => ({
      subject: SUBJECT_LABELS[key] || key,
      coverage: Math.round((v.correct / v.total) * 100),
      fullMark: 100,
    }));

  // If no subject data from answers, fallback to lesson-based radar
  const fallbackRadarData = radarData.length < 3 ? lessons.slice(0, 8).map((l) => {
    const qCount = questions.filter((q) => q.lesson_id === l.id).length;
    const isCompleted = completedLessonIds.has(l.id);
    return {
      subject: l.title.length > 10 ? l.title.slice(0, 8) + "…" : l.title,
      coverage: isCompleted ? 100 : qCount > 0 ? 50 : 0,
      fullMark: 100,
    };
  }) : radarData;

  const finalRadarData = radarData.length >= 3 ? radarData : fallbackRadarData;

  // Smart recommendations based on weakest subjects
  const recommendations = Object.entries(subjectPerformance)
    .filter(([, v]) => v.total >= 2)
    .map(([key, v]) => ({ subject: key, label: SUBJECT_LABELS[key] || key, pct: Math.round((v.correct / v.total) * 100) }))
    .sort((a, b) => a.pct - b.pct);

  // Performance level
  const getLevel = (avg: number) => {
    if (avg >= 90) return { label: "متميز", color: "text-green-600", icon: Award };
    if (avg >= 75) return { label: "جيد جداً", color: "text-primary", icon: Trophy };
    if (avg >= 60) return { label: "جيد", color: "text-accent", icon: TrendingUp };
    if (avg >= 40) return { label: "مقبول", color: "text-yellow-600", icon: Target };
    return { label: "يحتاج تحسين", color: "text-destructive", icon: Flame };
  };
  const level = getLevel(myAvg);

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-primary text-white px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            <span className="font-bold text-sm">تحليل الأداء</span>
          </div>
          <div className="flex gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20 hover:text-white">
              <Link to="/dashboard"><ChevronRight className="w-4 h-4" /></Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 pb-20 md:pb-4 space-y-4">
        {/* Header Info */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">تحليل أدائك</h1>
            <p className="text-sm text-muted-foreground">{majorName} • {myExams.length} اختبار</p>
          </div>
          {myExams.length > 0 && (
            <div className="flex items-center gap-1.5">
              <level.icon className={`w-5 h-5 ${level.color}`} />
              <span className={`text-sm font-bold ${level.color}`}>{level.label}</span>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3 text-center">
              <TrendingUp className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{myAvg}%</p>
              <p className="text-xs text-muted-foreground">المعدل العام</p>
            </CardContent>
          </Card>
          <Card className="bg-accent/5 border-accent/20">
            <CardContent className="p-3 text-center">
              <Trophy className="w-5 h-5 mx-auto text-accent mb-1" />
              <p className="text-2xl font-bold text-foreground">{myBest}%</p>
              <p className="text-xs text-muted-foreground">أفضل نتيجة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Target className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-2xl font-bold text-foreground">{myWorst}%</p>
              <p className="text-xs text-muted-foreground">أدنى نتيجة</p>
            </CardContent>
          </Card>
          <Card className={improvement > 0 ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900" : ""}>
            <CardContent className="p-3 text-center">
              <Flame className={`w-5 h-5 mx-auto mb-1 ${improvement > 0 ? "text-green-600" : "text-muted-foreground"}`} />
              <p className={`text-2xl font-bold ${improvement > 0 ? "text-green-600" : improvement < 0 ? "text-destructive" : "text-foreground"}`}>
                {improvement > 0 ? `+${improvement}` : improvement}%
              </p>
              <p className="text-xs text-muted-foreground">التحسن</p>
            </CardContent>
          </Card>
        </div>

        {/* Lesson Completion Ring + Progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> تقدم الدروس
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={28} outerRadius={40}
                      dataKey="value" startAngle={90} endAngle={-270}
                      strokeWidth={0}
                    >
                      <Cell fill="hsl(var(--primary))" />
                      <Cell fill="hsl(var(--muted))" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <p className="text-center -mt-14 text-lg font-bold text-foreground">{completionPct}%</p>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المكتمل</span>
                  <span className="font-semibold text-foreground">{completedLessonIds.size} من {lessons.length}</span>
                </div>
                <Progress value={completionPct} className="h-2.5" />
                <p className="text-xs text-muted-foreground">
                  {completionPct === 100 ? "🎉 أكملت جميع الدروس!" : `${lessons.length - completedLessonIds.size} درس متبقي`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Charts */}
        {myExams.length > 0 && (
          <Tabs defaultValue="trend" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="trend" className="text-xs">تطور النتائج</TabsTrigger>
              <TabsTrigger value="distribution" className="text-xs">التوزيع</TabsTrigger>
              <TabsTrigger value="coverage" className="text-xs">المواد</TabsTrigger>
            </TabsList>

            {/* Score Trend */}
            <TabsContent value="trend">
              <Card>
                <CardContent className="pt-4">
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "النتيجة"]} />
                        <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2.5}
                          fill="url(#scoreGradient)" dot={{ r: 4, fill: "hsl(var(--primary))" }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  {myExams.length >= 3 && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      {improvement > 0 ? `📈 تحسن بمقدار ${improvement}% في آخر 3 محاولات` :
                       improvement < 0 ? `📉 تراجع بمقدار ${Math.abs(improvement)}% في آخر 3 محاولات` :
                       "➡️ مستوى ثابت في آخر المحاولات"}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Score Distribution */}
            <TabsContent value="distribution">
              <Card>
                <CardContent className="pt-4">
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="range" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" name="عدد المحاولات" radius={[6, 6, 0, 0]}>
                          {distribution.map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Subject Performance Radar */}
            <TabsContent value="coverage">
              <Card>
                <CardContent className="pt-4">
                  {finalRadarData.length >= 3 ? (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={finalRadarData}>
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                          <Radar name="مستواك" dataKey="coverage" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-8">تحتاج بيانات أكثر لعرض الرسم</p>
                  )}

                  {/* Smart recommendations */}
                  {recommendations.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">توصيات ذكية:</p>
                      {recommendations.slice(0, 3).map((r) => (
                        <div key={r.subject} className={`flex items-center justify-between text-sm p-2 rounded-lg ${r.pct < 50 ? "bg-destructive/5" : r.pct < 70 ? "bg-accent/5" : "bg-green-50 dark:bg-green-950/20"}`}>
                          <span className="text-foreground">{r.label}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={r.pct < 50 ? "destructive" : r.pct < 70 ? "secondary" : "default"} className="text-xs">{r.pct}%</Badge>
                            {r.pct < 50 && <span className="text-xs text-destructive">⚠️ يحتاج مراجعة</span>}
                          </div>
                        </div>
                      ))}
                      {recommendations[0]?.pct < 60 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          📚 ننصحك بمراجعة مادة <strong>{recommendations[0].label}</strong> — مستواك فيها ({recommendations[0].pct}%) يحتاج تحسين
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Peer Comparison */}
        {peerAttempts.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> مقارنة بالزملاء
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">ترتيبك المئوي</span>
                <Badge variant="outline" className="text-primary font-bold">
                  أفضل من {percentile}%
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-primary/5 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-primary">{myAvg}%</p>
                  <p className="text-xs text-muted-foreground">معدلك</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-muted-foreground">{peerAvg}%</p>
                  <p className="text-xs text-muted-foreground">متوسط الزملاء</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-12">أنت</span>
                  <Progress value={myAvg} className="h-2.5 flex-1" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-12">الزملاء</span>
                  <Progress value={peerAvg} className="h-2.5 flex-1 [&>div]:bg-muted-foreground" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {myAvg > peerAvg ? "🎉 أداؤك أعلى من المتوسط! واصل التميز" :
                 myAvg === peerAvg ? "👍 أداؤك مساوٍ للمتوسط" :
                 "📚 أداؤك أقل من المتوسط، ركّز على المراجعة"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Lesson Completion List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" /> حالة إكمال الدروس
              </span>
              <span className="text-xs font-normal text-muted-foreground">{completedLessonIds.size}/{lessons.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {lessons.map((l) => {
              const done = completedLessonIds.has(l.id);
              const qCount = questions.filter((q) => q.lesson_id === l.id).length;
              return (
                <div key={l.id} className={`flex items-center justify-between text-sm p-2 rounded-lg ${done ? "bg-green-50 dark:bg-green-950/20" : "bg-muted/50"}`}>
                  <div className="flex items-center gap-2 truncate max-w-[65%]">
                    {done ? <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                    <span className="text-foreground truncate">{l.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{qCount} سؤال</span>
                    <Badge variant={done ? "default" : "outline"} className="text-xs">
                      {done ? "✓" : "—"}
                    </Badge>
                  </div>
                </div>
              );
            })}
            {lessons.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">لا توجد دروس</p>}
          </CardContent>
        </Card>

        {myExams.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">لم تقم بأي اختبار بعد</p>
            <Button asChild className="mt-3"><Link to="/exam">ابدأ اختباراً</Link></Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentPerformance;
