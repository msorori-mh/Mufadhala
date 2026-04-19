import { useState, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import PermissionGate from "@/components/admin/PermissionGate";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, Repeat, Filter } from "lucide-react";

interface ModelRef {
  model_id: string;
  title: string;
  year: number;
  university_id: string | null;
  university_name: string | null;
}

interface RepeatedRow {
  normalized_hash: string;
  sample_text: string;
  occurrence_count: number;
  models: ModelRef[];
}

const AdminRepeatedPastQuestions = () => {
  const [universityId, setUniversityId] = useState<string>("all");
  const [year, setYear] = useState<string>("all");
  const [minCount, setMinCount] = useState<string>("2");
  const [search, setSearch] = useState("");

  const { data: universities = [] } = useQuery({
    queryKey: ["universities-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("universities")
        .select("id, name_ar")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: years = [] } = useQuery({
    queryKey: ["past-exam-years"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("past_exam_models")
        .select("year")
        .eq("is_published", true);
      if (error) throw error;
      return Array.from(new Set((data ?? []).map((r) => r.year))).sort((a, b) => b - a);
    },
  });

  const { data: rows = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["repeated-past-questions", universityId, year, minCount],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_repeated_past_questions", {
        _university_id: universityId === "all" ? null : universityId,
        _year: year === "all" ? null : Number(year),
        _min_count: Number(minCount) || 2,
        _limit: 300,
      });
      if (error) throw error;
      return (data ?? []) as unknown as RepeatedRow[];
    },
  });

  // إجمالي عدد النماذج المنشورة (مطبق عليه نفس فلتر الجامعة/السنة) لحساب نسبة التكرار
  const { data: totalModels = 0 } = useQuery({
    queryKey: ["published-models-count", universityId, year],
    queryFn: async () => {
      let q = supabase
        .from("past_exam_models")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true);
      if (universityId !== "all") q = q.eq("university_id", universityId);
      if (year !== "all") q = q.eq("year", Number(year));
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => r.sample_text?.toLowerCase().includes(q));
  }, [rows, search]);

  const exportCsv = () => {
    const header = ["السؤال", "عدد التكرار", "النماذج (السنة - الجامعة)"];
    const lines = [header.join(",")];
    filtered.forEach((r) => {
      const models = (r.models || [])
        .map((m) => `${m.year} - ${m.university_name ?? "—"}`)
        .join(" | ");
      const safe = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;
      lines.push([safe(r.sample_text), r.occurrence_count, safe(models)].join(","));
    });
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `repeated-past-questions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PermissionGate permission="past_exams">
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Repeat className="w-6 h-6 text-primary" />
                الأسئلة الأكثر تكراراً
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                تحليل تلقائي للأسئلة المتكررة عبر نماذج الاختبارات السابقة (عرض فقط — لا يؤثر على تجربة الطلاب)
              </p>
            </div>
            <Button onClick={exportCsv} variant="outline" disabled={!filtered.length}>
              <Download className="w-4 h-4 ml-2" />
              تصدير CSV
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="w-4 h-4" />
                الفلاتر
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">الجامعة</label>
                <Select value={universityId} onValueChange={setUniversityId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الجامعات</SelectItem>
                    {universities.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>{u.name_ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">السنة</label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل السنوات</SelectItem>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">الحد الأدنى للتكرار</label>
                <Select value={minCount} onValueChange={setMinCount}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">≥ 2 مرات</SelectItem>
                    <SelectItem value="3">≥ 3 مرات</SelectItem>
                    <SelectItem value="4">≥ 4 مرات</SelectItem>
                    <SelectItem value="5">≥ 5 مرات</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">بحث في نص السؤال</label>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="كلمة من السؤال..." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                النتائج
                <Badge variant="secondary" className="mr-2">{filtered.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading || isFetching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">
                  لا توجد أسئلة متكررة بهذه المعايير حالياً.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right w-[45%]">السؤال</TableHead>
                        <TableHead className="text-center">التكرار</TableHead>
                        <TableHead className="text-right">ظهر في النماذج</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((r) => (
                        <TableRow key={r.normalized_hash}>
                          <TableCell className="text-right align-top">
                            <div className="text-sm leading-relaxed line-clamp-3">{r.sample_text}</div>
                          </TableCell>
                          <TableCell className="text-center align-top">
                            <Badge className="bg-primary text-primary-foreground">{r.occurrence_count}</Badge>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-wrap gap-1.5">
                              {(r.models || []).map((m) => (
                                <Badge key={m.model_id} variant="outline" className="text-xs">
                                  {m.year} • {m.university_name ?? "—"}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </PermissionGate>
  );
};

export default AdminRepeatedPastQuestions;
