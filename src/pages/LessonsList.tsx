import { useEffect, useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { fetchLessonsBySubjects } from "@/lib/contentFilter";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { GraduationCap, BookOpen, ArrowRight, ChevronLeft, ChevronDown, ChevronUp, Loader2, CheckCircle2, Search, X, Download, WifiOff } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { getSavedLessonIds, getAllSavedLessons } from "@/lib/offlineStorage";

interface SubjectInfo {
  id: string;
  name_ar: string;
  code: string;
}

interface Lesson {
  id: string;
  major_id: string;
  title: string;
  summary: string;
  display_order: number;
  subject_id?: string | null;
  grade_level?: number | null;
}

import { GRADE_LABELS } from "@/domain/constants";

const GradeLevelSection = ({ label, count, completedCount, questionCount, children }: { label: string; count: number; completedCount: number; questionCount: number; children: React.ReactNode }) => {
  const [open, setOpen] = useState(true);
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full p-3 text-sm font-semibold hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-foreground">{label}</span>
          <Badge variant="outline" className="text-[10px]">{count} درس</Badge>
          <Badge variant="outline" className="text-[10px]">{questionCount} سؤال</Badge>
          {completedCount > 0 && (
            <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400">
              {completedCount}/{count} مكتمل
            </Badge>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-3 pt-0">{children}</div>}
    </Card>
  );
};

/** Auto-refetch view when college_id is missing (race condition recovery). */
const NoCollegeView = ({ refetch }: { refetch: () => void }) => {
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    if (retryCount < maxRetries) {
      const delay = (retryCount + 1) * 1500;
      const timer = setTimeout(() => {
        refetch();
        setRetryCount((c) => c + 1);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [retryCount, refetch]);

  return (
    <div className="text-center py-12">
      {retryCount < maxRetries ? (
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
      ) : (
        <>
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-semibold text-foreground">لا توجد بيانات أكاديمية بعد</p>
          <p className="text-sm text-muted-foreground mt-1">يرجى التأكد من اختيار الكلية عند التسجيل للوصول إلى المحتوى</p>
          <div className="flex gap-2 justify-center mt-4">
            <Button variant="outline" onClick={() => setRetryCount(0)}>إعادة المحاولة</Button>
            <Button asChild><Link to="/dashboard">العودة للرئيسية</Link></Button>
          </div>
        </>
      )}
    </div>
  );
};

const LessonsList = () => {
  const { user, student, isAdmin, isModerator, canAccessContent, isLegacyCorrupted, loading: accessLoading, refetchStudent, subjectIds, filterName } = useStudentAccess();
  const navigate = useNavigate();
  const isOffline = useOfflineStatus();
  const [savedOfflineIds, setSavedOfflineIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSubjectFilter, setActiveSubjectFilter] = useState<string>("all");
  const authLoading = accessLoading;

  useEffect(() => {
    if (!accessLoading && (isAdmin || isModerator)) {
      navigate("/admin/content", { replace: true });
    }
  }, [accessLoading, isAdmin, isModerator, navigate]);

  // Load saved offline IDs
  useEffect(() => {
    getSavedLessonIds().then(setSavedOfflineIds).catch(() => {});
  }, []);

  // Offline lessons
  const { data: offlineLessons } = useQuery({
    queryKey: ["offline-lessons"],
    queryFn: async () => {
      const saved = await getAllSavedLessons();
      return saved.map(l => ({
        id: l.id, major_id: "", title: l.title, summary: l.summary,
        display_order: 0,
      })) as Lesson[];
    },
    enabled: isOffline,
    staleTime: Infinity,
  });

  const collegeId = student?.college_id;
  const studentId = student?.id;

  const { data: lessonsData, isLoading: lessonsLoading } = useQuery({
    queryKey: ["lessons-list-subjects", subjectIds],
    queryFn: async () => {
      if (subjectIds.length === 0) return { majorName: "", lessons: [] as Lesson[], subjects: [] as SubjectInfo[], questionCounts: {} as Record<string, number>, completedLessons: new Set<string>() };

      const [lessons, subsResult] = await Promise.all([
        fetchLessonsBySubjects(supabase, subjectIds),
        supabase.from("subjects").select("id, name_ar, code").in("id", subjectIds).order("display_order"),
      ]);

      const subjects: SubjectInfo[] = (subsResult.data || []) as SubjectInfo[];
      const enrichedLessons = (lessons || []).map((l: any) => ({
        id: l.id, major_id: l.major_id || "", title: l.title, summary: l.summary,
        display_order: l.display_order,
        subject_id: l.subject_id || null, grade_level: l.grade_level || null,
      })) as Lesson[];

      const lessonIds = enrichedLessons.map(l => l.id);
      if (lessonIds.length === 0) return { lessons: enrichedLessons, majorName: filterName, subjects, questionCounts: {}, completedLessons: new Set<string>() };

      const [{ data: qs }, { data: progress }] = await Promise.all([
        supabase.from("questions").select("lesson_id").in("lesson_id", lessonIds),
        studentId
          ? supabase.from("lesson_progress").select("lesson_id")
              .eq("student_id", studentId).eq("is_completed", true)
              .in("lesson_id", lessonIds)
          : Promise.resolve({ data: [] }),
      ]);

      const questionCounts: Record<string, number> = {};
      (qs || []).forEach((q: any) => { questionCounts[q.lesson_id] = (questionCounts[q.lesson_id] || 0) + 1; });
      const completedSet = new Set((progress || []).map((p: any) => p.lesson_id));

      return {
        lessons: enrichedLessons,
        majorName: filterName,
        subjects,
        questionCounts,
        completedLessons: completedSet,
      };
    },
    enabled: subjectIds.length > 0 && !isOffline,
    staleTime: 2 * 60 * 1000,
  });

  const lessons = isOffline ? (offlineLessons || []) : (lessonsData?.lessons || []);
  const majorName = filterName || lessonsData?.majorName || "";
  const subjects = lessonsData?.subjects || [];
  const questionCounts = lessonsData?.questionCounts || {};
  const completedLessons = lessonsData?.completedLessons || new Set<string>();

  const lessonsStillLoading = !isOffline && lessonsLoading;

  const filteredLessons = useMemo(() => {
    let result = lessons;
    if (activeSubjectFilter === "none") {
      result = result.filter(l => !l.subject_id);
    } else if (activeSubjectFilter !== "all") {
      result = result.filter(l => l.subject_id === activeSubjectFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(l => l.title.toLowerCase().includes(q) || l.summary.toLowerCase().includes(q));
    }
    return result;
  }, [lessons, searchQuery, activeSubjectFilter]);

  const progressPct = lessons.length > 0 ? Math.round((completedLessons.size / lessons.length) * 100) : 0;

  if (accessLoading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <header className="gradient-primary text-white px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-6 h-6" />
              <span className="text-lg font-bold">المحتوى التعليمي</span>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32 mb-6" />
          <div className="space-y-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-primary text-white px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6" />
            <span className="text-lg font-bold">المحتوى التعليمي</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20 hover:text-white">
              <Link to="/dashboard"><ChevronLeft className="w-4 h-4 ml-1" />الرئيسية</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Offline banner */}
      {isOffline && (
        <div className="bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300 text-center text-sm py-2 px-4 flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          أنت في وضع أوفلاين — يتم عرض الدروس المحفوظة فقط
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-6 md:pb-6">
        {!isOffline && !canAccessContent ? (
          <NoCollegeView refetch={refetchStudent} />
        ) : (
          <>
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-foreground">
                {isOffline ? "الدروس المحفوظة" : majorName ? `دروس ${majorName}` : <Skeleton className="h-7 w-40 inline-block" />}
              </h1>
              <p className="text-sm text-muted-foreground">
                {lessonsStillLoading ? <Skeleton className="h-4 w-28 inline-block mt-1" /> : isOffline ? `${lessons.length} درس محفوظ للقراءة أوفلاين` : `${lessons.length} درس متاح للتدريب`}
              </p>
            </div>

            {/* Inline skeleton while lessons load */}
            {lessonsStillLoading && lessons.length === 0 && (
              <div className="space-y-3">
                {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
              </div>
            )}

            {/* Search */}
            {lessons.length > 0 && (
              <div className="relative mb-4">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث في الدروس..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 pl-9"
                  dir="rtl"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Subject filter tabs */}
            {!isOffline && subjects.length > 0 && !searchQuery && (
              <div className="flex gap-1.5 flex-wrap mb-4">
                <Badge
                  variant={activeSubjectFilter === "all" ? "default" : "outline"}
                  className="cursor-pointer text-xs"
                  onClick={() => setActiveSubjectFilter("all")}
                >
                  جميع المواد ({lessons.length})
                </Badge>
                {subjects.map(s => {
                  const count = lessons.filter(l => l.subject_id === s.id).length;
                  if (count === 0) return null;
                  return (
                    <Badge
                      key={s.id}
                      variant={activeSubjectFilter === s.id ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => setActiveSubjectFilter(s.id)}
                    >
                      {s.name_ar} ({count})
                    </Badge>
                  );
                })}
                {(() => {
                  const unclassified = lessons.filter(l => !l.subject_id).length;
                  return unclassified > 0 ? (
                    <Badge
                      variant={activeSubjectFilter === "none" ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => setActiveSubjectFilter("none")}
                    >
                      غير مصنف ({unclassified})
                    </Badge>
                  ) : null;
                })()}
              </div>
            )}

            {!isOffline && lessons.length > 0 && !searchQuery && (
              <Card className="mb-5">
                <CardContent className="py-4 px-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">نسبة الإنجاز</span>
                    <span className="font-semibold text-foreground">{completedLessons.size}/{lessons.length} ({progressPct}%)</span>
                  </div>
                  <Progress value={progressPct} className="h-2.5" />
                </CardContent>
              </Card>
            )}

            {filteredLessons.length === 0 && (
              <div className="text-center py-12">
                {searchQuery ? (
                  <>
                    <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">لا توجد نتائج لـ "{searchQuery}"</p>
                  </>
                ) : isOffline ? (
                  <>
                    <WifiOff className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">لا توجد دروس محفوظة للقراءة أوفلاين</p>
                    <p className="text-xs text-muted-foreground mt-1">احفظ الدروس من داخل صفحة الدرس عند الاتصال بالإنترنت</p>
                  </>
                ) : (
                  <>
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">لا توجد دروس متاحة لكليتك حالياً</p>
                  </>
                )}
              </div>
            )}

            {searchQuery && filteredLessons.length > 0 && (
              <p className="text-sm text-muted-foreground mb-3">{filteredLessons.length} نتيجة</p>
            )}

            {(() => {
              const hasGradeLevels = filteredLessons.some(l => l.grade_level);
              const shouldGroup = !searchQuery && !isOffline && hasGradeLevels && activeSubjectFilter !== "all";

              const renderLessonCard = (lesson: Lesson) => {
                const done = completedLessons.has(lesson.id);
                const originalIndex = lessons.findIndex(l => l.id === lesson.id);
                const isSavedOffline = savedOfflineIds.has(lesson.id);
                return (
                  <div
                    key={lesson.id}
                    className="block"
                    onClick={() => navigate(`/lessons/${lesson.id}`)}
                  >
                    <Card className={`hover:shadow-md transition-shadow cursor-pointer border-r-4 ${done ? "border-r-green-500" : "border-r-primary"}`}>
                      <CardContent className="py-4 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`w-7 h-7 rounded-full text-sm font-bold flex items-center justify-center shrink-0 ${done ? "bg-green-100 text-green-600 dark:bg-green-950/30" : "bg-primary/10 text-primary"}`}>
                                {done ? <CheckCircle2 className="w-4 h-4" /> : originalIndex + 1}
                              </span>
                              <p className="font-semibold text-foreground">{lesson.title}</p>
                              {isSavedOffline && !isOffline && (
                                <Download className="w-3.5 h-3.5 text-primary shrink-0" />
                              )}
                            </div>
                            {lesson.summary && <p className="text-sm text-muted-foreground mt-1 mr-9 line-clamp-2">{lesson.summary}</p>}
                            <div className="mt-2 mr-9 flex gap-2">
                              {!isOffline && (
                                <Badge variant="outline" className="text-xs">
                                  {questionCounts[lesson.id] || 0} سؤال
                                </Badge>
                              )}
                              {done && (
                                <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                                  مكتمل
                                </Badge>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0 mr-2" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              };

              if (shouldGroup) {
                const gradeGroups: { grade: number | null; label: string; lessons: Lesson[] }[] = [];
                const grades = [1, 2, 3];
                for (const g of grades) {
                  const gLessons = filteredLessons.filter(l => l.grade_level === g);
                  if (gLessons.length > 0) {
                    gradeGroups.push({ grade: g, label: GRADE_LABELS[g], lessons: gLessons });
                  }
                }
                const ungrouped = filteredLessons.filter(l => !l.grade_level);
                if (ungrouped.length > 0) {
                  gradeGroups.push({ grade: null, label: "دروس عامة", lessons: ungrouped });
                }

                return (
                  <div className="space-y-4">
                    {gradeGroups.map((group) => (
                      <GradeLevelSection key={group.grade ?? "none"} label={group.label} count={group.lessons.length} completedCount={group.lessons.filter(l => completedLessons.has(l.id)).length} questionCount={group.lessons.reduce((sum, l) => sum + (questionCounts[l.id] || 0), 0)}>
                        <div className="space-y-3">
                          {group.lessons.map(renderLessonCard)}
                        </div>
                      </GradeLevelSection>
                    ))}
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {filteredLessons.map(renderLessonCard)}
                </div>
              );
            })()}
          </>
        )}
      </main>
    </div>
  );
};

export default LessonsList;
