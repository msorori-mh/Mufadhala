import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import { Building2, BookOpen, Users, Calendar, Loader2 } from "lucide-react";

const AdminDashboard = () => {
  const { loading: authLoading } = useAuth("moderator");
  const [stats, setStats] = useState({ universities: 0, colleges: 0, majors: 0, students: 0, periods: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    const fetchStats = async () => {
      const [u, c, m, s, p] = await Promise.all([
        supabase.from("universities").select("id", { count: "exact", head: true }),
        supabase.from("colleges").select("id", { count: "exact", head: true }),
        supabase.from("majors").select("id", { count: "exact", head: true }),
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("competition_periods").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        universities: u.count || 0,
        colleges: c.count || 0,
        majors: m.count || 0,
        students: s.count || 0,
        periods: p.count || 0,
      });
      setLoading(false);
    };
    fetchStats();
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const cards = [
    { label: "الجامعات", value: stats.universities, icon: Building2, color: "text-primary" },
    { label: "الكليات", value: stats.colleges, icon: Building2, color: "text-accent" },
    { label: "التخصصات", value: stats.majors, icon: BookOpen, color: "text-secondary" },
    { label: "الطلاب", value: stats.students, icon: Users, color: "text-primary" },
    { label: "فترات المفاضلة", value: stats.periods, icon: Calendar, color: "text-accent" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>
          <p className="text-sm text-muted-foreground">نظرة عامة على النظام</p>
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {cards.map((card) => (
            <Card key={card.label}>
              <CardHeader className="pb-2">
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
