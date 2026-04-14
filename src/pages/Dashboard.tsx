import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { fetchLessonsBySubjects } from "@/lib/contentFilter";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import ThemeToggle from "@/components/ThemeToggle";
import MotivationalBanner from "@/components/MotivationalBanner";
import AchievementsBadges from "@/components/AchievementsBadges";
import WelcomeDialog from "@/components/WelcomeDialog";
import EngagementModal from "@/components/EngagementModal";
import { getDailyTip, dailyTips } from "@/data/dailyTips";
import {
  GraduationCap, LogOut, UserCircle, Bell, Shield, BookOpen,
  ClipboardCheck, Trophy, TrendingUp, Target, BarChart3, CreditCard, Search,
  Building2, ChevronLeft, Lightbulb, RefreshCw, Sparkles,
} from "lucide-react";
import DashboardCharts from "@/components/DashboardCharts";
import UpgradeCTABanner from "@/components/UpgradeCTABanner";
import SmartRecommendations from "@/components/SmartRecommendations";
import AIPracticeQuestions from "@/components/AIPracticeQuestions";
import type { Tables } from "@/integrations/supabase/types";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useSubscription } from "@/hooks/useSubscription";

interface ExamAttemptRow {
  id: string;
  score: number;
  total: number;
  completed_at: string | null;
  major_id: string;
}

const DailyTipCard = () => {
  const [tip, setTip] = useState(getDailyTip());
  const [spinning, setSpinning] = useState(false);

  const refreshTip = () => {
    setSpinning(true);
    const randomIndex = Math.floor(Math.random() * dailyTips.length);
    setTip(dailyTips[randomIndex]);
    setTimeout(() => setSpinning(false), 500);
  };

  return (
    <Card className="border-accent/20 bg-accent/5">
      <CardContent className="p-3 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0 mt-0.5">
          <Lightbulb className="w-4.5 h-4.5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{tip.category}</Badge>
            <span className="text-[10px] text-muted-foreground">💡 نصيحة اليوم</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            <span className="ml-1">{tip.emoji}</span>
            {tip.tip}
          </p>
        </div>
        <button onClick={refreshTip} className="shrink-0 p-1.5 rounded-md hover:bg-accent/10 transition-colors" title="نصيحة أخرى">
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${spinning ? "animate-spin" : ""}`} />
        </button>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, student, isStaff, isAdmin, loading: accessLoading, subjectIds } = useStudentAccess();

  const authLoading = accessLoading;
  const { data: unreadCount = 0 } = useUnreadCount(user?.id);
  const { isActive: hasActiveSubscription } = useSubscription(user?.id);

  // Fetch all dashboard-specific data in ONE parallel batch
  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ["dashboard-data", student?.id, subjectIds],
    queryFn: async () => {
      if (!student) return { attempts: [], lessonCount: 0, completedLessons: 0, lessonsStarted: 0, collegeName: null };

      // Use subject-based lesson count (deduplicated)
      const [attemptsRes, lessons, completedRes, startedRes, collegeRes] = await Promise.all([
        supabase.from("exam_attempts")
          .select("id, score, total, completed_at, major_id")
          .eq("student_id", student.id)
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: true }),
        subjectIds.length > 0
          ? fetchLessonsBySubjects(supabase, subjectIds)
          : Promise.resolve([]),
        supabase.from("lesson_progress").select("id", { count: "exact", head: true }).eq("student_id", student.id).eq("is_completed", true),
        supabase.from("lesson_progress").select("id", { count: "exact", head: true }).eq("student_id", student.id),
        student.college_id
          ? supabase.from("colleges").select("name_ar").eq("id", student.college_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      return {
        attempts: (attemptsRes.data || []) as ExamAttemptRow[],
        lessonCount: lessons.length,
        completedLessons: completedRes.count ?? 0,
        lessonsStarted: startedRes.count ?? 0,
        collegeName: (collegeRes.data as any)?.name_ar ?? null,
      };
    },
    enabled: !!student,
    staleTime: 2 * 60 * 1000,
  });

  const attempts = dashData?.attempts ?? [];
  const lessonCount = dashData?.lessonCount ?? 0;
  const completedLessons = dashData?.completedLessons ?? 0;
  const lessonsStarted = dashData?.lessonsStarted ?? 0;
  const collegeName = dashData?.collegeName ?? null;
  const loading = accessLoading || dashLoading;

  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate("/login");
  }, [authLoading, user, navigate]);

  useRealtimeNotifications(user?.id);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const userName = isAdmin
    ? "مدير النظام"
    : student
      ? `${student.first_name || ""} ${student.fourth_name || ""}`.trim() || "طالب"
      : user?.user_metadata?.first_name || "طالب";

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

  const chartData = attempts.slice(-10).map((a, i) => ({
    name: `${i + 1}`,
    score: Math.round((a.score / a.total) * 100),
  }));

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




  const statCards = [
    { label: "إجمالي الاختبارات", value: totalExams, icon: ClipboardCheck, color: "text-primary", bg: "bg-primary/10" },
    { label: "المعدل العام", value: `${avgScore}%`, icon: TrendingUp, color: "text-accent", bg: "bg-accent/10" },
    { label: "أفضل نتيجة", value: `${bestScore}%`, icon: Trophy, color: "text-secondary", bg: "bg-secondary/10" },
    { label: "آخر نتيجة", value: `${lastScore}%`, icon: Target, color: "text-primary", bg: "bg-primary/10" },
  ];

  const navCards = [
    { path: isAdmin ? "/admin/content" : "/lessons", title: "المحتوى التعليمي", desc: isAdmin ? "إدارة الدروس والأسئلة" : "تدرّب على الدروس والأسئلة", icon: BookOpen, color: "border-r-secondary", iconColor: "text-secondary", bgColor: "bg-secondary/10" },
    { path: "/exam", title: "محاكاة الاختبار", desc: "45 سؤال في 90 دقيقة", icon: ClipboardCheck, color: "border-r-primary", iconColor: "text-primary", bgColor: "bg-primary/10" },
    ...(!isAdmin ? [{ path: "/subscription", title: "الاشتراك", desc: "إدارة اشتراكك والدفع", icon: CreditCard, color: "border-r-accent", iconColor: "text-accent", bgColor: "bg-accent/10" }] : []),
    { path: "/college-guide", title: "دليل الكليات", desc: "متطلبات القبول ونسب القبول والمواعيد", icon: Building2, color: "border-r-primary", iconColor: "text-primary", bgColor: "bg-primary/10" },
    { path: "/exam-history", title: "سجل الاختبارات", desc: "عرض محاولاتك السابقة", icon: Trophy, color: "border-r-secondary", iconColor: "text-secondary", bgColor: "bg-secondary/10" },
    { path: "/search", title: "البحث المتقدم", desc: "ابحث في الدروس والأسئلة بالتخصص والكلية", icon: Search, color: "border-r-accent", iconColor: "text-accent", bgColor: "bg-accent/10" },
    { path: "/performance", title: "تحليل الأداء", desc: "مقارنة بالزملاء ونقاط القوة والضعف", icon: BarChart3, color: "border-r-primary", iconColor: "text-primary", bgColor: "bg-primary/10" },
    { path: "/leaderboard", title: "لوحة المتصدرين", desc: "ترتيب الأوائل على مستوى الجمهورية", icon: Trophy, color: "border-r-secondary", iconColor: "text-secondary", bgColor: "bg-secondary/10" },
    { path: "/notifications", title: "الإشعارات", desc: "آخر التحديثات", icon: Bell, color: "border-r-accent", iconColor: "text-accent", bgColor: "bg-accent/10", badge: unreadCount },
  ];

  // Show skeleton layout immediately while loading — never blank screen
  if (accessLoading && !student) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <header className="gradient-primary text-white px-4 py-3 md:py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-6 h-6" />
              <span className="text-lg font-bold hidden sm:inline">مُفَاضَلَة</span>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">
          <Skeleton className="h-7 w-40 mb-2" />
          <Skeleton className="h-4 w-56 mb-6" />
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 md:hidden mb-4">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <div className="grid grid-cols-2 gap-2">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {user && <WelcomeDialog userId={user.id} />}
      {/* Header */}
      <header className="gradient-primary text-white px-4 py-3 md:py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
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

      <main className="max-w-6xl mx-auto px-4 py-6 md:pb-6">
        <div className="grid md:grid-cols-[220px_1fr] lg:grid-cols-[250px_1fr] gap-5">
          {/* ===== Sidebar (right in RTL) ===== */}
          <aside className="space-y-4 order-2 md:order-1">
            {/* Welcome - desktop sidebar */}
            <div className="hidden md:block">
              <h1 className="text-lg font-bold text-foreground mb-0.5">مرحباً، {userName}</h1>
              {!isAdmin && (
                <p className="text-xs text-muted-foreground">
                  {student?.gpa ? `معدلك: ${student.gpa}%` : "ابدأ التدريب الآن"}
                </p>
              )}
            </div>

            {/* Nav list - desktop: compact vertical list */}
            <nav className="hidden md:block">
              <div className="space-y-0.5">
                {navCards.map((card) => {
                  const isActive = location.pathname === card.path;
                  return (
                  <Link
                    key={card.path}
                    to={card.path}
                    className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors group ${isActive ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/60"}`}
                  >
                    {isActive && (
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-l-full bg-primary" />
                    )}
                    <div className={`w-7 h-7 rounded-md ${card.bgColor} flex items-center justify-center shrink-0`}>
                      <card.icon className={`w-3.5 h-3.5 ${card.iconColor}`} />
                    </div>
                    <span className={`text-sm flex-1 ${isActive ? "font-semibold text-primary" : "text-foreground"}`}>{card.title}</span>
                    {card.badge ? (
                      <span className="w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                        {card.badge}
                      </span>
                    ) : (
                      <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </Link>
                  );
                })}
              </div>
            </nav>

            {/* Nav grid - mobile only */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 md:hidden">
              {navCards.map((card) => (
                <div
                  key={card.path}
                  className="transition-all duration-200 active:scale-95"
                >
                  <Link to={card.path} className="block">
                    <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-card border border-border hover:shadow-sm transition-shadow text-center">
                      <div className={`relative w-9 h-9 rounded-full ${card.bgColor} flex items-center justify-center`}>
                        <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                        {card.badge ? (
                          <span className="absolute -top-0.5 -left-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                            {card.badge}
                          </span>
                        ) : null}
                      </div>
                      <span className="text-[10px] font-medium text-foreground leading-tight line-clamp-2">{card.title}</span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </aside>

          {/* ===== Main Content ===== */}
          <div className="space-y-4 order-1 md:order-2">
            {/* Welcome - mobile */}
            <div className="md:hidden">
              <h1 className="text-xl font-bold text-foreground mb-0.5">مرحباً، {userName}</h1>
              {!isAdmin && (
                <p className="text-sm text-muted-foreground">
                  {student?.gpa ? `معدلك: ${student.gpa}% • ابدأ التدريب على تخصصك الآن` : "ابدأ التدريب على تخصصك الآن"}
                </p>
              )}
            </div>

            {/* Profile completion reminder removed — registration flow collects all needed data */}

            {/* Motivational Banner */}
            {!isAdmin && <MotivationalBanner collegeName={collegeName} avgScore={avgScore} />}

            {/* Quick Start Guide - shown when no exams yet */}
            {!isAdmin && totalExams === 0 && !loading && (
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-foreground">🚀 ابدأ رحلتك نحو القبول</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
{[
                    { icon: BookOpen, title: "استعرض الدروس", desc: "ابدأ بمراجعة الملخصات الذكية لتخصصك", path: "/lessons", color: "text-secondary", bg: "bg-secondary/10" },
                    { icon: ClipboardCheck, title: "خُض اختبار محاكاة", desc: "جرّب نفسك بـ 45 سؤال في 90 دقيقة", path: "/exam", color: "text-primary", bg: "bg-primary/10" },
                    { icon: Sparkles, title: "مولد الأسئلة الذكي", desc: "أسئلة تدريبية مخصصة بالذكاء الاصطناعي", path: "/exam?mode=ai", color: "text-accent", bg: "bg-accent/10" },
                    { icon: CreditCard, title: "الاشتراك والتفعيل", desc: "فعّل اشتراكك للوصول لكامل المحتوى", path: "/subscription", color: "text-primary", bg: "bg-primary/10" },
                  ].map((item) => (
                    <Card key={item.path} className="cursor-pointer hover:shadow-md transition-shadow border" onClick={() => navigate(item.path)}>
                      <CardContent className="flex items-center gap-3 p-3">
                        <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
                          <item.icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm">{item.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Platform highlights */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-bold text-foreground mb-3">✨ ما الذي يميّز مُفَاضَلَة؟</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { emoji: "📚", label: "3000+ سؤال تدريبي", sub: "مراجع ومعتمد" },
                        { emoji: "🧠", label: "شرح علمي مفصّل", sub: "لكل إجابة" },
                        { emoji: "⏱️", label: "محاكاة واقعية", sub: "لبيئة الاختبار" },
                        { emoji: "📶", label: "يعمل أوفلاين", sub: "بدون إنترنت" },
                      ].map((f, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-lg">{f.emoji}</span>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{f.label}</p>
                            <p className="text-[10px] text-muted-foreground">{f.sub}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Daily Tip */}
            {!isAdmin && (
              <DailyTipCard />
            )}

            {/* Upgrade CTA for free users who engaged */}
            {!isAdmin && !hasActiveSubscription && (
              <UpgradeCTABanner completedLessons={completedLessons} totalLessons={lessonCount} />
            )}


            {totalExams > 0 && (
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {statCards.map((s) => (
                  <Card key={s.label} className="relative overflow-hidden">
                    <CardContent className="p-2.5 sm:p-3 flex flex-col items-center text-center gap-0.5">
                      <div className={`w-7 h-7 rounded-md ${s.bg} flex items-center justify-center mb-0.5`}>
                        <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                      </div>
                      <span className="text-lg sm:text-xl font-bold text-foreground">{s.value}</span>
                      <span className="text-[10px] text-muted-foreground">{s.label}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Lesson Progress */}
            {lessonCount > 0 && (
              <Card>
                <CardHeader className="pb-1.5 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-secondary" />
                    تقدم الدروس
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-4 pb-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">الدروس المكتملة</span>
                    <span className="font-semibold text-foreground">{completedLessons}/{lessonCount}</span>
                  </div>
                  <Progress value={lessonCount > 0 ? (completedLessons / lessonCount) * 100 : 0} className="h-2.5" />
                  <p className="text-[10px] text-muted-foreground">
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
                <CardHeader className="pb-1.5 pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 text-primary" />
                    مستوى الأداء
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-4 pb-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">المعدل العام</span>
                    <span className="font-semibold text-foreground">{avgScore}%</span>
                  </div>
                  <Progress value={avgScore} className="h-2.5" />
                  <p className="text-[10px] text-muted-foreground">
                    {avgScore >= 80 ? "🎉 أداء ممتاز! واصل التميز" :
                     avgScore >= 60 ? "👍 أداء جيد، يمكنك التحسن أكثر" :
                     avgScore >= 40 ? "📚 تحتاج مراجعة إضافية" :
                     "⚠️ ركّز على الدروس قبل إعادة الاختبار"}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Smart Recommendations */}
            {!isAdmin && (
              <SmartRecommendations
                attempts={attempts}
                completedLessons={completedLessons}
                totalLessons={lessonCount}
                lessonsStarted={lessonsStarted}
                hasSubscription={hasActiveSubscription}
              />
            )}

            {/* AI Practice Questions */}
            {!isAdmin && (
              <AIPracticeQuestions hasSubscription={hasActiveSubscription} />
            )}

            {/* Engagement Modal */}
            {!isAdmin && (
              <EngagementModal
                completedLessons={completedLessons}
                examAttempts={totalExams}
                hasSubscription={hasActiveSubscription}
              />
            )}

            {/* Achievements */}
            <AchievementsBadges stats={{ totalExams, avgScore, bestScore, completedLessons, totalLessons: lessonCount }} />

            {/* Charts Row */}
            {totalExams >= 2 && (
              <DashboardCharts chartData={chartData} distribution={distribution} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
