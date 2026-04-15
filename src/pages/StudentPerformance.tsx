import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { resolveSubjectIds } from "@/lib/contentFilter";
import { useAuth } from "@/hooks/useAuth";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { useQuery } from "@tanstack/react-query";
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
  id: string; title: string; major_id: string; subject_id: string | null;
}

interface SubjectInfo {
  id: string; name_ar: string;
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
  const { student, filter, filterName, loading: studentLoading } = useStudentAccess();

  // Fetch all performance data using React Query
  const { data: perfData, isLoading: perfLoading } = useQuery({
    queryKey: ["performance-data", student?.id, student?.college_id],
    queryFn: async () => {
      if (!student || !student.college_id) return null;

      // Subject-based resolution via admission_tracks
      const { subjectIds } = await resolveSubjectIds(supabase, student.college_id);
      if (subjectIds.length === 0) return null;

      // Fetch deduplicated lessons + exams + progress + subjects in parallel
      const [{ data: exams }, lessonResult, { data: prog }, { data: peers }, { data: subjectsData }] = await Promise.all([
        supabase.from("exam_attempts").select("id, score, total, completed_at, major_id")
          .eq("student_id", student.id).not("completed_at", "is", null).order("completed_at", { ascending: true }),
        supabase.from("lessons").select("id, title, major_id, subject_id")
          .in("subject_id", subjectIds).eq("is_published", true).order("display_order"),
        supabase.from("lesson_progress").select("lesson_id").eq("student_id", student.id).eq("is_completed", true),
        filter?.type === "major"
          ? supabase.from("exam_attempts").select("score, total, student_id")
              .eq("major_id", filter.value).not("completed_at", "is", null)
          : Promise.resolve({ data: [] as any[] }),
        supabase.from("subjects").select("id, name_ar").in("id", subjectIds).eq("is_active", true).order("display_order"),
      ]);

      // Deduplicate lessons
      const seenTitles = new Set<string>();
      const uniqueLessons: LessonRow[] = [];
      (lessonResult.data || []).forEach((l: any) => {
        const key = `${l.title}::${l.subject_id}`;
        if (!seenTitles.has(key)) {
          seenTitles.add(key);
          uniqueLessons.push({ id: l.id, title: l.title, major_id: l.major_id, subject_id: l.subject_id });
        }
      });

      const lessonIds = uniqueLessons.map((l: any) => l.id);
      let questions: QuestionRow[] = [];
      if (lessonIds.length > 0) {
        const { data: qs } = await supabase.from("questions").select("id, lesson_id, correct_option, subject").in("lesson_id", lessonIds);
        if (qs) questions = qs as QuestionRow[];
      }

      return {
        attempts: (exams || []) as ExamRow[],
        lessons: uniqueLessons,
        questions,
        completedLessonIds: new Set((prog || []).map((p: any) => p.lesson_id)),
        peerAttempts: (peers || []).filter((p: any) => p.student_id !== student.id) as { score: number; total: number }[],
        subjects: (subjectsData || []) as SubjectInfo[],
      };
    },
    enabled: !!student && !!student.college_id,
    staleTime: 2 * 60 * 1000,
  });

  const loading = authLoading || studentLoading || perfLoading;
  const attempts = perfData?.attempts ?? [];
  const lessons = perfData?.lessons ?? [];
  const questions = perfData?.questions ?? [];
  const completedLessonIds = perfData?.completedLessonIds ?? new Set<string>();
  const peerAttempts = perfData?.peerAttempts ?? [];
  const subjects = perfData?.subjects ?? [];
  const filterId = filter?.value ?? null;
  const filterType = filter?.type ?? "major";

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");

  // Filtered lessons by subject
  const filteredLessons = selectedSubjectId === "all"
    ? lessons
    : lessons.filter(l => l.subject_id === selectedSubjectId);
  const filteredCompleted = filteredLessons.filter(l => completedLessonIds.has(l.id)).length;
  const filteredCompletionPct = filteredLessons.length > 0 ? Math.round((filteredCompleted / filteredLessons.length) * 100) : 0;

  if (authLoading || loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!filterId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4 p-4">
        <p className="text-muted-foreground">لا توجد بيانات أداء بعد</p>
        <Button asChild><Link to="/dashboard">العودة للرئيسية</Link></Button>
      </div>
    );
  }

  // Filter exams: only by major_id when filterType is "major"; otherwise show all student's exams
  const myExams = filterType === "major" ? attempts.filter((a) => a.major_id === filterId) : attempts;
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

      <div className="max-w-lg mx-auto p-4 md:pb-4 space-y-4">
        {/* Header Info */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">تحليل أدائك</h1>
            <p className="text-sm text-muted-foreground">{filterName} • {myExams.length} اختبار</p>
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
          <Tabs defaultValue="subjects" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="subjects" className="text-xs">تحليل المواد</TabsTrigger>
              <TabsTrigger value="trend" className="text-xs">تطور النتائج</TabsTrigger>
              <TabsTrigger value="distribution" className="text-xs">التوزيع</TabsTrigger>
            </TabsList>

            {/* Subject Performance Detail */}
            <TabsContent value="subjects">
              <SubjectPerformanceDetail
                subjectPerformance={subjectPerformance}
                subjectLabels={SUBJECT_LABELS}
              />
            </TabsContent>

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
              <span className="text-xs font-normal text-muted-foreground">{filteredCompleted}/{filteredLessons.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Subject filter chips */}
            {subjects.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={() => setSelectedSubjectId("all")}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedSubjectId === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  الكل ({completedLessonIds.size}/{lessons.length})
                </button>
                {subjects.map(s => {
                  const subLessons = lessons.filter(l => l.subject_id === s.id);
                  const subCompleted = subLessons.filter(l => completedLessonIds.has(l.id)).length;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSubjectId(s.id)}
                      className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        selectedSubjectId === s.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {s.name_ar} ({subCompleted}/{subLessons.length})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Progress bar for selected filter */}
            <div className="space-y-1">
              <Progress value={filteredCompletionPct} className="h-2" />
              <p className="text-xs text-muted-foreground text-left" dir="ltr">
                {filteredCompletionPct}%
              </p>
            </div>

            {/* Lesson list */}
            <div className="space-y-1.5">
              {filteredLessons.map((l) => {
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
              {filteredLessons.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">لا توجد دروس</p>}
            </div>
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
