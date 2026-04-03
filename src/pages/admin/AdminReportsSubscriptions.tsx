import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import ReportFilters, { type ReportFilterValues } from "@/components/admin/ReportFilters";
import { Loader2, Users, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { Tables } from "@/integrations/supabase/types";

const tooltipStyle = { backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))", fontSize: "12px" };

interface SubRow { id: string; user_id: string; status: string; created_at: string; }

const StatCard = ({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) => (
  <Card><CardContent className="p-4 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center shrink-0`}><Icon className="w-5 h-5" /></div>
    <div><p className="text-xl font-bold text-foreground">{value}</p><p className="text-xs text-muted-foreground">{label}</p>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</div>
  </CardContent></Card>
);

const AdminReportsSubscriptions = () => {
  const { loading: authLoading } = useAuth("moderator");
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [students, setStudents] = useState<Tables<"students">[]>([]);
  const [universities, setUniversities] = useState<Tables<"universities">[]>([]);
  const [filters, setFilters] = useState<ReportFilterValues>({});

  useEffect(() => {
    if (authLoading) return;
    Promise.all([
      supabase.from("subscriptions").select("id, user_id, status, created_at"),
      supabase.from("students").select("*"),
      supabase.from("universities").select("*").order("display_order"),
    ]).then(([{ data: s }, { data: st }, { data: u }]) => {
      if (s) setSubs(s as SubRow[]);
      if (st) setStudents(st);
      if (u) setUniversities(u);
      setLoading(false);
    });
  }, [authLoading]);

  const filtered = useMemo(() => {
    let list = subs;
    if (filters.dateFrom) list = list.filter((s) => new Date(s.created_at) >= filters.dateFrom!);
    if (filters.dateTo) { const end = new Date(filters.dateTo); end.setHours(23, 59, 59); list = list.filter((s) => new Date(s.created_at) <= end); }
    if (filters.universityId || filters.governorate) {
      const userIds = new Set(students.filter((s) => {
        if (filters.universityId && s.university_id !== filters.universityId) return false;
        if (filters.governorate && s.governorate !== filters.governorate) return false;
        return true;
      }).map((s) => s.user_id));
      list = list.filter((s) => userIds.has(s.user_id));
    }
    return list;
  }, [subs, students, filters]);

  if (authLoading || loading) return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AdminLayout>;

  const active = filtered.filter((s) => s.status === "active").length;
  const pending = filtered.filter((s) => s.status === "pending").length;
  const expired = filtered.filter((s) => s.status === "expired").length;
  const cancelled = filtered.filter((s) => s.status === "cancelled").length;
  const studentCount = students.length;
  const conversionRate = studentCount > 0 ? ((active / studentCount) * 100).toFixed(1) : "0";

  const statusData = [
    { name: "فعال", value: active, fill: "#10b981" },
    { name: "معلق", value: pending, fill: "#f59e0b" },
    { name: "منتهي", value: expired, fill: "#94a3b8" },
    { name: "ملغي", value: cancelled, fill: "#ef4444" },
  ].filter((d) => d.value > 0);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div><h1 className="text-2xl font-bold text-foreground">تقارير الاشتراكات</h1><p className="text-sm text-muted-foreground">{filtered.length} اشتراك • {active} فعال</p></div>
        <ReportFilters filters={filters} onChange={setFilters} universities={universities} showGovernorate showUniversity showDate />
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Users} label="مشتركون فعالون" value={active} color="bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400" />
          <StatCard icon={TrendingUp} label="معدل التحويل" value={`${conversionRate}%`} sub="من التسجيل إلى الاشتراك" color="bg-primary/10 text-primary" />
        </div>
        {statusData.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="text-base">حالة الاشتراكات</CardTitle></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={11}>{statusData.map((d, i) => <Cell key={i} fill={d.fill} />)}</Pie><Tooltip contentStyle={tooltipStyle} /><Legend /></PieChart></ResponsiveContainer></div></CardContent></Card>}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد بيانات اشتراكات بعد</p>}
      </div>
    </AdminLayout>
  );
};

export default AdminReportsSubscriptions;
