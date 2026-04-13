import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useStudentData } from "@/hooks/useStudentData";
import { GraduationCap, BookOpen, ArrowRight, ChevronLeft, ChevronDown, ChevronUp, Loader2, CheckCircle2, Search, X, Lock, Sparkles, Download, WifiOff, Rocket } from "lucide-react";
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
  is_free: boolean;
  subject_id?: string | null;
  grade_level?: number | null;
}

const GRADE_LABELS: Record<number, string> = {
  1: "مقرر الصف الأول الثانوي",
  2: "مقرر الصف الثاني الثانوي",
  3: "مقرر الصف الثالث الثانوي",
};

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

const LessonsList = () => {
  const { user, loading: authLoading, isAdmin, isModerator } = useAuth();
  const { isActive: hasSubscription, loading: subLoading, planId, allowedMajorIds } = useSubscription(user?.id);
  const { data: student, isLoading: studentLoading, refetch: refetchStudent } = useStudentData(user?.id);
  const navigate = useNavigate();
  const isOffline = useOfflineStatus();
  const [savedOfflineIds, setSavedOfflineIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSubjectFilter, setActiveSubjectFilter] = useState<string>("all");
  const [lockedLesson, setLockedLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    if (!authLoading && (isAdmin || isModerator)) {
      navigate("/admin/content", { replace: true });
    }
  }, [authLoading, isAdmin, isModerator, navigate]);

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
        display_order: 0, is_free: l.is_free,
      })) as Lesson[];
    },
    enabled: isOffline,
    staleTime: Infinity,
  });

  // Online lessons data — all in one parallel query
  const majorId = student?.major_id;
  const collegeId = student?.college_id;
  const studentId = student?.id;

  const { data: lessonsData, isLoading: lessonsLoading } = useQuery({
    queryKey: ["lessons-list", majorId, collegeId],
    queryFn: async () => {
      // Determine how to fetch lessons: by major if available, otherwise by college
      const hasMajor = !!majorId;

      const [majorResult, lessonsResult, lessonsFullResult] = await Promise.all([
        hasMajor
          ? supabase.from("majors").select("name_ar").eq("id", majorId!).maybeSingle()
          : supabase.from("colleges").select("name_ar").eq("id", collegeId!).maybeSingle(),
        hasMajor
          ? supabase.rpc("get_published_lessons_list", { _major_id: majorId! })
          : supabase.rpc("get_published_lessons_by_college", { _college_id: collegeId! }),
        hasMajor
          ? supabase.from("lessons").select("id, subject_id, grade_level").eq("major_id", majorId!).eq("is_published", true)
          : supabase.from("lessons").select("id, subject_id, grade_level").eq("college_id", collegeId!).eq("is_published", true),
      ]);

      const { data: nameData } = majorResult;
      const { data: ls } = lessonsResult;
      const { data: lessonsFull } = lessonsFullResult;

      const subjectGradeMap = new Map<string, { subject_id: string | null; grade_level: number | null }>();
      (lessonsFull || []).forEach((lf: any) => subjectGradeMap.set(lf.id, { subject_id: lf.subject_id, grade_level: lf.grade_level }));
      const enrichedLessons = ((ls || []) as Lesson[]).map(l => {
        const extra = subjectGradeMap.get(l.id);
        return { ...l, subject_id: extra?.subject_id || null, grade_level: extra?.grade_level || null };
      });

      // Fetch subjects: prioritize college_subjects, fallback to major_subjects
      let subjects: SubjectInfo[] = [];
      if (collegeId) {
        const { data: cs } = await supabase.from("college_subjects").select("subject_id").eq("college_id", collegeId);
        if (cs && cs.length > 0) {
          const subjectIds = cs.map((c: any) => c.subject_id);
          const { data: subs } = await supabase.from("subjects").select("id, name_ar, code").in("id", subjectIds).order("display_order");
          if (subs) subjects = subs as SubjectInfo[];
        }
      }
      if (subjects.length === 0 && majorId) {
        const { data: ms } = await supabase.from("major_subjects").select("subject_id").eq("major_id", majorId!);
        if (ms && ms.length > 0) {
          const subjectIds = ms.map((m: any) => m.subject_id);
          const { data: subs } = await supabase.from("subjects").select("id, name_ar, code").in("id", subjectIds).order("display_order");
          if (subs) subjects = subs as SubjectInfo[];
        }
      }

      // Fetch question counts and progress in parallel
      const lessonIds = enrichedLessons.map(l => l.id);
      const [{ data: qs }, { data: progress }] = await Promise.all([
        supabase.from("questions").select("lesson_id").in("lesson_id", lessonIds),
        supabase.from("lesson_progress").select("lesson_id")
          .eq("student_id", studentId!).eq("is_completed", true)
          .in("lesson_id", lessonIds),
      ]);

      const questionCounts: Record<string, number> = {};
      (qs || []).forEach((q: any) => { questionCounts[q.lesson_id] = (questionCounts[q.lesson_id] || 0) + 1; });

      const completedSet = new Set((progress || []).map((p: any) => p.lesson_id));

      return {
        lessons: enrichedLessons,
        majorName: nameData?.name_ar || "",
        subjects,
        questionCounts,
        completedLessons: completedSet,
      };
    },
    enabled: !!(majorId || collegeId) && !!studentId && !isOffline,
    staleTime: 2 * 60 * 1000,
  });

  const lessons = isOffline ? (offlineLessons || []) : (lessonsData?.lessons || []);
  const majorName = lessonsData?.majorName || "";
  const subjects = lessonsData?.subjects || [];
  const questionCounts = lessonsData?.questionCounts || {};
  const completedLessons = lessonsData?.completedLessons || new Set<string>();

  // Fetch free lessons count setting from cache
  const { data: freeLessonsCount } = useQuery({
    queryKey: ["free-lessons-count"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_cache", { _key: "free_lessons_count" });
      return data != null ? Number(data) : 3;
    },
    staleTime: 5 * 60 * 1000,
  });

  const FREE_COUNT = freeLessonsCount ?? 3;

  // Compute which lessons are free: first N per subject (by display_order)
  const freeLessonIds = useMemo(() => {
    const ids = new Set<string>();
    const bySubject = new Map<string | null, Lesson[]>();
    lessons.forEach(l => {
      const key = l.subject_id || null;
      if (!bySubject.has(key)) bySubject.set(key, []);
      bySubject.get(key)!.push(l);
    });
    bySubject.forEach(group => {
      const sorted = [...group].sort((a, b) => a.display_order - b.display_order);
      sorted.slice(0, FREE_COUNT).forEach(l => ids.add(l.id));
    });
    // Also include any lesson with is_free=true from DB
    lessons.forEach(l => { if (l.is_free) ids.add(l.id); });
    return ids;
  }, [lessons, FREE_COUNT]);

  // Compute free lessons remaining per subject
  const freeCountBySubject = useMemo(() => {
    const result = new Map<string | null, { total: number; free: number; remaining: number }>();
    const bySubject = new Map<string | null, Lesson[]>();
    lessons.forEach(l => {
      const key = l.subject_id || null;
      if (!bySubject.has(key)) bySubject.set(key, []);
      bySubject.get(key)!.push(l);
    });
    bySubject.forEach((group, key) => {
      const sorted = [...group].sort((a, b) => a.display_order - b.display_order);
      const freeInSubject = sorted.slice(0, FREE_COUNT).length;
      const totalInSubject = sorted.length;
      const remaining = Math.max(0, FREE_COUNT - freeInSubject);
      result.set(key, { total: totalInSubject, free: freeInSubject, remaining });
    });
    return result;
  }, [lessons, FREE_COUNT]);

  const loading = authLoading || studentLoading || (!isOffline && lessonsLoading) || subLoading;

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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

      <main className="max-w-4xl mx-auto px-4 py-6 pb-20 md:pb-6">
        {!isOffline && !student?.college_id ? (
          <NoCollegeView refetch={refetchStudent} />
        ) : (
          <>
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-foreground">
                {isOffline ? "الدروس المحفوظة" : `دروس ${majorName}`}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isOffline ? `${lessons.length} درس محفوظ للقراءة أوفلاين` : `${lessons.length} درس متاح للتدريب`}
              </p>
            </div>

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

            {/* Free lessons remaining counter */}
            {!isOffline && !hasSubscription && lessons.length > 0 && !searchQuery && (
              <Card className="mb-5 border-green-200 bg-green-50/50 dark:bg-green-950/10 dark:border-green-900/50">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-700 dark:text-green-400">الدروس المجانية</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {subjects.map(s => {
                      const info = freeCountBySubject.get(s.id);
                      if (!info) return null;
                      const freeUsed = Math.min(info.free, info.total);
                      return (
                        <div key={s.id} className="flex items-center gap-1.5 text-xs bg-background rounded-md px-2.5 py-1.5 border">
                          <span className="text-muted-foreground">{s.name_ar}:</span>
                          <span className="font-bold text-green-600 dark:text-green-400">{freeUsed}</span>
                          <span className="text-muted-foreground">/ {FREE_COUNT}</span>
                        </div>
                      );
                    })}
                    {(() => {
                      const info = freeCountBySubject.get(null);
                      if (!info) return null;
                      const freeUsed = Math.min(info.free, info.total);
                      return (
                        <div className="flex items-center gap-1.5 text-xs bg-background rounded-md px-2.5 py-1.5 border">
                          <span className="text-muted-foreground">غير مصنف:</span>
                          <span className="font-bold text-green-600 dark:text-green-400">{freeUsed}</span>
                          <span className="text-muted-foreground">/ {FREE_COUNT}</span>
                        </div>
                      );
                    })()}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">أول {FREE_COUNT} دروس من كل مادة متاحة مجاناً بالكامل</p>
                </CardContent>
              </Card>
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
              // Check if we should group by grade level (when filtering by subject or "all" with subjects)
              const hasGradeLevels = filteredLessons.some(l => l.grade_level);
              const shouldGroup = !searchQuery && !isOffline && hasGradeLevels && activeSubjectFilter !== "all";

              const renderLessonCard = (lesson: Lesson) => {
                const done = completedLessons.has(lesson.id);
                const originalIndex = lessons.findIndex(l => l.id === lesson.id);
                const hasPaidAccess = hasSubscription && !!planId && (!allowedMajorIds || allowedMajorIds.length === 0 || allowedMajorIds.includes(lesson.major_id));
                const isFree = freeLessonIds.has(lesson.id);
                const isLocked = !isOffline && !isFree && !hasPaidAccess;
                const isSavedOffline = savedOfflineIds.has(lesson.id);
                return (
                  <div
                    key={lesson.id}
                    className="block"
                    onClick={(e) => {
                      if (isLocked) {
                        e.preventDefault();
                        setLockedLesson(lesson);
                      } else {
                        navigate(`/lessons/${lesson.id}`);
                      }
                    }}
                  >
                    <Card className={`hover:shadow-md transition-shadow cursor-pointer border-r-4 ${done ? "border-r-green-500" : isLocked ? "border-r-muted-foreground/30" : "border-r-primary"}`}>
                      <CardContent className="py-4 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`w-7 h-7 rounded-full text-sm font-bold flex items-center justify-center shrink-0 ${done ? "bg-green-100 text-green-600 dark:bg-green-950/30" : isLocked ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                                {done ? <CheckCircle2 className="w-4 h-4" /> : isLocked ? <Lock className="w-3.5 h-3.5" /> : originalIndex + 1}
                              </span>
                              <p className="font-semibold text-foreground">{lesson.title}</p>
                              {isFree && !hasSubscription && !isOffline && (
                                <Badge variant="outline" className="text-xs border-green-500 text-green-600 gap-0.5">
                                  <Sparkles className="w-3 h-3" /> مجاني
                                </Badge>
                              )}
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
                              {isLocked && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  يتطلب اشتراك
                                </Badge>
                              )}
                            </div>
                          </div>
                          {isLocked ? (
                            <Lock className="w-5 h-5 text-muted-foreground shrink-0 mr-2" />
                          ) : (
                            <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0 mr-2" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              };

              if (shouldGroup) {
                // Group by grade level
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

      {/* Locked lesson dialog */}
      <Dialog open={!!lockedLesson} onOpenChange={(open) => !open && setLockedLesson(null)}>
        <DialogContent className="text-center max-w-sm" dir="rtl">
          <DialogHeader className="items-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-lg">{lockedLesson?.title}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed mt-2">
              هذا الدرس جزء من المحتوى المتقدم 🚀
              <br />
              اشترك الآن واحصل على جميع الدروس والأسئلة لتتفوق في المفاضلة!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col mt-2">
            <Button onClick={() => { setLockedLesson(null); navigate("/subscription"); }} className="w-full gap-2">
              <Rocket className="w-4 h-4" />
              تفعيل الاشتراك
            </Button>
            <Button variant="ghost" onClick={() => setLockedLesson(null)} className="w-full">
              لاحقاً
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LessonsList;
