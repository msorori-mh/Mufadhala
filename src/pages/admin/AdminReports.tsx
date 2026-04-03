import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useModeratorScope } from "@/hooks/useModeratorScope";
import AdminLayout from "@/components/admin/AdminLayout";
import { Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import type { Tables } from "@/integrations/supabase/types";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#6366f1",
];

const AdminReports = () => {
  const { loading: authLoading, isAdmin, user } = useAuth("moderator");
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Tables<"students">[]>([]);
  const [universities, setUniversities] = useState<Tables<"universities">[]>([]);
  const [colleges, setColleges] = useState<Tables<"colleges">[]>([]);
  const [majors, setMajors] = useState<Tables<"majors">[]>([]);

  useEffect(() => {
    if (authLoading) return;
    const fetch = async () => {
      const [{ data: s }, { data: u }, { data: c }, { data: m }] = await Promise.all([
        supabase.from("students").select("*"),
        supabase.from("universities").select("*").order("display_order"),
        supabase.from("colleges").select("*").order("display_order"),
        supabase.from("majors").select("*").order("display_order"),
      ]);
      if (s) setStudents(s);
      if (u) setUniversities(u);
      if (c) setColleges(c);
      if (m) setMajors(m);
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
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  // --- Data prep ---

  // Students per university
  const uniCounts = universities.map((u) => ({
    name: u.name_ar.length > 20 ? u.name_ar.slice(0, 18) + "…" : u.name_ar,
    count: students.filter((s) => s.university_id === u.id).length,
  })).filter((d) => d.count > 0);

  // Students per college (top 10)
  const collegeCounts = colleges
    .map((c) => ({
      name: c.name_ar.length > 20 ? c.name_ar.slice(0, 18) + "…" : c.name_ar,
      count: students.filter((s) => s.college_id === c.id).length,
    }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Students per governorate
  const govMap: Record<string, number> = {};
  students.forEach((s) => {
    const gov = s.governorate || "غير محدد";
    govMap[gov] = (govMap[gov] || 0) + 1;
  });
  const govData = Object.entries(govMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // GPA distribution
  const gpaRanges = [
    { label: "90-100%", min: 90, max: 100 },
    { label: "80-89%", min: 80, max: 89.99 },
    { label: "70-79%", min: 70, max: 79.99 },
    { label: "60-69%", min: 60, max: 69.99 },
    { label: "أقل من 60%", min: 0, max: 59.99 },
  ];
  const gpaData = gpaRanges.map((range) => ({
    name: range.label,
    count: students.filter((s) => s.gpa !== null && s.gpa >= range.min && s.gpa <= range.max).length,
  })).filter((d) => d.count > 0);

  // Students per major (top 10)
  const majorCounts = majors
    .map((m) => ({
      name: m.name_ar.length > 20 ? m.name_ar.slice(0, 18) + "…" : m.name_ar,
      count: students.filter((s) => s.major_id === m.id).length,
    }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Summary stats
  const avgGpa = students.filter((s) => s.gpa).length > 0
    ? (students.filter((s) => s.gpa).reduce((sum, s) => sum + (s.gpa || 0), 0) / students.filter((s) => s.gpa).length).toFixed(1)
    : "—";

  const customTooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    color: "hsl(var(--foreground))",
    fontSize: "12px",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">التقارير والإحصائيات</h1>
          <p className="text-sm text-muted-foreground">
            إجمالي الطلاب: {students.length} • متوسط المعدل: {avgGpa}%
          </p>
        </div>

        {/* GPA Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">توزيع المعدلات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gpaData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis dataKey="name" type="category" width={85} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={customTooltipStyle} />
                  <Bar dataKey="count" name="عدد الطلاب" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Students per University */}
        {uniCounts.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">الطلاب حسب الجامعة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={uniCounts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} angle={-30} textAnchor="end" height={70} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={customTooltipStyle} />
                    <Bar dataKey="count" name="عدد الطلاب" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Governorate Pie */}
          {govData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">التوزيع حسب المحافظة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={govData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                        fontSize={10}
                      >
                        {govData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={customTooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Majors */}
          {majorCounts.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">أكثر التخصصات طلباً</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={majorCounts} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={customTooltipStyle} />
                      <Bar dataKey="count" name="عدد الطلاب" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Top Colleges */}
        {collegeCounts.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">أكثر الكليات طلاباً</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={collegeCounts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} angle={-30} textAnchor="end" height={70} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={customTooltipStyle} />
                    <Bar dataKey="count" name="عدد الطلاب" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
