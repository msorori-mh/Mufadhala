import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useModeratorScope } from "@/hooks/useModeratorScope";
import AdminLayout from "@/components/admin/AdminLayout";
import ReportFilters, { type ReportFilterValues } from "@/components/admin/ReportFilters";
import { Loader2, Users, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import type { Tables } from "@/integrations/supabase/types";

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))",
  "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#6366f1",
];
const tooltipStyle = {
  backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
  borderRadius: "8px", color: "hsl(var(--foreground))", fontSize: "12px",
};

const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) => (
  <Card><CardContent className="p-4 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center shrink-0`}><Icon className="w-5 h-5" /></div>
    <div><p className="text-xl font-bold text-foreground">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
  </CardContent></Card>
);

const AdminReportsStudents = () => {
  const { loading: authLoading, isAdmin, user } = useAuth("moderator");
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Tables<"students">[]>([]);
  const [universities, setUniversities] = useState<Tables<"universities">[]>([]);
  const [colleges, setColleges] = useState<Tables<"colleges">[]>([]);
  const [majors, setMajors] = useState<Tables<"majors">[]>([]);
  const [filters, setFilters] = useState<ReportFilterValues>({});

  useEffect(() => {
    if (authLoading) return;
    Promise.all([
      supabase.from("students").select("*"),
      supabase.from("universities").select("*").order("display_order"),
      supabase.from("colleges").select("*").order("display_order"),
      supabase.from("majors").select("*").order("display_order"),
    ]).then(([{ data: s }, { data: u }, { data: c }, { data: m }]) => {
      if (s) setStudents(s); if (u) setUniversities(u);
      if (c) setColleges(c); if (m) setMajors(m);
      setLoading(false);
    });
  }, [authLoading]);

  const { loading: scopeLoading, getAllowedMajorIds } = useModeratorScope(user?.id, isAdmin, universities, colleges, majors);

  const filteredStudents = useMemo(() => {
    const allowed = getAllowedMajorIds();
    let list = allowed ? students.filter((s) => s.major_id && allowed.has(s.major_id)) : students;
    if (filters.dateFrom) list = list.filter((s) => new Date(s.created_at) >= filters.dateFrom!);
    if (filters.dateTo) { const end = new Date(filters.dateTo); end.setHours(23, 59, 59); list = list.filter((s) => new Date(s.created_at) <= end); }
    if (filters.universityId) list = list.filter((s) => s.university_id === filters.universityId);
    if (filters.governorate) list = list.filter((s) => s.governorate === filters.governorate);
    return list;
  }, [students, getAllowedMajorIds, isAdmin, filters]);

  if (authLoading || loading || scopeLoading) return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AdminLayout>;

  const uniCounts = universities.map((u) => ({ name: u.name_ar.length > 20 ? u.name_ar.slice(0, 18) + "…" : u.name_ar, count: filteredStudents.filter((s) => s.university_id === u.id).length })).filter((d) => d.count > 0);
  const collegeCounts = colleges.map((c) => ({ name: c.name_ar.length > 20 ? c.name_ar.slice(0, 18) + "…" : c.name_ar, count: filteredStudents.filter((s) => s.college_id === c.id).length })).filter((d) => d.count > 0).sort((a, b) => b.count - a.count).slice(0, 10);
  const govMap: Record<string, number> = {};
  filteredStudents.forEach((s) => { govMap[s.governorate || "غير محدد"] = (govMap[s.governorate || "غير محدد"] || 0) + 1; });
  const govData = Object.entries(govMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  const gpaRanges = [{ label: "90-100%", min: 90, max: 100 }, { label: "80-89%", min: 80, max: 89.99 }, { label: "70-79%", min: 70, max: 79.99 }, { label: "60-69%", min: 60, max: 69.99 }, { label: "أقل من 60%", min: 0, max: 59.99 }];
  const gpaData = gpaRanges.map((r) => ({ name: r.label, count: filteredStudents.filter((s) => s.gpa !== null && s.gpa >= r.min && s.gpa <= r.max).length })).filter((d) => d.count > 0);
  const majorCounts = majors.map((m) => ({ name: m.name_ar.length > 20 ? m.name_ar.slice(0, 18) + "…" : m.name_ar, count: filteredStudents.filter((s) => s.major_id === m.id).length })).filter((d) => d.count > 0).sort((a, b) => b.count - a.count).slice(0, 10);
  const avgGpa = filteredStudents.filter((s) => s.gpa).length > 0 ? (filteredStudents.filter((s) => s.gpa).reduce((sum, s) => sum + (s.gpa || 0), 0) / filteredStudents.filter((s) => s.gpa).length).toFixed(1) : "—";

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div><h1 className="text-2xl font-bold text-foreground">تقارير الطلاب</h1><p className="text-sm text-muted-foreground">{filteredStudents.length} طالب • متوسط المعدل: {avgGpa}%</p></div>
        <ReportFilters filters={filters} onChange={setFilters} universities={universities} showGovernorate showUniversity showDate />
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Users} label="إجمالي الطلاب" value={filteredStudents.length} color="bg-primary/10 text-primary" />
          <StatCard icon={TrendingUp} label="متوسط المعدل" value={`${avgGpa}%`} color="bg-accent/10 text-accent" />
        </div>
        {gpaData.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="text-base">توزيع المعدلات</CardTitle></CardHeader><CardContent><div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={gpaData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><YAxis dataKey="name" type="category" width={85} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="count" name="عدد الطلاب" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>}
        {uniCounts.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="text-base">الطلاب حسب الجامعة</CardTitle></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={uniCounts}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} angle={-30} textAnchor="end" height={70} /><YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="count" name="عدد الطلاب" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>}
        <div className="grid gap-4 md:grid-cols-2">
          {govData.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="text-base">التوزيع حسب المحافظة</CardTitle></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={govData} cx="50%" cy="50%" innerRadius={45} outerRadius={85} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>{govData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer></div></CardContent></Card>}
          {majorCounts.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="text-base">أكثر التخصصات طلباً</CardTitle></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={majorCounts} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="count" name="عدد الطلاب" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>}
        </div>
        {collegeCounts.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="text-base">أكثر الكليات طلاباً</CardTitle></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={collegeCounts}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} angle={-30} textAnchor="end" height={70} /><YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="count" name="عدد الطلاب" fill="#8b5cf6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>}
      </div>
    </AdminLayout>
  );
};

export default AdminReportsStudents;
