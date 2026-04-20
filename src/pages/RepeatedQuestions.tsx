import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStudentData } from "@/hooks/useStudentData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import NativeSelect from "@/components/NativeSelect";
import {
  ArrowRight,
  Search,
  Repeat,
  BookOpen,
  FileText,
  Filter,
  TrendingUp,
} from "lucide-react";

type ModelInfo = {
  model_id: string;
  title: string;
  year: number;
  university_id: string | null;
  university_name: string | null;
};

type RepeatedRow = {
  normalized_hash: string;
  sample_text: string;
  occurrence_count: number;
  models: ModelInfo[];
  linked_lesson_id: string | null;
};

const MIN_COUNT_OPTIONS = [2, 3, 4, 5];

const RepeatedQuestions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: student } = useStudentData(user?.id);

  const [universityId, setUniversityId] = useState<string>(""); // "" => student's, "all" => all
  const [year, setYear] = useState<string>("all");
  const [minCount, setMinCount] = useState<number>(2);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Universities for filter
  const { data: universities = [] } = useQuery({
    queryKey: ["repeated-universities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("universities")
        .select("id, name_ar")
        .eq("is_active", true)
        .order("display_order");
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Effective filter: default to student's university; "all" => null
  const effectiveUniversityId = useMemo(() => {
    if (universityId === "all") return null;
    if (universityId) return universityId;
    return student?.university_id || null;
  }, [universityId, student?.university_id]);

  const effectiveYear = year === "all" ? null : parseInt(year, 10);

  // Years for filter (derived from published models of selected uni or all)
  const { data: years = [] } = useQuery({
    queryKey: ["repeated-years", effectiveUniversityId],
    queryFn: async () => {
      let q = supabase
        .from("past_exam_models")
        .select("year")
        .eq("is_published", true);
      if (effectiveUniversityId) q = q.eq("university_id", effectiveUniversityId);
      const { data } = await q;
      const set = new Set<number>();
      (data || []).forEach((r: any) => set.add(r.year));
      return Array.from(set).sort((a, b) => b - a);
    },
    staleTime: 60 * 1000,
  });

  // Repeated questions
  const { data: rows = [], isLoading } = useQuery<RepeatedRow[]>({
    queryKey: [
      "repeated-questions-student",
      effectiveUniversityId,
      effectiveYear,
      minCount,
    ],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_top_repeated_past_questions_for_students" as any,
        {
          _university_id: effectiveUniversityId,
          _year: effectiveYear,
          _min_count: minCount,
          _limit: 200,
        }
      );
      if (error) throw error;
      return (data as any[]) as RepeatedRow[];
    },
    staleTime: 60 * 1000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.sample_text?.toLowerCase().includes(q));
  }, [rows, search]);

  const totalModelsForUni = years.length; // approximate denominator hint
  const universityName =
    universities.find((u) => u.id === effectiveUniversityId)?.name_ar ||
    (effectiveUniversityId ? "" : "كل الجامعات");

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/past-exams")}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Repeat className="w-5 h-5 text-primary" />
              <span>الأسئلة الأكثر تكراراً</span>
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              ركّز على ما يتكرر فعلياً في الاختبارات
            </p>
          </div>
          {!isLoading && (
            <Badge variant="secondary" className="shrink-0">
              {filtered.length}
            </Badge>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="w-3.5 h-3.5" />
              <span>فلاتر البحث</span>
            </div>

            {/* University */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">الجامعة</label>
              <NativeSelect
                value={universityId || (student?.university_id ?? "")}
                onValueChange={setUniversityId}
                placeholder="اختر جامعة"
                options={[
                  { value: "all", label: "كل الجامعات" },
                  ...universities.map((u) => ({ value: u.id, label: u.name_ar })),
                ]}
              />
            </div>

            {/* Year */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">السنة</label>
              <NativeSelect
                value={year}
                onValueChange={setYear}
                placeholder="كل السنوات"
                options={[
                  { value: "all", label: "كل السنوات" },
                  ...years.map((y) => ({ value: String(y), label: String(y) })),
                ]}
              />
            </div>

            {/* Min count chips */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                الحد الأدنى للتكرار
              </label>
              <div className="flex flex-wrap gap-1.5">
                {MIN_COUNT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setMinCount(n)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      minCount === n
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    ≥ {n} مرات
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث في نصوص الأسئلة..."
                className="pr-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Repeat className="w-12 h-12 mx-auto mb-3 opacity-40 text-muted-foreground" />
            <p className="text-foreground font-medium mb-1">
              لا توجد أسئلة متكررة بهذه الفلاتر
            </p>
            <p className="text-sm text-muted-foreground">
              جرّب تخفيض الحد الأدنى للتكرار أو اختر "كل الجامعات/السنوات"
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((row, idx) => {
              const isExpanded = !!expanded[row.normalized_hash];
              const visibleModels = isExpanded
                ? row.models
                : row.models.slice(0, 5);
              const firstModel = row.models[0];
              return (
                <Card
                  key={row.normalized_hash}
                  className="transition-shadow hover:shadow-md"
                >
                  <CardContent className="p-4 space-y-3">
                    {/* Rank + count */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] border-primary/30 text-primary"
                        >
                          #{idx + 1}
                        </Badge>
                        <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/15 border border-primary/20">
                          <TrendingUp className="w-3 h-3" />
                          <span>تكرر {row.occurrence_count} مرات</span>
                        </Badge>
                      </div>
                    </div>

                    {/* Question text */}
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                      {row.sample_text}
                    </p>

                    {/* Models chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {visibleModels.map((m) => (
                        <button
                          key={m.model_id}
                          onClick={() => navigate(`/past-exams/${m.model_id}`)}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-foreground hover:bg-muted/70 border border-border transition-colors"
                          title={m.title}
                        >
                          {m.university_name || "—"} · {m.year}
                        </button>
                      ))}
                      {row.models.length > 5 && (
                        <button
                          onClick={() =>
                            setExpanded((p) => ({
                              ...p,
                              [row.normalized_hash]: !isExpanded,
                            }))
                          }
                          className="text-[11px] px-2 py-0.5 rounded-md text-primary hover:underline"
                        >
                          {isExpanded
                            ? "عرض أقل"
                            : `+${row.models.length - 5} المزيد`}
                        </button>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {row.linked_lesson_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 h-8 text-xs"
                          onClick={() =>
                            navigate(`/lessons/${row.linked_lesson_id}`)
                          }
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>الدرس المرتبط</span>
                        </Button>
                      )}
                      {firstModel && (
                        <Button
                          size="sm"
                          className="gap-1.5 h-8 text-xs"
                          onClick={() =>
                            navigate(`/past-exams/${firstModel.model_id}`)
                          }
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>افتح أحد النماذج</span>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default RepeatedQuestions;
