import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import PermissionGate from "@/components/admin/PermissionGate";
import { Loader2, CalendarIcon, ArrowUpRight, ArrowDownRight, Minus, TrendingUp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, subMonths, startOfMonth, endOfMonth, subDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  color: "hsl(var(--foreground))",
  fontSize: "12px",
};

interface DateRange { from: Date; to: Date; }

const presets: { label: string; getPeriods: () => { a: DateRange; b: DateRange } }[] = [
  {
    label: "هذا الشهر vs الشهر الماضي",
    getPeriods: () => {
      const now = new Date();
      return {
        a: { from: startOfMonth(now), to: now },
        b: { from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) },
      };
    },
  },
  {
    label: "آخر 30 يوم vs 30 يوم سابقة",
    getPeriods: () => {
      const now = new Date();
      return {
        a: { from: subDays(now, 30), to: now },
        b: { from: subDays(now, 60), to: subDays(now, 31) },
      };
    },
  },
  {
    label: "آخر 90 يوم vs 90 يوم سابقة",
    getPeriods: () => {
      const now = new Date();
      return {
        a: { from: subDays(now, 90), to: now },
        b: { from: subDays(now, 180), to: subDays(now, 91) },
      };
    },
  },
];

const DateRangePicker = ({ label, range, onChange }: { label: string; range: DateRange; onChange: (r: DateRange) => void }) => (
  <div className="flex items-center gap-2 flex-wrap">
    <span className="text-xs font-medium text-muted-foreground min-w-[60px]">{label}</span>
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8">
          <CalendarIcon className="w-3.5 h-3.5" />
          {format(range.from, "yyyy/MM/dd")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={range.from} onSelect={(d) => d && onChange({ ...range, from: d })} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
    <span className="text-xs text-muted-foreground">—</span>
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8">
          <CalendarIcon className="w-3.5 h-3.5" />
          {format(range.to, "yyyy/MM/dd")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={range.to} onSelect={(d) => d && onChange({ ...range, to: d })} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  </div>
);

const ChangeIndicator = ({ current, previous }: { current: number; previous: number }) => {
  if (previous === 0 && current === 0) return <Minus className="w-4 h-4 text-muted-foreground" />;
  if (previous === 0) return <ArrowUpRight className="w-4 h-4 text-green-500" />;
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.5) return <Minus className="w-4 h-4 text-muted-foreground" />;
  return (
    <span className={cn("flex items-center gap-0.5 text-xs font-medium", pct > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
      {pct > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
};

const MetricRow = ({ label, a, b, suffix }: { label: string; a: number; b: number; suffix?: string }) => (
  <div className="flex items-center justify-between py-3 border-b last:border-0">
    <span className="text-sm text-foreground font-medium">{label}</span>
    <div className="flex items-center gap-4">
      <div className="text-left min-w-[70px]">
        <p className="text-xs text-muted-foreground">الفترة السابقة</p>
        <p className="text-sm font-semibold text-muted-foreground">{b.toLocaleString()}{suffix}</p>
      </div>
      <div className="text-left min-w-[70px]">
        <p className="text-xs text-muted-foreground">الفترة الحالية</p>
        <p className="text-sm font-semibold text-foreground">{a.toLocaleString()}{suffix}</p>
      </div>
      <div className="min-w-[60px] flex justify-end">
        <ChangeIndicator current={a} previous={b} />
      </div>
    </div>
  </div>
);

const AdminReportsComparison = () => {
  const { loading: authLoading } = useAuth("moderator");
  const [loading, setLoading] = useState(true);

  const defaultPeriods = presets[0].getPeriods();
  const [periodA, setPeriodA] = useState<DateRange>(defaultPeriods.a);
  const [periodB, setPeriodB] = useState<DateRange>(defaultPeriods.b);

  const [students, setStudents] = useState<{ created_at: string }[]>([]);
  const [payments, setPayments] = useState<{ amount: number; status: string; created_at: string }[]>([]);
  const [subscriptions, setSubscriptions] = useState<{ status: string; created_at: string }[]>([]);
  const [exams, setExams] = useState<{ score: number; total: number; completed_at: string | null }[]>([]);

  useEffect(() => {
    if (authLoading) return;
    Promise.all([
      supabase.from("students").select("created_at"),
      supabase.from("payment_requests").select("amount, status, created_at"),
      supabase.from("subscriptions").select("status, created_at"),
      supabase.from("exam_attempts").select("score, total, completed_at").not("completed_at", "is", null),
    ]).then(([{ data: s }, { data: p }, { data: sub }, { data: e }]) => {
      if (s) setStudents(s);
      if (p) setPayments(p as any);
      if (sub) setSubscriptions(sub as any);
      if (e) setExams(e as any);
      setLoading(false);
    });
  }, [authLoading]);

  const inRange = useCallback((dateStr: string, range: DateRange) => {
    const d = new Date(dateStr);
    const end = new Date(range.to);
    end.setHours(23, 59, 59);
    return d >= range.from && d <= end;
  }, []);

  const metrics = useMemo(() => {
    const calc = (range: DateRange) => {
      const stu = students.filter((s) => inRange(s.created_at, range));
      const pay = payments.filter((p) => inRange(p.created_at, range));
      const approved = pay.filter((p) => p.status === "approved");
      const sub = subscriptions.filter((s) => inRange(s.created_at, range));
      const activeSub = sub.filter((s) => s.status === "active");
      const ex = exams.filter((e) => e.completed_at && inRange(e.completed_at, range));
      const avgScore = ex.length > 0 ? Math.round(ex.reduce((s, e) => s + (e.score / e.total) * 100, 0) / ex.length) : 0;

      return {
        newStudents: stu.length,
        totalPayments: pay.length,
        approvedPayments: approved.length,
        revenue: approved.reduce((s, p) => s + p.amount, 0),
        newSubscriptions: sub.length,
        activeSubscriptions: activeSub.length,
        totalExams: ex.length,
        avgScore,
      };
    };

    return { a: calc(periodA), b: calc(periodB) };
  }, [students, payments, subscriptions, exams, periodA, periodB, inRange]);

  if (authLoading || loading)
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );

  const chartData = [
    { name: "طلاب جدد", "الفترة الحالية": metrics.a.newStudents, "الفترة السابقة": metrics.b.newStudents },
    { name: "اشتراكات", "الفترة الحالية": metrics.a.newSubscriptions, "الفترة السابقة": metrics.b.newSubscriptions },
    { name: "طلبات دفع", "الفترة الحالية": metrics.a.totalPayments, "الفترة السابقة": metrics.b.totalPayments },
    { name: "اختبارات", "الفترة الحالية": metrics.a.totalExams, "الفترة السابقة": metrics.b.totalExams },
  ];

  return (
    <AdminLayout>
      <PermissionGate permission="reports">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="w-6 h-6" /> مقارنة الفترات الزمنية
          </h1>
          <p className="text-sm text-muted-foreground">قارن مؤشرات الأداء بين فترتين زمنيتين مختلفتين</p>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          {presets.map((p, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => {
                const { a, b } = p.getPeriods();
                setPeriodA(a);
                setPeriodB(b);
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Date pickers */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <DateRangePicker label="الفترة الحالية:" range={periodA} onChange={setPeriodA} />
            <DateRangePicker label="الفترة السابقة:" range={periodB} onChange={setPeriodB} />
          </CardContent>
        </Card>

        {/* Metrics comparison */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">ملخص المقارنة</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <MetricRow label="طلاب جدد" a={metrics.a.newStudents} b={metrics.b.newStudents} />
            <MetricRow label="الإيرادات (ريال)" a={metrics.a.revenue} b={metrics.b.revenue} />
            <MetricRow label="طلبات الدفع المقبولة" a={metrics.a.approvedPayments} b={metrics.b.approvedPayments} />
            <MetricRow label="اشتراكات جديدة" a={metrics.a.newSubscriptions} b={metrics.b.newSubscriptions} />
            <MetricRow label="اشتراكات فعالة" a={metrics.a.activeSubscriptions} b={metrics.b.activeSubscriptions} />
            <MetricRow label="اختبارات مكتملة" a={metrics.a.totalExams} b={metrics.b.totalExams} />
            <MetricRow label="متوسط الدرجات" a={metrics.a.avgScore} b={metrics.b.avgScore} suffix="%" />
          </CardContent>
        </Card>

        {/* Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">مقارنة بصرية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Bar dataKey="الفترة الحالية" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="الفترة السابقة" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.5} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      </PermissionGate>
    </AdminLayout>
  );
};

export default AdminReportsComparison;
