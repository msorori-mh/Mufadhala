import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, LogOut, UserCircle, Bell, Shield, BookOpen } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [student, setStudent] = useState<Tables<"students"> | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) navigate("/login");
      else setUser(session.user);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { navigate("/login"); return; }
      setUser(session.user);

      const [{ data: s }, { data: roles }, { data: notifs }] = await Promise.all([
        supabase.from("students").select("*").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", session.user.id),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", session.user.id).eq("is_read", false),
      ]);
      if (s) setStudent(s);
      if (roles) setIsStaff(roles.some((r) => r.role === "admin" || r.role === "moderator"));
      setUnreadCount((notifs as any)?.count ?? 0);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const userName = student
    ? `${student.first_name || ""} ${student.fourth_name || ""}`.trim() || "طالب"
    : user?.user_metadata?.first_name || "طالب";

  const cards = [
    { path: "/profile", title: "الملف الشخصي", desc: "عرض وتعديل بياناتك الأكاديمية", icon: UserCircle, color: "border-r-primary", iconColor: "text-primary", bgColor: "bg-primary/10" },
    { path: "/lessons", title: "المحتوى التعليمي", desc: "تدرّب على دروس وأسئلة تخصصك", icon: BookOpen, color: "border-r-secondary", iconColor: "text-secondary", bgColor: "bg-secondary/10" },
    { path: "/notifications", title: "الإشعارات", desc: "آخر التحديثات والإعلانات", icon: Bell, color: "border-r-accent", iconColor: "text-accent", bgColor: "bg-accent/10", badge: unreadCount },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-primary text-white px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6" />
            <span className="text-lg font-bold">مفاضلة</span>
          </div>
          <div className="flex items-center gap-1">
            {isStaff && (
              <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20 hover:text-white">
                <Link to="/admin"><Shield className="w-4 h-4 ml-1" />الإدارة</Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/20 hover:text-white">
              <LogOut className="w-4 h-4 ml-1" />خروج
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">مرحباً، {userName}</h1>
        <p className="text-muted-foreground mb-6">
          {student?.gpa ? `معدلك: ${student.gpa}% • اختر تخصصك وابدأ التدريب` : "أكمل ملفك الشخصي للبدء"}
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((card) => (
            <Link key={card.path} to={card.path} className="block">
              <Card className={`cursor-pointer hover:shadow-md transition-shadow border-r-4 ${card.color} h-full`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                      <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                    </div>
                    {card.badge ? <Badge className="text-xs">{card.badge}</Badge> : null}
                  </div>
                  <CardTitle className="text-base">{card.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{card.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
