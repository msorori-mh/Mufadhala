import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import MotivationalBanner from "@/components/MotivationalBanner";
import AchievementsBadges from "@/components/AchievementsBadges";
import WelcomeDialog from "@/components/WelcomeDialog";
import {
  GraduationCap, LogOut, UserCircle, Bell, Shield, BookOpen,
  ClipboardCheck, Trophy, TrendingUp, Target, BarChart3, CreditCard, Search,
  Building2,
} from "lucide-react";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, ResponsiveContainer } from "recharts";
import type { Tables } from "@/integrations/supabase/types";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

interface ExamAttemptRow {
  id: string;
  score: number;
  total: number;
  completed_at: string | null;
  major_id: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isStaff, isAdmin } = useAuthContext();
  const [student, setStudent] = useState<Tables<"students"> | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [attempts, setAttempts] = useState<ExamAttemptRow[]>([]);
  const [lessonCount, setLessonCount] = useState(0);
  const [completedLessons, setCompletedLessons] = useState(0);
  const [collegeName, setCollegeName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }

    const fetchData = async () => {
      const [{ data: s }, { data: notifs }] = await Promise.all([
        supabase.from("students").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
      ]);
      if (s) {
        setStudent(s);
        const [{ data: exams }, { data: lessons }, { data: progress }] = await Promise.all([
          supabase.from("exam_attempts").select("id, score, total, completed_at, major_id")
            .eq("student_id", s.id).not("completed_at", "is", null)
            .order("completed_at", { ascending: true }),
          s.major_id
            ? supabase.from("lessons").select("id")
                .eq("major_id", s.major_id).eq("is_published", true)
            : Promise.resolve({ data: [] }),
          supabase.from("lesson_progress").select("id")
            .eq("student_id", s.id).eq("is_completed", true),
        ]);
        if (exams) setAttempts(exams);
        setLessonCount(lessons?.length ?? 0);
        setCompletedLessons(progress?.length ?? 0);
        if (s.college_id) {
          const { data: college } = await supabase.from("colleges").select("name_ar").eq("id", s.college_id).maybeSingle();
          if (college) setCollegeName(college.name_ar);
        }
      }
      setUnreadCount((notifs as any)?.count ?? 0);
      setLoading(false);
    };

    fetchData();
  }, [authLoading, user, navigate]);

  // Realtime: update unread count when new notification arrives
  useRealtimeNotifications(user?.id);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dashboard-notif-count-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => setUnreadCount((c) => c + 1))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const userName = isAdmin
    ? "مدير النظام"
    : student
      ? `${student.first_name || ""} ${student.fourth_name || ""}`.trim() || "طالب"
      : user?.user_metadata?.first_name || "طالب";

  // Stats calculations
  const totalExams = attempts.length;
  const avgScore = totalExams > 0
    ? Math.round(attempts.reduce((sum, a) => sum + (a.score / a.total) * 100, 0) / totalExams)
    : 0;
  const bestScore = totalExams > 0
    ? Math.round(Math.max(...attempts.map(a => (a.score / a.total) * 100)))
    : 0;
  const lastScore = totalExams > 0
    ? Math.round((attempts[attempts.length - 1].score / attempts[attempts.length - 1].total) * 100)
    : 0;

  // Chart data - last 10 attempts
  const chartData = attempts.slice(-10).map((a, i) => ({
    name: `${i + 1}`,
    score: Math.round((a.score / a.total) * 100),
  }));

  // Score distribution
  const distribution = [
    { range: "0-40", count: 0, fill: "hsl(var(--destructive))" },
    { range: "41-60", count: 0, fill: "hsl(var(--warning))" },
    { range: "61-80", count: 0, fill: "hsl(var(--primary))" },
    { range: "81-100", count: 0, fill: "hsl(var(--success))" },
  ];
  attempts.forEach(a => {
    const pct = (a.score / a.total) * 100;
    if (pct <= 40) distribution[0].count++;
    else if (pct <= 60) distribution[1].count++;
    else if (pct <= 80) distribution[2].count++;
    else distribution[3].count++;
  });

  const chartConfig = {
    score: { label: "النتيجة %", color: "hsl(var(--primary))" },
  };
  const barConfig = {
    count: { label: "عدد المحاولات", color: "hsl(var(--primary))" },
  };

  const statCards = [
    { label: "إجمالي الاختبارات", value: totalExams, icon: ClipboardCheck, color: "text-primary", bg: "bg-primary/10" },
    { label: "المعدل العام", value: `${avgScore}%`, icon: TrendingUp, color: "text-accent", bg: "bg-accent/10" },
    { label: "أفضل نتيجة", value: `${bestScore}%`, icon: Trophy, color: "text-secondary", bg: "bg-secondary/10" },
    { label: "آخر نتيجة", value: `${lastScore}%`, icon: Target, color: "text-primary", bg: "bg-primary/10" },
  ];

  const navCards = [
    ...(!isAdmin ? [{ path: "/profile", title: "الملف الشخصي", desc: "عرض وتعديل بياناتك", icon: UserCircle, color: "border-r-primary", iconColor: "text-primary", bgColor: "bg-primary/10" }] : []),
    ...(!isAdmin ? [{ path: "/subscription", title: "الاشتراك", desc: "إدارة اشتراكك والدفع", icon: CreditCard, color: "border-r-accent", iconColor: "text-accent", bgColor: "bg-accent/10" }] : []),
    { path: isAdmin ? "/admin/content" : "/lessons", title: "المحتوى التعليمي", desc: isAdmin ? "إدارة الدروس والأسئلة" : "تدرّب على الدروس والأسئلة", icon: BookOpen, color: "border-r-secondary", iconColor: "text-secondary", bgColor: "bg-secondary/10" },
    { path: "/search", title: "البحث المتقدم", desc: "ابحث في الدروس والأسئلة بالتخصص والكلية", icon: Search, color: "border-r-accent", iconColor: "text-accent", bgColor: "bg-accent/10" },
    { path: "/exam", title: "محاكاة الاختبار", desc: "45 سؤال في 90 دقيقة", icon: ClipboardCheck, color: "border-r-primary", iconColor: "text-primary", bgColor: "bg-primary/10" },
    { path: "/exam-history", title: "سجل الاختبارات", desc: "عرض محاولاتك السابقة", icon: Trophy, color: "border-r-secondary", iconColor: "text-secondary", bgColor: "bg-secondary/10" },
    { path: "/performance", title: "تحليل الأداء", desc: "مقارنة بالزملاء ونقاط القوة والضعف", icon: BarChart3, color: "border-r-primary", iconColor: "text-primary", bgColor: "bg-primary/10" },
    { path: "/leaderboard", title: "لوحة المتصدرين", desc: "ترتيب الأوائل على مستوى الجمهورية", icon: Trophy, color: "border-r-secondary", iconColor: "text-secondary", bgColor: "bg-secondary/10" },
    { path: "/college-guide", title: "دليل الكليات", desc: "متطلبات القبول ونسب القبول والمواعيد", icon: Building2, color: "border-r-primary", iconColor: "text-primary", bgColor: "bg-primary/10" },
    { path: "/notifications", title: "الإشعارات", desc: "آخر التحديثات", icon: Bell, color: "border-r-accent", iconColor: "text-accent", bgColor: "bg-accent/10", badge: unreadCount },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {user && <WelcomeDialog userId={user.id} />}
      {/* Header */}
      <header className="gradient-primary text-white px-4 py-3 md:py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6" />
            <span className="text-lg font-bold hidden sm:inline">مُفَاضَلَة</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {isStaff && (
              <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20 hover:text-white">
                <Link to="/admin"><Shield className="w-4 h-4 sm:ml-1" /><span className="hidden sm:inline">الإدارة</span></Link>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white hover:bg-white/20 hover:text-white">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">مرحباً، {userName}</h1>
          {!isAdmin && (
            <p className="text-muted-foreground">
              {student?.gpa ? `معدلك: ${student.gpa}% • ابدأ التدريب على تخصصك الآن` : "أكمل ملفك الشخصي للبدء"}
            </p>
          )}
        </div>

        {/* Profile completion reminder */}
        {!isAdmin && student && !student.major_id && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                  <UserCircle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">أكمل بياناتك الأكاديمية</p>
                  <p className="text-xs text-muted-foreground">اختر جامعتك وكليتك وتخصصك للحصول على تجربة مخصصة</p>
                </div>
              </div>
              <Button size="sm" onClick={() => navigate("/complete-profile")} className="shrink-0">
                إكمال
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Motivational Banner - only for students */}
        {!isAdmin && <MotivationalBanner collegeName={collegeName} avgScore={avgScore} />}

        {/* Stats Cards */}
        {totalExams > 0 && (
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
            {statCards.map((s) => (
              <Card key={s.label} className="relative overflow-hidden">
                <CardContent className="p-3 sm:p-4 flex flex-col items-center text-center gap-0.5 sm:gap-1">
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg ${s.bg} flex items-center justify-center mb-0.5 sm:mb-1`}>
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-foreground">{s.value}</span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground">{s.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Lesson Progress */}
        {lessonCount > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-secondary" />
                تقدم الدروس
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">الدروس المكتملة</span>
                <span className="font-semibold text-foreground">{completedLessons}/{lessonCount}</span>
              </div>
              <Progress value={lessonCount > 0 ? (completedLessons / lessonCount) * 100 : 0} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {completedLessons === lessonCount && lessonCount > 0
                  ? "🎉 أكملت جميع الدروس!"
                  : `${lessonCount - completedLessons} درس متبقي`}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Performance Progress */}
        {totalExams > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                مستوى الأداء
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">المعدل العام</span>
                <span className="font-semibold text-foreground">{avgScore}%</span>
              </div>
              <Progress value={avgScore} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {avgScore >= 80 ? "🎉 أداء ممتاز! واصل التميز" :
                 avgScore >= 60 ? "👍 أداء جيد، يمكنك التحسن أكثر" :
                 avgScore >= 40 ? "📚 تحتاج مراجعة إضافية" :
                 "⚠️ ركّز على الدروس قبل إعادة الاختبار"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Achievements */}
        <AchievementsBadges stats={{ totalExams, avgScore, bestScore, completedLessons, totalLessons: lessonCount }} />

        {/* Charts Row */}
        {totalExams >= 2 && (
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {/* Score Trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">تطور النتائج</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                  <LineChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "hsl(var(--primary))" }}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Score Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">توزيع الدرجات</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={barConfig} className="h-[200px] w-full">
                  <BarChart data={distribution}>
                    <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {distribution.map((entry, idx) => (
                        <Bar key={idx} dataKey="count" fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation Cards */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
          {navCards.map((card) => (
            <Link key={card.path} to={card.path} className="block">
              <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border hover:shadow-md hover:border-primary/30 transition-all cursor-pointer text-center">
                <div className={`relative w-11 h-11 rounded-full ${card.bgColor} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                  {card.badge ? (
                    <span className="absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                      {card.badge}
                    </span>
                  ) : null}
                </div>
                <span className="text-xs font-medium text-foreground leading-tight line-clamp-2">{card.title}</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
