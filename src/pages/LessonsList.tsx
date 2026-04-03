import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GraduationCap, BookOpen, ArrowRight, ChevronLeft, Loader2 } from "lucide-react";

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
        // Fetch question counts
        const { data: qs } = await supabase.from("questions").select("lesson_id").in("lesson_id", ls.map((l: any) => l.id));
        if (qs) {
          const counts: Record<string, number> = {};
          qs.forEach((q: any) => { counts[q.lesson_id] = (counts[q.lesson_id] || 0) + 1; });
          setQuestionCounts(counts);
        }
      }
      setLoading(false);
    };
    fetch();
  }, [authLoading, user]);

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
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">دروس {majorName}</h1>
              <p className="text-sm text-muted-foreground">{lessons.length} درس متاح للتدريب</p>
            </div>

            {lessons.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">لا توجد دروس متاحة لتخصصك حالياً</p>
              </div>
            )}

            <div className="space-y-3">
              {lessons.map((lesson, i) => (
                <Link key={lesson.id} to={`/lessons/${lesson.id}`} className="block">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-r-4 border-r-primary">
                    <CardContent className="py-4 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                            <p className="font-semibold text-foreground">{lesson.title}</p>
                          </div>
                          {lesson.summary && <p className="text-sm text-muted-foreground mt-1 mr-9 line-clamp-2">{lesson.summary}</p>}
                          <div className="mt-2 mr-9">
                            <Badge variant="outline" className="text-xs">
                              {questionCounts[lesson.id] || 0} سؤال
                            </Badge>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0 mr-2" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default LessonsList;
