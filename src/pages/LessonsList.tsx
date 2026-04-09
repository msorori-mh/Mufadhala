import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { GraduationCap, BookOpen, ArrowRight, ChevronLeft, Loader2, CheckCircle2, Search, X, Lock, Sparkles, Download, WifiOff } from "lucide-react";
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
}

const LessonsList = () => {
  const { user, loading: authLoading, isAdmin, isModerator } = useAuth();
  const { isActive: hasSubscription, loading: subLoading, planId, allowedMajorIds } = useSubscription(user?.id);
  const navigate = useNavigate();
  const isOffline = useOfflineStatus();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [majorName, setMajorName] = useState("");
  const [loading, setLoading] = useState(true);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [savedOfflineIds, setSavedOfflineIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [activeSubjectFilter, setActiveSubjectFilter] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && (isAdmin || isModerator)) {
      navigate("/admin/content", { replace: true });
    }
  }, [authLoading, isAdmin, isModerator, navigate]);

  // Load saved offline IDs
  useEffect(() => {
    getSavedLessonIds().then(setSavedOfflineIds).catch(() => {});
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchData = async () => {
      // If offline, load from IndexedDB
      if (isOffline) {
        const saved = await getAllSavedLessons();
        const offlineLessons: Lesson[] = saved.map(l => ({
          id: l.id,
          major_id: "",
          title: l.title,
          summary: l.summary,
          display_order: 0,
          is_free: l.is_free,
        }));
        setLessons(offlineLessons);
        setLoading(false);
        return;
      }

      const { data: s } = await supabase.from("students").select("*").eq("user_id", user.id).maybeSingle();
      if (!s?.major_id) { setLoading(false); return; }
      setStudent(s);

      const [{ data: major }, { data: ls }, { data: lessonsFull }] = await Promise.all([
        supabase.from("majors").select("name_ar").eq("id", s.major_id).maybeSingle(),
        supabase.rpc("get_published_lessons_list", { _major_id: s.major_id }),
        supabase.from("lessons").select("id, subject_id").eq("major_id", s.major_id).eq("is_published", true),
      ]);
      if (major) setMajorName(major.name_ar);
      if (ls) {
        // Merge subject_id from full lessons query
        const subjectMap = new Map<string, string | null>();
        (lessonsFull || []).forEach((lf: any) => subjectMap.set(lf.id, lf.subject_id));
        const enrichedLessons = (ls as Lesson[]).map(l => ({ ...l, subject_id: subjectMap.get(l.id) || null }));
        setLessons(enrichedLessons);

        // Fetch subjects for this major
        const { data: ms } = await supabase.from("major_subjects").select("subject_id").eq("major_id", s.major_id);
        if (ms && ms.length > 0) {
          const subjectIds = ms.map((m: any) => m.subject_id);
          const { data: subs } = await supabase.from("subjects").select("id, name_ar, code").in("id", subjectIds).order("display_order");
          if (subs) setSubjects(subs as SubjectInfo[]);
        }

        const lessonIds = enrichedLessons.map((l: any) => l.id);
        const [{ data: qs }, { data: progress }] = await Promise.all([
          supabase.from("questions").select("lesson_id").in("lesson_id", lessonIds),
          supabase.from("lesson_progress").select("lesson_id")
            .eq("student_id", s.id).eq("is_completed", true)
            .in("lesson_id", lessonIds),
        ]);
        if (qs) {
          const counts: Record<string, number> = {};
          qs.forEach((q: any) => { counts[q.lesson_id] = (counts[q.lesson_id] || 0) + 1; });
          setQuestionCounts(counts);
        }
        if (progress) {
          setCompletedLessons(new Set(progress.map((p: any) => p.lesson_id)));
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [authLoading, user, isOffline]);

  const filteredLessons = useMemo(() => {
    let result = lessons;
    if (activeSubjectFilter !== "all") {
      result = result.filter(l => l.subject_id === activeSubjectFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(l => l.title.toLowerCase().includes(q) || l.summary.toLowerCase().includes(q));
    }
    return result;
  }, [lessons, searchQuery, activeSubjectFilter]);

  const progressPct = lessons.length > 0 ? Math.round((completedLessons.size / lessons.length) * 100) : 0;

  if (authLoading || loading || subLoading) {
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
        {!isOffline && !student?.major_id ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-semibold text-foreground">لم يتم اختيار تخصص بعد</p>
            <p className="text-sm text-muted-foreground mt-1">أكمل ملفك الشخصي واختر تخصصك للوصول للمحتوى</p>
            <Button asChild className="mt-4"><Link to="/profile">الملف الشخصي</Link></Button>
          </div>
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

            {/* Progress bar - only when online */}
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
                    <p className="text-muted-foreground">لا توجد دروس متاحة لتخصصك حالياً</p>
                  </>
                )}
              </div>
            )}

            {searchQuery && filteredLessons.length > 0 && (
              <p className="text-sm text-muted-foreground mb-3">{filteredLessons.length} نتيجة</p>
            )}

            <div className="space-y-3">
              {filteredLessons.map((lesson, i) => {
                const done = completedLessons.has(lesson.id);
                const originalIndex = lessons.findIndex(l => l.id === lesson.id);
                const hasPaidAccess = hasSubscription && !!planId && (!allowedMajorIds || allowedMajorIds.length === 0 || allowedMajorIds.includes(lesson.major_id));
                const isLocked = !isOffline && !lesson.is_free && !hasPaidAccess;
                const isSavedOffline = savedOfflineIds.has(lesson.id);
                return (
                  <Link key={lesson.id} to={`/lessons/${lesson.id}`} className="block">
                    <Card className={`hover:shadow-md transition-shadow cursor-pointer border-r-4 ${done ? "border-r-green-500" : isLocked ? "border-r-muted-foreground/30" : "border-r-primary"}`}>
                      <CardContent className="py-4 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`w-7 h-7 rounded-full text-sm font-bold flex items-center justify-center shrink-0 ${done ? "bg-green-100 text-green-600 dark:bg-green-950/30" : isLocked ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                                {done ? <CheckCircle2 className="w-4 h-4" /> : isLocked ? <Lock className="w-3.5 h-3.5" /> : originalIndex + 1}
                              </span>
                              <p className="font-semibold text-foreground">{lesson.title}</p>
                              {lesson.is_free && !hasSubscription && !isOffline && (
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
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default LessonsList;
