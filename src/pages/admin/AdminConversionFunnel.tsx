import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import PermissionGate from "@/components/admin/PermissionGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCcw, Target, TrendingUp, Users, MousePointerClick } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  exam_simulator: { label: "محاكي الاختبارات", color: "hsl(var(--primary))" },
  ai_generator: { label: "مولد الأسئلة (مفاضل)", color: "hsl(var(--accent))" },
  past_exams: { label: "النماذج السابقة", color: "hsl(var(--secondary))" },
  ai_performance: { label: "تحليل الأداء بالذكاء الاصطناعي", color: "hsl(var(--chart-4, var(--primary)))" },
  chat_widget: { label: "المساعد الذكي", color: "hsl(var(--chart-5, var(--accent)))" },
};

const ALL_SOURCES = Object.keys(SOURCE_LABELS);

interface FunnelRow {
  source: string;
  total_clicks: number;
  unique_users: number;
  conversions: number;
}

const AdminConversionFunnelInner = () => {
  const [days, setDays] = useState<number>(30);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["conversion-funnel", days],
    queryFn: async (): Promise<FunnelRow[]> => {
      const { data, error } = await supabase.rpc("get_conversion_funnel_stats", { _days: days });
      if (error) throw error;
      // Ensure all 5 sources appear even if zero
      const map = new Map<string, FunnelRow>();
      ALL_SOURCES.forEach(s => map.set(s, { source: s, total_clicks: 0, unique_users: 0, conversions: 0 }));
      (data || []).forEach((r: any) => map.set(r.source, {
        source: r.source,
        total_clicks: Number(r.total_clicks || 0),
        unique_users: Number(r.unique_users || 0),
        conversions: Number(r.conversions || 0),
      }));
      return Array.from(map.values()).sort((a, b) => b.total_clicks - a.total_clicks);
    },
    staleTime: 30_000,
  });

  const totalClicks = (data || []).reduce((sum, r) => sum + r.total_clicks, 0);
  const totalUsers = (data || []).reduce((sum, r) => sum + r.unique_users, 0);
  const totalConversions = (data || []).reduce((sum, r) => sum + r.conversions, 0);
  const overallRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : "0";

  const chartData = (data || []).map(r => ({
    name: SOURCE_LABELS[r.source]?.label ?? r.source,
    clicks: r.total_clicks,
    color: SOURCE_LABELS[r.source]?.color ?? "hsl(var(--primary))",
  }));

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            قمع التحويل
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            قياس فعالية كل نقطة تماس مع رابط الاشتراك
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <TabsList>
              <TabsTrigger value="7">7 أيام</TabsTrigger>
              <TabsTrigger value="30">30 يوم</TabsTrigger>
              <TabsTrigger value="90">90 يوم</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCcw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={<MousePointerClick className="w-4 h-4" />} label="إجمالي النقرات" value={totalClicks} loading={isLoading} />
        <KpiCard icon={<Users className="w-4 h-4" />} label="مستخدمون فريدون" value={totalUsers} loading={isLoading} />
        <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="اشتراكات بعد النقر" value={totalConversions} loading={isLoading} />
        <KpiCard icon={<Target className="w-4 h-4" />} label="نسبة التحويل" value={`${overallRate}%`} loading={isLoading} />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">توزيع النقرات حسب نقطة التماس</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="clicks" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Detailed table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">تفاصيل نقاط التماس</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-right p-3 font-medium">نقطة التماس</th>
                    <th className="text-right p-3 font-medium">النقرات</th>
                    <th className="text-right p-3 font-medium">مستخدمون فريدون</th>
                    <th className="text-right p-3 font-medium">اشتراكات</th>
                    <th className="text-right p-3 font-medium">معدل التحويل</th>
                    <th className="text-right p-3 font-medium">الحصة</th>
                  </tr>
                </thead>
                <tbody>
                  {(data || []).map((row) => {
                    const cfg = SOURCE_LABELS[row.source];
                    const conversionRate = row.total_clicks > 0
                      ? ((row.conversions / row.total_clicks) * 100).toFixed(1)
                      : "0";
                    const share = totalClicks > 0
                      ? ((row.total_clicks / totalClicks) * 100).toFixed(1)
                      : "0";
                    return (
                      <tr key={row.source} className="border-t border-border hover:bg-muted/30">
                        <td className="p-3 font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: cfg?.color }} />
                            {cfg?.label ?? row.source}
                          </div>
                        </td>
                        <td className="p-3 tabular-nums">{row.total_clicks}</td>
                        <td className="p-3 tabular-nums">{row.unique_users}</td>
                        <td className="p-3 tabular-nums">{row.conversions}</td>
                        <td className="p-3 tabular-nums">
                          <span className={Number(conversionRate) > 0 ? "text-primary font-medium" : "text-muted-foreground"}>
                            {conversionRate}%
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-[60px]">
                              <div
                                className="h-full transition-all"
                                style={{ width: `${share}%`, background: cfg?.color }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums w-10">{share}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        * يُحسب الاشتراك للمستخدم إذا أنشأ اشتراكاً (نشط أو معلّق) بعد نقره على نقطة التماس
      </p>
    </div>
  );
};

const KpiCard = ({ icon, label, value, loading }: { icon: React.ReactNode; label: string; value: number | string; loading: boolean }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
        {icon}
        <span>{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-16" />
      ) : (
        <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
      )}
    </CardContent>
  </Card>
);

const AdminConversionFunnel = () => (
  <AdminLayout>
    <PermissionGate permission="reports">
      <AdminConversionFunnelInner />
    </PermissionGate>
  </AdminLayout>
);

export default AdminConversionFunnel;
