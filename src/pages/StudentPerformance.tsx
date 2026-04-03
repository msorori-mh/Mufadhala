import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ThemeToggle from "@/components/ThemeToggle";
import {
  GraduationCap, ChevronRight, Loader2, Trophy, TrendingUp,
  Target, Users, BookOpen, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

interface ExamRow {
  id: string; score: number; total: number;
  completed_at: string | null; major_id: string;
}

interface LessonRow {
  id: string; title: string; major_id: string;
}

interface QuestionRow {
  id: string; lesson_id: string; correct_option: string;
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
  borderRadius: "8px", color: "hsl(var(--foreground))", fontSize: "12px",
};

const StudentPerformance = () => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);
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
        // Fetch questions for all lessons
        const lessonIds = les.map((l) => l.id);
        if (lessonIds.length > 0) {
          const { data: qs } = await supabase.from("questions").select("id, lesson_id, correct_option").in("lesson_id", lessonIds);
          if (qs) setQuestions(qs);
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

  // Peer comparison
  const allScores = [...peerAttempts, ...myExams].map((e) => (e.score / e.total) * 100);
  const sortedScores = allScores.sort((a, b) => b - a);
  const myRank = sortedScores.length > 0 ? sortedScores.findIndex((s) => s <= myBest) + 1 : 0;
  const percentile = sortedScores.length > 0 ? Math.round(((sortedScores.length - myRank) / sortedScores.length) * 100) : 0;
  const peerAvg = peerAttempts.length > 0 ? Math.round(peerAttempts.reduce((s, e) => s + (e.score / e.total) * 100, 0) / peerAttempts.length) : 0;

  // Per-lesson analysis (simulate from exam answers — we use question count as proxy)
  const lessonQuestionCount = lessons.map((l) => ({
    name: l.title.length > 15 ? l.title.slice(0, 13) + "…" : l.title,
    questions: questions.filter((q) => q.lesson_id === l.id).length,
    completed: completedLessonIds.has(l.id),
  })).filter((d) => d.questions > 0);

  // Radar chart data for lesson coverage
  const radarData = lessons.slice(0, 8).map((l) => {
    const qCount = questions.filter((q) => q.lesson_id === l.id).length;
    const isCompleted = completedLessonIds.has(l.id);
    return {
      subject: l.title.length > 10 ? l.title.slice(0, 8) + "…" : l.title,
      coverage: isCompleted ? 100 : qCount > 0 ? 50 : 0,
      fullMark: 100,
    };
  });

  const comparisonData = [
    { label: "أنت", avg: myAvg, best: myBest },
    { label: "الزملاء", avg: peerAvg, best: 0 },
  ];

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

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">تحليل أدائك</h1>
          <p className="text-sm text-muted-foreground">{majorName} • {myExams.length} اختبار</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold text-foreground">{myAvg}%</p>
              <p className="text-xs text-muted-foreground">معدلك</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="w-6 h-6 mx-auto text-accent mb-1" />
              <p className="text-2xl font-bold text-foreground">{myBest}%</p>
              <p className="text-xs text-muted-foreground">أفضل نتيجة</p>
            </CardContent>
          </Card>
        </div>

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
                <span className="text-sm text-muted-foreground">ترتيبك</span>
                <Badge variant="outline" className="text-primary font-bold">
                  أفضل من {percentile}% من الزملاء
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>معدلك</span>
                  <span className="font-semibold text-foreground">{myAvg}%</span>
                </div>
                <Progress value={myAvg} className="h-2.5" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>متوسط الزملاء</span>
                  <span className="font-semibold text-muted-foreground">{peerAvg}%</span>
                </div>
                <Progress value={peerAvg} className="h-2.5 [&>div]:bg-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                {myAvg > peerAvg ? "🎉 أداؤك أعلى من المتوسط! واصل التميز" :
                 myAvg === peerAvg ? "👍 أداؤك مساوٍ للمتوسط" :
                 "📚 أداؤك أقل من المتوسط، ركّز على المراجعة"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Lesson Coverage Radar */}
        {radarData.length >= 3 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-accent" /> تغطية الدروس
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                    <Radar name="تغطيتك" dataKey="coverage" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Questions per Lesson */}
        {lessonQuestionCount.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-secondary" /> الأسئلة حسب الدرس
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lessonQuestionCount} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="questions" name="عدد الأسئلة" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lesson Completion List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">حالة إكمال الدروس</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lessons.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground truncate max-w-[70%]">{l.title}</span>
                <Badge variant={completedLessonIds.has(l.id) ? "default" : "outline"} className="text-xs">
                  {completedLessonIds.has(l.id) ? "مكتمل ✓" : "لم يكتمل"}
                </Badge>
              </div>
            ))}
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
