import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import PermissionGate from "@/components/admin/PermissionGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import ReportFilters from "@/components/admin/ReportFilters";
import { BookOpen, FileQuestion, ScrollText, ListChecks } from "lucide-react";
import type { ExportData } from "@/lib/exportReport";

const GRADE_LEVELS = [
  { value: 1, label: "أول ثانوي" },
  { value: 2, label: "ثاني ثانوي" },
  { value: 3, label: "ثالث ثانوي" },
] as const;

interface SubjectRow {
  id: string;
  name_ar: string;
  byGrade: { lessons: number; questions: number }[];
  totalLessons: number;
  totalQuestions: number;
}

interface UniversityRow {
  id: string;
  name_ar: string;
  models: number;
  questions: number;
}

const AdminReportsContent = () => {
  const [loading, setLoading] = useState(true);
  const [subjectMatrix, setSubjectMatrix] = useState<SubjectRow[]>([]);
  const [universityMatrix, setUniversityMatrix] = useState<UniversityRow[]>([]);
  const [totals, setTotals] = useState({
    totalLessons: 0,
    totalQuestions: 0,
    totalModels: 0,
    totalPastQuestions: 0,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Paginate large tables to bypass PostgREST max-rows cap (default 1000)
        const fetchAllPaged = async <T,>(table: string, columns: string): Promise<T[]> => {
          const PAGE = 1000;
          let from = 0;
          const all: T[] = [];
          while (true) {
            const { data, error } = await supabase.from(table as any).select(columns).range(from, from + PAGE - 1);
            if (error || !data) break;
            all.push(...(data as T[]));
            if (data.length < PAGE) break;
            from += PAGE;
            if (from > 200000) break;
          }
          return all;
        };

        const [subjectsRes, universitiesRes, modelsRes, lessons, questions, modelQuestions] = await Promise.all([
          supabase.from("subjects").select("id, name_ar, display_order").order("display_order"),
          supabase.from("universities").select("id, name_ar, display_order").order("display_order"),
          supabase.from("past_exam_models").select("id, university_id").limit(20000),
          fetchAllPaged<{ id: string; subject_id: string | null; grade_level: number | null }>("lessons", "id, subject_id, grade_level"),
          fetchAllPaged<{ lesson_id: string }>("questions", "lesson_id"),
          fetchAllPaged<{ model_id: string }>("past_exam_model_questions", "model_id"),
        ]);

        const subjects = subjectsRes.data ?? [];
        const universities = universitiesRes.data ?? [];
        const models = modelsRes.data ?? [];

        // Subject matrix
        const subjectRows: SubjectRow[] = subjects.map((s) => {
          const byGrade = GRADE_LEVELS.map((g) => {
            const ls = lessons.filter((l) => l.subject_id === s.id && l.grade_level === g.value);
            const lessonIds = new Set(ls.map((l) => l.id));
            const qs = questions.filter((q) => lessonIds.has(q.lesson_id)).length;
            return { lessons: ls.length, questions: qs };
          });
          return {
            id: s.id,
            name_ar: s.name_ar,
            byGrade,
            totalLessons: byGrade.reduce((sum, g) => sum + g.lessons, 0),
            totalQuestions: byGrade.reduce((sum, g) => sum + g.questions, 0),
          };
        });

        // University matrix
        const universityRows: UniversityRow[] = universities.map((u) => {
          const ms = models.filter((m) => m.university_id === u.id);
          const modelIds = new Set(ms.map((m) => m.id));
          const qs = modelQuestions.filter((q) => modelIds.has(q.model_id)).length;
          return { id: u.id, name_ar: u.name_ar, models: ms.length, questions: qs };
        });

        setSubjectMatrix(subjectRows);
        setUniversityMatrix(universityRows);
        setTotals({
          totalLessons: lessons.length,
          totalQuestions: questions.length,
          totalModels: models.length,
          totalPastQuestions: modelQuestions.length,
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Grand totals per grade for subject matrix
  const gradeTotals = useMemo(() => {
    return GRADE_LEVELS.map((_, i) => ({
      lessons: subjectMatrix.reduce((s, row) => s + row.byGrade[i].lessons, 0),
      questions: subjectMatrix.reduce((s, row) => s + row.byGrade[i].questions, 0),
    }));
  }, [subjectMatrix]);

  const universityTotals = useMemo(() => ({
    models: universityMatrix.reduce((s, r) => s + r.models, 0),
    questions: universityMatrix.reduce((s, r) => s + r.questions, 0),
  }), [universityMatrix]);

  // Export data combining both tables
  const exportData: ExportData = useMemo(() => {
    const headers = [
      "المادة",
      ...GRADE_LEVELS.flatMap((g) => [`${g.label} - دروس`, `${g.label} - أسئلة`]),
      "إجمالي الدروس",
      "إجمالي الأسئلة",
    ];
    const rows: (string | number)[][] = subjectMatrix.map((r) => [
      r.name_ar,
      ...r.byGrade.flatMap((g) => [g.lessons, g.questions]),
      r.totalLessons,
      r.totalQuestions,
    ]);
    rows.push([
      "الإجمالي العام",
      ...gradeTotals.flatMap((g) => [g.lessons, g.questions]),
      totals.totalLessons,
      totals.totalQuestions,
    ]);
    // Append university section as extra rows
    rows.push([]);
    rows.push(["نماذج الاختبارات السابقة حسب الجامعة"]);
    rows.push(["الجامعة", "عدد النماذج", "عدد الأسئلة"]);
    universityMatrix.forEach((u) => rows.push([u.name_ar, u.models, u.questions]));
    rows.push(["الإجمالي العام", universityTotals.models, universityTotals.questions]);

    return {
      title: "تقرير المحتوى التعليمي",
      headers,
      rows,
      summary: {
        "إجمالي الدروس": totals.totalLessons,
        "إجمالي الأسئلة": totals.totalQuestions,
        "إجمالي النماذج السابقة": totals.totalModels,
        "إجمالي أسئلة النماذج السابقة": totals.totalPastQuestions,
      },
    };
  }, [subjectMatrix, gradeTotals, universityMatrix, universityTotals, totals]);

  return (
    <AdminLayout>
      <PermissionGate permission="reports">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">تقرير المحتوى التعليمي</h1>
            <p className="text-sm text-muted-foreground mt-1">
              نظرة شاملة لكل ما تم رفعه على المنصة من دروس وأسئلة ونماذج اختبارات سابقة.
            </p>
          </div>

          <ReportFilters
            filters={{}}
            onChange={() => {}}
            showDate={false}
            showUniversity={false}
            showGovernorate={false}
            exportData={exportData}
            exportFilename="تقرير-المحتوى-التعليمي"
          />

          {/* Top stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={BookOpen} label="إجمالي الدروس" value={totals.totalLessons} loading={loading} />
            <StatCard icon={FileQuestion} label="إجمالي الأسئلة" value={totals.totalQuestions} loading={loading} />
            <StatCard icon={ScrollText} label="نماذج الاختبارات السابقة" value={totals.totalModels} loading={loading} />
            <StatCard icon={ListChecks} label="أسئلة النماذج السابقة" value={totals.totalPastQuestions} loading={loading} />
          </div>

          {/* Subjects matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">محتوى المواد التعليمية حسب الصف الدراسي</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : subjectMatrix.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">لا توجد مواد بعد.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المادة</TableHead>
                      {GRADE_LEVELS.map((g) => (
                        <TableHead key={g.value} className="text-center">{g.label}</TableHead>
                      ))}
                      <TableHead className="text-center font-bold">الإجمالي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subjectMatrix.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.name_ar}</TableCell>
                        {row.byGrade.map((g, i) => (
                          <TableCell key={i} className="text-center text-xs">
                            <span className="text-foreground font-medium">{g.lessons}</span>
                            <span className="text-muted-foreground"> درس · </span>
                            <span className="text-foreground font-medium">{g.questions}</span>
                            <span className="text-muted-foreground"> سؤال</span>
                          </TableCell>
                        ))}
                        <TableCell className="text-center text-xs bg-muted/30 font-semibold">
                          <span>{row.totalLessons}</span>
                          <span className="text-muted-foreground"> درس · </span>
                          <span>{row.totalQuestions}</span>
                          <span className="text-muted-foreground"> سؤال</span>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-primary/5 font-bold">
                      <TableCell>الإجمالي العام</TableCell>
                      {gradeTotals.map((g, i) => (
                        <TableCell key={i} className="text-center text-xs">
                          <span>{g.lessons}</span>
                          <span className="text-muted-foreground"> درس · </span>
                          <span>{g.questions}</span>
                          <span className="text-muted-foreground"> سؤال</span>
                        </TableCell>
                      ))}
                      <TableCell className="text-center text-xs bg-primary/10">
                        <span>{totals.totalLessons}</span>
                        <span className="text-muted-foreground"> درس · </span>
                        <span>{totals.totalQuestions}</span>
                        <span className="text-muted-foreground"> سؤال</span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Universities matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">نماذج الاختبارات السابقة حسب الجامعة</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : universityMatrix.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">لا توجد جامعات بعد.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الجامعة</TableHead>
                      <TableHead className="text-center">عدد النماذج</TableHead>
                      <TableHead className="text-center">عدد الأسئلة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {universityMatrix.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.name_ar}</TableCell>
                        <TableCell className="text-center">{row.models}</TableCell>
                        <TableCell className="text-center">{row.questions}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-primary/5 font-bold">
                      <TableCell>الإجمالي العام</TableCell>
                      <TableCell className="text-center">{universityTotals.models}</TableCell>
                      <TableCell className="text-center">{universityTotals.questions}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </PermissionGate>
    </AdminLayout>
  );
};

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  loading: boolean;
}

const StatCard = ({ icon: Icon, label, value, loading }: StatCardProps) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        {loading ? (
          <Skeleton className="h-6 w-16 mt-1" />
        ) : (
          <p className="text-xl font-bold text-foreground">{value.toLocaleString("ar")}</p>
        )}
      </div>
    </CardContent>
  </Card>
);

export default AdminReportsContent;
