import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChevronLeft, BookOpen, FileText, HelpCircle, CheckCircle2, XCircle, Loader2, Check } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { toast } from "sonner";

interface Lesson {
  id: string;
  title: string;
  content: string;
  summary: string;
}

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
  display_order: number;
}

const LessonDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);

  // Quiz state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (authLoading || !id || !user) return;
    const fetch = async () => {
      const [{ data: l }, { data: q }, { data: s }] = await Promise.all([
        supabase.from("lessons").select("id, title, content, summary").eq("id", id).maybeSingle(),
        supabase.from("questions").select("*").eq("lesson_id", id).order("display_order"),
        supabase.from("students").select("id").eq("user_id", user.id).maybeSingle(),
      ]);
      if (l) setLesson(l as Lesson);
      if (q) setQuestions(q as Question[]);
      if (s) {
        setStudentId(s.id);
        // Check if lesson is already completed
        const { data: progress } = await supabase
          .from("lesson_progress")
          .select("is_completed")
          .eq("student_id", s.id)
          .eq("lesson_id", id)
          .maybeSingle();
        if (progress?.is_completed) setIsCompleted(true);
      }
      setLoading(false);
    };
    fetch();
  }, [authLoading, id, user]);

  const handleAnswer = (questionId: string, option: string) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleSubmit = () => setSubmitted(true);

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
  };

  const markComplete = async () => {
    if (!studentId || !id) return;
    const { error } = await supabase.from("lesson_progress").upsert(
      { student_id: studentId, lesson_id: id, is_completed: true, completed_at: new Date().toISOString() },
      { onConflict: "student_id,lesson_id" }
    );
    if (!error) {
      setIsCompleted(true);
      toast.success("تم تحديد الدرس كمكتمل ✓");
    }
  };

  const correctCount = submitted
    ? questions.filter((q) => answers[q.id] === q.correct_option).length
    : 0;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">الدرس غير موجود</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-primary text-white px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-5 h-5 shrink-0" />
            <span className="font-bold truncate">{lesson.title}</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20 hover:text-white shrink-0">
              <Link to="/lessons"><ChevronLeft className="w-4 h-4 ml-1" />الدروس</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Completion button */}
        <div className="mb-4 flex items-center justify-between">
          {isCompleted ? (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 gap-1">
              <Check className="w-3 h-3" /> مكتمل
            </Badge>
          ) : (
            <Button variant="outline" size="sm" onClick={markComplete} className="gap-1">
              <Check className="w-4 h-4" /> تحديد كمكتمل
            </Button>
          )}
        </div>

        <Tabs defaultValue="content" dir="rtl">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="content" className="flex items-center gap-1"><FileText className="w-4 h-4" />الشرح</TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-1"><BookOpen className="w-4 h-4" />الملخص</TabsTrigger>
            <TabsTrigger value="quiz" className="flex items-center gap-1"><HelpCircle className="w-4 h-4" />الأسئلة</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="mt-4">
            <Card>
              <CardContent className="py-6 px-5">
                {lesson.content ? (
                  <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap leading-relaxed">
                    {lesson.content}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">لا يوجد محتوى بعد</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="mt-4">
            <Card>
              <CardContent className="py-6 px-5">
                {lesson.summary ? (
                  <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap leading-relaxed">
                    {lesson.summary}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">لا يوجد ملخص بعد</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quiz" className="mt-4 space-y-4">
            {questions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">لا توجد أسئلة لهذا الدرس</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {submitted && (
                  <Card className={correctCount === questions.length ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-orange-500 bg-orange-50 dark:bg-orange-950/20"}>
                    <CardContent className="py-4 text-center">
                      <p className="text-lg font-bold">
                        النتيجة: {correctCount} / {questions.length}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {correctCount === questions.length ? "ممتاز! أجبت على جميع الأسئلة بشكل صحيح 🎉" : "حاول مراجعة الأسئلة الخاطئة والتدريب مرة أخرى"}
                      </p>
                      <Button onClick={handleReset} variant="outline" size="sm" className="mt-3">إعادة المحاولة</Button>
                    </CardContent>
                  </Card>
                )}

                {questions.map((q, i) => {
                  const userAnswer = answers[q.id];
                  const isCorrect = userAnswer === q.correct_option;

                  return (
                    <Card key={q.id}>
                      <CardContent className="py-4 px-4">
                        <p className="font-semibold text-sm mb-3">{i + 1}. {q.question_text}</p>
                        <div className="space-y-2">
                          {(["a", "b", "c", "d"] as const).map((opt) => {
                            const optionText = q[`option_${opt}` as keyof Question] as string;
                            const isSelected = userAnswer === opt;
                            const isCorrectOption = q.correct_option === opt;

                            let classes = "flex items-center gap-2 p-3 rounded-lg border text-sm cursor-pointer transition-colors ";
                            if (submitted) {
                              if (isCorrectOption) classes += "border-green-500 bg-green-50 dark:bg-green-950/30 ";
                              else if (isSelected && !isCorrect) classes += "border-red-500 bg-red-50 dark:bg-red-950/30 ";
                              else classes += "border-border ";
                            } else {
                              classes += isSelected ? "border-primary bg-primary/10 " : "border-border hover:bg-muted ";
                            }

                            return (
                              <button
                                key={opt}
                                className={classes + "w-full text-right"}
                                onClick={() => handleAnswer(q.id, opt)}
                                disabled={submitted}
                              >
                                <span className="w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0">
                                  {opt.toUpperCase()}
                                </span>
                                <span className="flex-1">{optionText}</span>
                                {submitted && isCorrectOption && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />}
                                {submitted && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                        {submitted && q.explanation && (
                          <div className="mt-3 p-3 bg-muted rounded-lg">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">الشرح:</p>
                            <p className="text-sm">{q.explanation}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                {!submitted && (
                  <Button
                    onClick={handleSubmit}
                    className="w-full"
                    disabled={Object.keys(answers).length < questions.length}
                  >
                    تسليم الإجابات ({Object.keys(answers).length}/{questions.length})
                  </Button>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default LessonDetail;
