import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GraduationCap, BookOpen, ArrowRight, ChevronLeft, Loader2, CheckCircle2, Search, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

interface Lesson {
  id: string;
  major_id: string;
  title: string;
  summary: string;
  display_order: number;
}

const LessonsList = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [student, setStudent] = useState<any>(null);
  const [majorName, setMajorName] = useState("");
  const [loading, setLoading] = useState(true);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;
    const fetch = async () => {
      const { data: s } = await supabase.from("students").select("*").eq("user_id", user.id).maybeSingle();
      if (!s?.major_id) { setLoading(false); return; }
      setStudent(s);

      const [{ data: major }, { data: ls }] = await Promise.all([
        supabase.from("majors").select("name_ar").eq("id", s.major_id).maybeSingle(),
        supabase.from("lessons").select("id, major_id, title, summary, display_order")
          .eq("major_id", s.major_id).eq("is_published", true).order("display_order"),
      ]);
      if (major) setMajorName(major.name_ar);
      if (ls) {
        setLessons(ls as Lesson[]);
        const [{ data: qs }, { data: progress }] = await Promise.all([
          supabase.from("questions").select("lesson_id").in("lesson_id", ls.map((l: any) => l.id)),
          supabase.from("lesson_progress").select("lesson_id")
            .eq("student_id", s.id).eq("is_completed", true)
            .in("lesson_id", ls.map((l: any) => l.id)),
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
    fetch();
  }, [authLoading, user]);

  const filteredLessons = useMemo(() => {
    if (!searchQuery.trim()) return lessons;
    const q = searchQuery.trim().toLowerCase();
    return lessons.filter(l =>
      l.title.toLowerCase().includes(q) || l.summary.toLowerCase().includes(q)
    );
  }, [lessons, searchQuery]);

  const progressPct = lessons.length > 0 ? Math.round((completedLessons.size / lessons.length) * 100) : 0;

  if (authLoading || loading) {
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
          <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20 hover:text-white">
            <Link to="/dashboard"><ChevronLeft className="w-4 h-4 ml-1" />الرئيسية</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {!student?.major_id ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-lg font-semibold text-foreground">لم يتم اختيار تخصص بعد</p>
            <p className="text-sm text-muted-foreground mt-1">أكمل ملفك الشخصي واختر تخصصك للوصول للمحتوى</p>
            <Button asChild className="mt-4"><Link to="/profile">الملف الشخصي</Link></Button>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h1 className="text-2xl font-bold text-foreground">دروس {majorName}</h1>
              <p className="text-sm text-muted-foreground">{lessons.length} درس متاح للتدريب</p>
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

            {/* Progress bar */}
            {lessons.length > 0 && !searchQuery && (
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
                return (
                  <Link key={lesson.id} to={`/lessons/${lesson.id}`} className="block">
                    <Card className={`hover:shadow-md transition-shadow cursor-pointer border-r-4 ${done ? "border-r-green-500" : "border-r-primary"}`}>
                      <CardContent className="py-4 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`w-7 h-7 rounded-full text-sm font-bold flex items-center justify-center shrink-0 ${done ? "bg-green-100 text-green-600 dark:bg-green-950/30" : "bg-primary/10 text-primary"}`}>
                                {done ? <CheckCircle2 className="w-4 h-4" /> : originalIndex + 1}
                              </span>
                              <p className="font-semibold text-foreground">{lesson.title}</p>
                            </div>
                            {lesson.summary && <p className="text-sm text-muted-foreground mt-1 mr-9 line-clamp-2">{lesson.summary}</p>}
                            <div className="mt-2 mr-9 flex gap-2">
                              <Badge variant="outline" className="text-xs">
                                {questionCounts[lesson.id] || 0} سؤال
                              </Badge>
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
