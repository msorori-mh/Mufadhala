import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExportData } from "@/lib/exportReport";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import PermissionGate from "@/components/admin/PermissionGate";
import ReportFilters, { type ReportFilterValues } from "@/components/admin/ReportFilters";
import { Loader2, DollarSign, CreditCard } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import type { Tables } from "@/integrations/supabase/types";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "#f59e0b", "#10b981"];
const tooltipStyle = { backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))", fontSize: "12px" };
const ZONE_A = ["صنعاء", "أمانة العاصمة", "عمران", "ذمار", "إب", "الحديدة", "صعدة", "حجة", "المحويت", "ريمة"];

interface PaymentRow { id: string; amount: number; currency: string; status: string; created_at: string; user_id: string; }

const StatCard = ({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) => (
  <Card><CardContent className="p-4 flex items-center gap-3">
    <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center shrink-0`}><Icon className="w-5 h-5" /></div>
    <div><p className="text-xl font-bold text-foreground">{value}</p><p className="text-xs text-muted-foreground">{label}</p>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</div>
  </CardContent></Card>
);

const AdminReportsPayments = () => {
  const { loading: authLoading } = useAuth("moderator");
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [students, setStudents] = useState<Tables<"students">[]>([]);
  const [universities, setUniversities] = useState<Tables<"universities">[]>([]);
  const [filters, setFilters] = useState<ReportFilterValues>({});

  useEffect(() => {
    if (authLoading) return;
    Promise.all([
      supabase.from("payment_requests").select("id, amount, currency, status, created_at, user_id"),
      supabase.from("students").select("*"),
      supabase.from("universities").select("*").order("display_order"),
      supabase.from("user_roles").select("user_id, role"),
    ]).then(([{ data: p }, { data: s }, { data: u }, { data: roles }]) => {
      const staffIds = new Set(
        (roles || []).filter((r) => r.role === "admin" || r.role === "moderator").map((r) => r.user_id)
      );
      if (p) setPayments((p as PaymentRow[]).filter((pay) => !staffIds.has(pay.user_id)));
      if (s) setStudents(s.filter((st) => !staffIds.has(st.user_id)));
      if (u) setUniversities(u);
      setLoading(false);
    });
  }, [authLoading]);

  const filtered = useMemo(() => {
    let list = payments;
    if (filters.dateFrom) list = list.filter((p) => new Date(p.created_at) >= filters.dateFrom!);
    if (filters.dateTo) { const end = new Date(filters.dateTo); end.setHours(23, 59, 59); list = list.filter((p) => new Date(p.created_at) <= end); }
    if (filters.universityId || filters.governorate) {
      const userIds = new Set(students.filter((s) => {
        if (filters.universityId && s.university_id !== filters.universityId) return false;
        if (filters.governorate && s.governorate !== filters.governorate) return false;
        return true;
      }).map((s) => s.user_id));
      list = list.filter((p) => userIds.has(p.user_id));
    }
    return list;
  }, [payments, students, filters]);

  if (authLoading || loading) return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AdminLayout>;

  const approved = filtered.filter((p) => p.status === "approved");
  const totalRevenue = approved.reduce((s, p) => s + p.amount, 0);
  const pending = filtered.filter((p) => p.status === "pending").length;
  const rejected = filtered.filter((p) => p.status === "rejected").length;

  const statusData = [
    { name: "مقبول", value: approved.length, fill: "#10b981" },
    { name: "معلق", value: pending, fill: "#f59e0b" },
    { name: "مرفوض", value: rejected, fill: "#ef4444" },
  ].filter((d) => d.value > 0);

  let zoneA = 0, zoneB = 0, zoneUnknown = 0;
  approved.forEach((p) => {
    const st = students.find((s) => s.user_id === p.user_id);
    if (!st?.governorate) { zoneUnknown += p.amount; return; }
    if (ZONE_A.some((g) => st.governorate!.includes(g))) zoneA += p.amount;
    else zoneB += p.amount;
  });
  const revenueByZone = [
    { name: "المنطقة ب", value: zoneA }, { name: "المنطقة أ", value: zoneB },
    ...(zoneUnknown > 0 ? [{ name: "غير محدد", value: zoneUnknown }] : []),
  ].filter((d) => d.value > 0);

  const monthly: Record<string, number> = {};
  approved.forEach((p) => { const k = new Date(p.created_at).toLocaleDateString("ar", { year: "numeric", month: "short" }); monthly[k] = (monthly[k] || 0) + p.amount; });
  const revenueChart = Object.entries(monthly).map(([name, amount]) => ({ name, amount }));

  return (
    <AdminLayout>
      <PermissionGate permission="reports">
      <div className="space-y-4">
        <div><h1 className="text-2xl font-bold text-foreground">تقارير الدفع والإيرادات</h1><p className="text-sm text-muted-foreground">{filtered.length} طلب دفع • {approved.length} مقبول</p></div>
        {(() => { const ed: ExportData = { title: "تقرير الدفع والإيرادات", summary: { "إجمالي الإيرادات": `${totalRevenue.toLocaleString()} ريال`, "المقبولة": approved.length, "المعلقة": pending, "المرفوضة": rejected }, headers: ["المبلغ", "العملة", "الحالة", "التاريخ"], rows: filtered.map((p) => [p.amount, p.currency, p.status === "approved" ? "مقبول" : p.status === "pending" ? "معلق" : "مرفوض", new Date(p.created_at).toLocaleDateString("ar")]) }; return <ReportFilters filters={filters} onChange={setFilters} universities={universities} showGovernorate showUniversity showDate exportData={ed} exportFilename="تقرير_الدفع" />; })()}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={DollarSign} label="إجمالي الإيرادات" value={totalRevenue.toLocaleString()} sub="ريال يمني" color="bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400" />
          <StatCard icon={CreditCard} label="إجمالي الطلبات" value={filtered.length} sub={`${pending} معلق`} color="bg-primary/10 text-primary" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {statusData.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="text-base">حالة الطلبات</CardTitle></CardHeader><CardContent><div className="h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={11}>{statusData.map((d, i) => <Cell key={i} fill={d.fill} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer></div></CardContent></Card>}
          {revenueByZone.length > 0 && <Card><CardHeader className="pb-2"><CardTitle className="text-base">الإيرادات حسب المنطقة</CardTitle></CardHeader><CardContent><div className="h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={revenueByZone} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value.toLocaleString()}`} labelLine={false} fontSize={11}>{revenueByZone.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer></div></CardContent></Card>}
        </div>
        {revenueChart.length > 1 && <Card><CardHeader className="pb-2"><CardTitle className="text-base">الإيرادات الشهرية</CardTitle></CardHeader><CardContent><div className="h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={revenueChart}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} /><YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} /><Tooltip contentStyle={tooltipStyle} /><Line type="monotone" dataKey="amount" name="الإيرادات" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></div></CardContent></Card>}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد بيانات دفع بعد</p>}
      </div>
      </PermissionGate>
    </AdminLayout>
  );
};

export default AdminReportsPayments;
