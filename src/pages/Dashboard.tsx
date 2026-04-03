import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, BookOpen, ClipboardCheck, TrendingUp, LogOut, UserCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [student, setStudent] = useState<Tables<"students"> | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/login");
      } else {
        setUser(session.user);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate("/login");
      } else {
        setUser(session.user);
        const { data } = await supabase
          .from("students")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (data) setStudent(data);
      }
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-primary text-white px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6" />
            <span className="text-lg font-bold">مفاضلة</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-white hover:bg-white/20 hover:text-white"
          >
            <LogOut className="w-4 h-4 ml-1" />
            خروج
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          مرحباً، {userName}
        </h1>
        <p className="text-muted-foreground mb-6">ابدأ التحضير لاختبار المفاضلة</p>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Profile Card */}
          <Link to="/profile" className="block">
            <Card className="cursor-pointer hover:shadow-md transition-shadow border-r-4 border-r-primary h-full">
              <CardHeader className="pb-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <UserCircle className="w-5 h-5 text-primary" />
                </div>
                <CardTitle className="text-base">الملف الشخصي</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  عرض وتعديل بياناتك الشخصية والأكاديمية
                </p>
                {student?.gpa && (
                  <p className="text-xs text-primary font-semibold mt-2">
                    المعدل: {student.gpa}%
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>

          <Card className="cursor-pointer hover:shadow-md transition-shadow border-r-4 border-r-secondary">
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center mb-2">
                <BookOpen className="w-5 h-5 text-secondary" />
              </div>
              <CardTitle className="text-base">مواد الاختبار</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                ملخصات ودروس في جميع المواد المقررة
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow border-r-4 border-r-accent">
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-2">
                <ClipboardCheck className="w-5 h-5 text-accent" />
              </div>
              <CardTitle className="text-base">نماذج سابقة</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                أسئلة من اختبارات القبول السابقة
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow border-r-4 border-r-primary">
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-base">محاكي الاختبار</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                اختبار محاكاة بتوقيت حقيقي (90 دقيقة)
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
