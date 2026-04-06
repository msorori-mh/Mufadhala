import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExportData } from "@/lib/exportReport";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import PermissionGate from "@/components/admin/PermissionGate";
import ReportFilters, { type ReportFilterValues } from "@/components/admin/ReportFilters";
import { Loader2, ClipboardCheck, TrendingUp, BookOpen } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { Tables } from "@/integrations/supabase/types";

const tooltipStyle = { backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))", fontSize: "12px" };

interface ExamRow { id: string; student_id: string; major_id: string; score: number; total: number; completed_at: string | null; }

const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) => (
  <Card><CardContent className="p-4 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center shrink-0`}><Icon className="w-5 h-5" /></div>
    <div><p className="text-xl font-bold text-foreground">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
  </CardContent></Card>
);

const AdminReportsExams = () => {
  const { loading: authLoading } = useAuth("moderator");
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [majors, setMajors] = useState<Tables<"majors">[]>([]);
  const [students, setStudents] = useState<Tables<"students">[]>([]);
  const [universities, setUniversities] = useState<Tables<"universities">[]>([]);
  const [filters, setFilters] = useState<ReportFilterValues>({});

  useEffect(() => {
    if (authLoading) return;
    Promise.all([
      supabase.from("exam_attempts").select("id, student_id, major_id, score, total, completed_at").not("completed_at", "is", null),
      supabase.from("majors").select("*").order("display_order"),
      supabase.from("students").select("*"),
      supabase.from("universities").select("*").order("display_order"),
    ]).then(([{ data: e }, { data: m }, { data: s }, { data: u }]) => {
      if (e) setExams(e as ExamRow[]);
      if (m) setMajors(m);
      if (s) setStudents(s);
      if (u) setUniversities(u);
      setLoading(false);
    });
  }, [authLoading]);

  const filtered = useMemo(() => {
    let list = exams;
    if (filters.dateFrom) list = list.filter((e) => e.completed_at && new Date(e.completed_at) >= filters.dateFrom!);
    if (filters.dateTo) { const end = new Date(filters.dateTo); end.setHours(23, 59, 59); list = list.filter((e) => e.completed_at && new Date(e.completed_at) <= end); }
    if (filters.universityId || filters.governorate) {
      const studentIds = new Set(students.filter((s) => {
        if (filters.universityId && s.university_id !== filters.universityId) return false;
        if (filters.governorate && s.governorate !== filters.governorate) return false;
        return true;
      }).map((s) => s.id));
      list = list.filter((e) => studentIds.has(e.student_id));
    }
    return list;
  }, [exams, students, filters]);

  if (authLoading || loading) return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AdminLayout>;

  const total = filtered.length;
  const overallAvg = total > 0 ? Math.round(filtered.reduce((s, e) => s + (e.score / e.total) * 100, 0) / total) : 0;
  const passRate = total > 0 ? Math.round((filtered.filter((e) => (e.score / e.total) * 100 >= 60).length / total) * 100) : 0;

  const majorStats = majors.map((m) => {
    const me = filtered.filter((e) => e.major_id === m.id);
    if (me.length === 0) return null;
    const avg = Math.round(me.reduce((s, e) => s + (e.score / e.total) * 100, 0) / me.length);
    const pass = Math.round((me.filter((e) => (e.score / e.total) * 100 >= 60).length / me.length) * 100);
    return { name: m.name_ar.length > 18 ? m.name_ar.slice(0, 16) + "…" : m.name_ar, avg, passRate: pass, count: me.length };
  }).filter(Boolean).sort((a, b) => b!.count - a!.count).slice(0, 10) as { name: string; avg: number; passRate: number; count: number }[];

  const dist = [
    { range: "90-100%", count: filtered.filter((e) => (e.score / e.total) * 100 >= 90).length, fill: "#10b981" },
    { range: "70-89%", count: filtered.filter((e) => { const p = (e.score / e.total) * 100; return p >= 70 && p < 90; }).length, fill: "#3b82f6" },
    { range: "50-69%", count: filtered.filter((e) => { const p = (e.score / e.total) * 100; return p >= 50 && p < 70; }).length, fill: "#f59e0b" },
    { range: "أقل من 50%", count: filtered.filter((e) => (e.score / e.total) * 100 < 50).length, fill: "#ef4444" },
  ].filter((d) => d.count > 0);

  return (
    <AdminLayout>
      <PermissionGate permission="reports">
      <div className="space-y-4">
        <div><h1 className="text-2xl font-bold text-foreground">تقارير الاختبارات</h1><p className="text-sm text-muted-foreground">{total} اختبار مكتمل</p></div>
        {(() => { const ed: ExportData = { title: "تقرير الاختبارات", summary: { "الإجمالي": total, "المعدل العام": `${overallAvg}%`, "نسبة النجاح": `${passRate}%` }, headers: ["التخصص", "عدد المحاولات", "المتوسط", "نسبة النجاح"], rows: majorStats.map((m) => [m.name, m.count, `${m.avg}%`, `${m.passRate}%`]) }; return <ReportFilters filters={filters} onChange={setFilters} universities={universities} showGovernorate showUniversity showDate exportData={ed} exportFilename="تقرير_الاختبارات" />; })()}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={ClipboardCheck} label="إجمالي الاختبارات" value={total} color="bg-primary/10 text-primary" />
          <StatCard icon={TrendingUp} label="المعدل العام" value={`${overallAvg}%`} color="bg-accent/10 text-accent" />
          <StatCard icon={BookOpen} label="نسبة النجاح" value={`${passRate}%`} color="bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400" />
        </div>
        {dist.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="text-base">توزيع درجات الاختبارات</CardTitle></CardHeader><CardContent><div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={dist}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="range" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} /><YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="count" name="عدد المحاولات" radius={[4, 4, 0, 0]}>{dist.map((d, i) => <Cell key={i} fill={d.fill} />)}</Bar></BarChart></ResponsiveContainer></div></CardContent></Card>}
        {majorStats.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="text-base">متوسط الدرجات حسب التخصص</CardTitle></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={majorStats} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} /><Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "المتوسط"]} /><Bar dataKey="avg" name="المتوسط" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>}
        {majorStats.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="text-base">نسبة النجاح حسب التخصص</CardTitle></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={majorStats} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} /><YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} /><Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "نسبة النجاح"]} /><Bar dataKey="passRate" name="نسبة النجاح" fill="#10b981" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>}
        {total === 0 && <p className="text-center text-muted-foreground py-8">لا توجد بيانات اختبارات بعد</p>}
      </div>
    </AdminLayout>
  );
};

export default AdminReportsExams;
