import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useModeratorScope } from "@/hooks/useModeratorScope";
import AdminLayout from "@/components/admin/AdminLayout";
import { Loader2, Users, DollarSign, CreditCard, TrendingUp, BookOpen, ClipboardCheck } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
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

interface PaymentRow {
  id: string; amount: number; currency: string; status: string;
  created_at: string; user_id: string;
}

interface SubRow {
  id: string; user_id: string; status: string;
  starts_at: string | null; expires_at: string | null; created_at: string;
}

interface ExamRow {
  id: string; student_id: string; major_id: string;
  score: number; total: number; completed_at: string | null;
}

const AdminReports = () => {
  const { loading: authLoading, isAdmin, user } = useAuth("moderator");
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Tables<"students">[]>([]);
  const [universities, setUniversities] = useState<Tables<"universities">[]>([]);
  const [colleges, setColleges] = useState<Tables<"colleges">[]>([]);
  const [majors, setMajors] = useState<Tables<"majors">[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubRow[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);

  useEffect(() => {
    if (authLoading) return;
    const fetch = async () => {
      const [{ data: s }, { data: u }, { data: c }, { data: m }, { data: p }, { data: sub }, { data: ex }] = await Promise.all([
        supabase.from("students").select("*"),
        supabase.from("universities").select("*").order("display_order"),
        supabase.from("colleges").select("*").order("display_order"),
        supabase.from("majors").select("*").order("display_order"),
        supabase.from("payment_requests").select("id, amount, currency, status, created_at, user_id"),
        supabase.from("subscriptions").select("id, user_id, status, starts_at, expires_at, created_at"),
        supabase.from("exam_attempts").select("id, student_id, major_id, score, total, completed_at").not("completed_at", "is", null),
      ]);
      if (s) setStudents(s);
      if (u) setUniversities(u);
      if (c) setColleges(c);
      if (m) setMajors(m);
      if (p) setPayments(p as PaymentRow[]);
      if (sub) setSubscriptions(sub as SubRow[]);
      if (ex) setExams(ex as ExamRow[]);
      setLoading(false);
    };
    fetch();
  }, [authLoading]);

  const { loading: scopeLoading, getAllowedMajorIds } = useModeratorScope(
    user?.id, isAdmin, universities, colleges, majors
  );

  const scopedStudents = useMemo(() => {
    const allowed = getAllowedMajorIds();
    if (!allowed) return students;
    return students.filter((s) => s.major_id && allowed.has(s.major_id));
  }, [students, getAllowedMajorIds, isAdmin]);

  if (authLoading || loading || scopeLoading) {
    return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AdminLayout>;
  }

  // ==================== STUDENTS DATA ====================
  const uniCounts = universities.map((u) => ({
    name: u.name_ar.length > 20 ? u.name_ar.slice(0, 18) + "…" : u.name_ar,
    count: scopedStudents.filter((s) => s.university_id === u.id).length,
  })).filter((d) => d.count > 0);

  const collegeCounts = colleges
    .map((c) => ({ name: c.name_ar.length > 20 ? c.name_ar.slice(0, 18) + "…" : c.name_ar, count: scopedStudents.filter((s) => s.college_id === c.id).length }))
    .filter((d) => d.count > 0).sort((a, b) => b.count - a.count).slice(0, 10);

  const govMap: Record<string, number> = {};
  scopedStudents.forEach((s) => { const gov = s.governorate || "غير محدد"; govMap[gov] = (govMap[gov] || 0) + 1; });
  const govData = Object.entries(govMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const gpaRanges = [
    { label: "90-100%", min: 90, max: 100 }, { label: "80-89%", min: 80, max: 89.99 },
    { label: "70-79%", min: 70, max: 79.99 }, { label: "60-69%", min: 60, max: 69.99 },
    { label: "أقل من 60%", min: 0, max: 59.99 },
  ];
  const gpaData = gpaRanges.map((r) => ({
    name: r.label, count: scopedStudents.filter((s) => s.gpa !== null && s.gpa >= r.min && s.gpa <= r.max).length,
  })).filter((d) => d.count > 0);

  const majorCounts = majors.map((m) => ({
    name: m.name_ar.length > 20 ? m.name_ar.slice(0, 18) + "…" : m.name_ar,
    count: scopedStudents.filter((s) => s.major_id === m.id).length,
  })).filter((d) => d.count > 0).sort((a, b) => b.count - a.count).slice(0, 10);

  const avgGpa = scopedStudents.filter((s) => s.gpa).length > 0
    ? (scopedStudents.filter((s) => s.gpa).reduce((sum, s) => sum + (s.gpa || 0), 0) / scopedStudents.filter((s) => s.gpa).length).toFixed(1)
    : "—";

  // ==================== PAYMENTS DATA ====================
  const approvedPayments = payments.filter((p) => p.status === "approved");
  const totalRevenue = approvedPayments.reduce((s, p) => s + p.amount, 0);
  const pendingPayments = payments.filter((p) => p.status === "pending").length;
  const rejectedPayments = payments.filter((p) => p.status === "rejected").length;

  const paymentStatusData = [
    { name: "مقبول", value: approvedPayments.length, fill: "#10b981" },
    { name: "معلق", value: pendingPayments, fill: "#f59e0b" },
    { name: "مرفوض", value: rejectedPayments, fill: "#ef4444" },
  ].filter((d) => d.value > 0);

  // Revenue by zone (based on student governorate)
  const ZONE_A = ["صنعاء", "أمانة العاصمة", "عمران", "ذمار", "إب", "الحديدة", "صعدة", "حجة", "المحويت", "ريمة", "تعز"];
  let revenueZoneA = 0, revenueZoneB = 0, revenueUnknown = 0;
  approvedPayments.forEach((p) => {
    const st = students.find((s) => s.user_id === p.user_id);
    if (!st?.governorate) { revenueUnknown += p.amount; return; }
    if (ZONE_A.some((g) => st.governorate!.includes(g))) revenueZoneA += p.amount;
    else revenueZoneB += p.amount;
  });
  const revenueByZone = [
    { name: "المنطقة أ", value: revenueZoneA },
    { name: "المنطقة ب", value: revenueZoneB },
    ...(revenueUnknown > 0 ? [{ name: "غير محدد", value: revenueUnknown }] : []),
  ].filter((d) => d.value > 0);

  // Monthly revenue trend
  const monthlyRevenue: Record<string, number> = {};
  approvedPayments.forEach((p) => {
    const key = new Date(p.created_at).toLocaleDateString("ar", { year: "numeric", month: "short" });
    monthlyRevenue[key] = (monthlyRevenue[key] || 0) + p.amount;
  });
  const revenueChartData = Object.entries(monthlyRevenue).map(([name, amount]) => ({ name, amount }));

  // ==================== SUBSCRIPTIONS DATA ====================
  const activeSubs = subscriptions.filter((s) => s.status === "active").length;
  const pendingSubs = subscriptions.filter((s) => s.status === "pending").length;
  const expiredSubs = subscriptions.filter((s) => s.status === "expired").length;
  const cancelledSubs = subscriptions.filter((s) => s.status === "cancelled").length;
  const conversionRate = students.length > 0 ? ((activeSubs / students.length) * 100).toFixed(1) : "0";

  const subStatusData = [
    { name: "فعال", value: activeSubs, fill: "#10b981" },
    { name: "معلق", value: pendingSubs, fill: "#f59e0b" },
    { name: "منتهي", value: expiredSubs, fill: "#94a3b8" },
    { name: "ملغي", value: cancelledSubs, fill: "#ef4444" },
  ].filter((d) => d.value > 0);

  // ==================== EXAMS DATA ====================
  const totalExams = exams.length;
  const overallAvg = totalExams > 0 ? Math.round(exams.reduce((s, e) => s + (e.score / e.total) * 100, 0) / totalExams) : 0;
  const passRate = totalExams > 0 ? Math.round((exams.filter((e) => (e.score / e.total) * 100 >= 60).length / totalExams) * 100) : 0;

  // Exam stats per major
  const majorExamStats = majors.map((m) => {
    const majorExams = exams.filter((e) => e.major_id === m.id);
    if (majorExams.length === 0) return null;
    const avg = Math.round(majorExams.reduce((s, e) => s + (e.score / e.total) * 100, 0) / majorExams.length);
    const pass = Math.round((majorExams.filter((e) => (e.score / e.total) * 100 >= 60).length / majorExams.length) * 100);
    return { name: m.name_ar.length > 18 ? m.name_ar.slice(0, 16) + "…" : m.name_ar, avg, passRate: pass, count: majorExams.length };
  }).filter(Boolean).sort((a, b) => b!.count - a!.count).slice(0, 10) as { name: string; avg: number; passRate: number; count: number }[];

  // Exam score distribution
  const examDistribution = [
    { range: "90-100%", count: exams.filter((e) => { const p = (e.score / e.total) * 100; return p >= 90; }).length, fill: "#10b981" },
    { range: "70-89%", count: exams.filter((e) => { const p = (e.score / e.total) * 100; return p >= 70 && p < 90; }).length, fill: "#3b82f6" },
    { range: "50-69%", count: exams.filter((e) => { const p = (e.score / e.total) * 100; return p >= 50 && p < 70; }).length, fill: "#f59e0b" },
    { range: "أقل من 50%", count: exams.filter((e) => { const p = (e.score / e.total) * 100; return p < 50; }).length, fill: "#ef4444" },
  ].filter((d) => d.count > 0);

  // ==================== STAT CARD COMPONENT ====================
  const StatCard = ({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) => (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">التقارير والإحصائيات</h1>
          <p className="text-sm text-muted-foreground">
            {scopedStudents.length} طالب • {totalExams} اختبار • {approvedPayments.length} عملية دفع
          </p>
        </div>

        <Tabs defaultValue="students" dir="rtl">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="students">الطلاب</TabsTrigger>
            <TabsTrigger value="payments">الدفع</TabsTrigger>
            <TabsTrigger value="subscriptions">الاشتراكات</TabsTrigger>
            <TabsTrigger value="exams">الاختبارات</TabsTrigger>
          </TabsList>

          {/* ===== STUDENTS TAB ===== */}
          <TabsContent value="students" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Users} label="إجمالي الطلاب" value={scopedStudents.length} color="bg-primary/10 text-primary" />
              <StatCard icon={TrendingUp} label="متوسط المعدل" value={`${avgGpa}%`} color="bg-accent/10 text-accent" />
            </div>

            {gpaData.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">توزيع المعدلات</CardTitle></CardHeader>
                <CardContent><div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gpaData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis dataKey="name" type="category" width={85} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" name="عدد الطلاب" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div></CardContent>
              </Card>
            )}

            {uniCounts.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">الطلاب حسب الجامعة</CardTitle></CardHeader>
                <CardContent><div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={uniCounts}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} angle={-30} textAnchor="end" height={70} />
                      <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" name="عدد الطلاب" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div></CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {govData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">التوزيع حسب المحافظة</CardTitle></CardHeader>
                  <CardContent><div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={govData} cx="50%" cy="50%" innerRadius={45} outerRadius={85} dataKey="value" nameKey="name"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                          {govData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div></CardContent>
                </Card>
              )}

              {majorCounts.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">أكثر التخصصات طلباً</CardTitle></CardHeader>
                  <CardContent><div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={majorCounts} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" name="عدد الطلاب" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div></CardContent>
                </Card>
              )}
            </div>

            {collegeCounts.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">أكثر الكليات طلاباً</CardTitle></CardHeader>
                <CardContent><div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={collegeCounts}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} angle={-30} textAnchor="end" height={70} />
                      <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" name="عدد الطلاب" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div></CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ===== PAYMENTS TAB ===== */}
          <TabsContent value="payments" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={DollarSign} label="إجمالي الإيرادات" value={totalRevenue.toLocaleString()} sub="ريال يمني" color="bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400" />
              <StatCard icon={CreditCard} label="إجمالي الطلبات" value={payments.length} sub={`${pendingPayments} معلق`} color="bg-primary/10 text-primary" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {paymentStatusData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">حالة الطلبات</CardTitle></CardHeader>
                  <CardContent><div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={paymentStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value" nameKey="name"
                          label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={11}>
                          {paymentStatusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div></CardContent>
                </Card>
              )}

              {revenueByZone.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">الإيرادات حسب المنطقة</CardTitle></CardHeader>
                  <CardContent><div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={revenueByZone} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value" nameKey="name"
                          label={({ name, value }) => `${name}: ${value.toLocaleString()}`} labelLine={false} fontSize={11}>
                          {revenueByZone.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div></CardContent>
                </Card>
              )}
            </div>

            {revenueChartData.length > 1 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">الإيرادات الشهرية</CardTitle></CardHeader>
                <CardContent><div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="amount" name="الإيرادات" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div></CardContent>
              </Card>
            )}

            {payments.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد بيانات دفع بعد</p>}
          </TabsContent>

          {/* ===== SUBSCRIPTIONS TAB ===== */}
          <TabsContent value="subscriptions" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Users} label="مشتركون فعالون" value={activeSubs} color="bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400" />
              <StatCard icon={TrendingUp} label="معدل التحويل" value={`${conversionRate}%`} sub="من التسجيل إلى الاشتراك" color="bg-primary/10 text-primary" />
            </div>

            {subStatusData.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">حالة الاشتراكات</CardTitle></CardHeader>
                <CardContent><div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={subStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value" nameKey="name"
                        label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={11}>
                        {subStatusData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div></CardContent>
              </Card>
            )}

            {subscriptions.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد بيانات اشتراكات بعد</p>}
          </TabsContent>

          {/* ===== EXAMS TAB ===== */}
          <TabsContent value="exams" className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-3">
              <StatCard icon={ClipboardCheck} label="إجمالي الاختبارات" value={totalExams} color="bg-primary/10 text-primary" />
              <StatCard icon={TrendingUp} label="المعدل العام" value={`${overallAvg}%`} color="bg-accent/10 text-accent" />
              <StatCard icon={BookOpen} label="نسبة النجاح" value={`${passRate}%`} color="bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400" />
            </div>

            {examDistribution.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">توزيع درجات الاختبارات</CardTitle></CardHeader>
                <CardContent><div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={examDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="range" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" name="عدد المحاولات" radius={[4, 4, 0, 0]}>
                        {examDistribution.map((d, i) => <Cell key={i} fill={d.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div></CardContent>
              </Card>
            )}

            {majorExamStats.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">أداء التخصصات — متوسط الدرجات</CardTitle></CardHeader>
                <CardContent><div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={majorExamStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [`${v}%`, name]} />
                      <Bar dataKey="avg" name="المتوسط" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div></CardContent>
              </Card>
            )}

            {majorExamStats.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">نسبة النجاح حسب التخصص</CardTitle></CardHeader>
                <CardContent><div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={majorExamStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "نسبة النجاح"]} />
                      <Bar dataKey="passRate" name="نسبة النجاح" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div></CardContent>
              </Card>
            )}

            {totalExams === 0 && <p className="text-center text-muted-foreground py-8">لا توجد بيانات اختبارات بعد</p>}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
