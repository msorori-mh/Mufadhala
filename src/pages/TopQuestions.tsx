import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ThemeToggle from "@/components/ThemeToggle";
import {
  GraduationCap, ArrowRight, Loader2, Lock, Crown,
  CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Building2, Flame, Star, RefreshCw, Sparkles,
  Filter, BookMarked, HelpCircle,
} from "lucide-react";

/* ─── Types ─── */
interface RepeatedQuestion {
  question_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string;
  question_type: string;
  repeat_count: number;
}

const FREE_LIMIT = 5;

const TopQuestions = () => {
  const navigate = useNavigate();
  const { user, loading: accessLoading } = useStudentAccess();
  const { isActive: hasSubscription } = useSubscription(user?.id);

  const [selectedUniversityId, setSelectedUniversityId] = useState<string | null>(null);
  const [expandedQ, setExpandedQ] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  /* ─── Universities ─── */
  const { data: universities = [] } = useQuery({
    queryKey: ["top-q-universities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("universities")
        .select("id, name_ar")
        .eq("is_active", true)
        .order("display_order");
      return data || [];
    },
  });

  /* ─── Repeated questions via RPC ─── */
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["top-repeated-questions", selectedUniversityId],
    queryFn: async () => {
      const params: Record<string, unknown> = { _limit: 50 };
      if (selectedUniversityId) params._university_id = selectedUniversityId;
      const { data, error } = await supabase.rpc("get_top_repeated_questions", params as any);
      if (error) throw error;
      return (data || []) as RepeatedQuestion[];
    },
  });

  /* ─── Helpers ─── */
  const toggleExpand = (qId: string) => setExpandedQ(prev => ({ ...prev, [qId]: !prev[qId] }));

  const handleAnswer = (qId: string, option: string) => {
    if (revealed[qId]) return;
    setAnswers(prev => ({ ...prev, [qId]: option }));
    setRevealed(prev => ({ ...prev, [qId]: true }));
  };

  const getRepeatBadge = (count: number) => {
    if (count >= 5) return { label: "مهم جداً", icon: Star, cls: "bg-accent/15 text-accent border-accent/30" };
    if (count >= 3) return { label: `تكرر ${count} مرات`, icon: Flame, cls: "bg-destructive/10 text-destructive border-destructive/30" };
    return { label: `تكرر ${count} مرتين`, icon: RefreshCw, cls: "bg-primary/10 text-primary border-primary/30" };
  };

  /* ─── Auth guard ─── */
  if (accessLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="gradient-primary text-white px-4 py-3 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="p-2 -m-1 rounded-xl hover:bg-white/15 active:bg-white/25 transition-colors">
            <ArrowRight className="w-5 h-5" />
          </button>
          <Flame className="w-5 h-5 shrink-0" />
          <h1 className="font-bold text-sm flex-1 truncate">أكثر الأسئلة تكراراً</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5 pb-bottom-nav">
        {/* Hero */}
        <div className="bg-gradient-to-br from-destructive/8 to-accent/5 rounded-2xl p-5 space-y-2 border border-destructive/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center">
              <Flame className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-sm">أهم الأسئلة في المفاضلات</h2>
              <p className="text-xs text-muted-foreground">أسئلة تكررت في اختبارات سابقة — ركّز عليها</p>
            </div>
          </div>
        </div>

        {/* University filter */}
        <div className="space-y-2">
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />تصفية حسب الجامعة
          </h3>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedUniversityId === null ? "default" : "outline"}
              size="sm"
              className="h-9 rounded-lg text-xs"
              onClick={() => setSelectedUniversityId(null)}
            >
              جميع الجامعات
            </Button>
            {universities.map(uni => (
              <Button
                key={uni.id}
                variant={selectedUniversityId === uni.id ? "default" : "outline"}
                size="sm"
                className="h-9 rounded-lg text-xs"
                onClick={() => setSelectedUniversityId(uni.id)}
              >
                {uni.name_ar}
              </Button>
            ))}
          </div>
        </div>

        {/* Questions list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="font-bold text-foreground text-base">لا توجد أسئلة متكررة بعد</p>
            <p className="text-sm text-muted-foreground mt-1">ستظهر هنا عند إضافة نماذج كافية</p>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((q, index) => {
              const isLocked = index >= FREE_LIMIT && !hasSubscription;
              const badge = getRepeatBadge(q.repeat_count);
              const isExpanded = expandedQ[q.question_id];
              const userAns = answers[q.question_id];
              const isRevealed = revealed[q.question_id];

              if (isLocked) {
                return (
                  <Card key={q.question_id} className="overflow-hidden opacity-60">
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-muted-foreground line-clamp-1">سؤال متكرر #{index + 1}</p>
                        <p className="text-[10px] text-muted-foreground">متاح للمشتركين فقط</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-accent/50 text-accent">
                        <Crown className="w-2.5 h-2.5 ml-0.5" />مدفوع
                      </Badge>
                    </CardContent>
                  </Card>
                );
              }

              const options = q.question_type === "true_false"
                ? [{ key: "a", text: q.option_a, label: "صح" }, { key: "b", text: q.option_b, label: "خطأ" }]
                : [
                    { key: "a", text: q.option_a, label: "أ" },
                    { key: "b", text: q.option_b, label: "ب" },
                    { key: "c", text: q.option_c, label: "ج" },
                    { key: "d", text: q.option_d, label: "د" },
                  ];

              return (
                <Card key={q.question_id} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Question header */}
                    <button
                      onClick={() => toggleExpand(q.question_id)}
                      className="w-full text-right flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors"
                    >
                      <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="font-semibold text-sm text-foreground leading-relaxed">{q.question_text}</p>
                        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 h-5 ${badge.cls}`}>
                          <badge.icon className="w-3 h-3 ml-1" />{badge.label}
                        </Badge>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                      )}
                    </button>

                    {/* Expanded: options + explanation */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-2.5 border-t border-border pt-3">
                        {options.map(opt => {
                          const isSelected = userAns === opt.key;
                          const isCorrect = q.correct_option === opt.key;

                          let cls = "border-border hover:border-primary/40 hover:bg-primary/5";
                          let labelCls = "bg-muted text-muted-foreground";
                          let iconEl: React.ReactNode = null;

                          if (isRevealed) {
                            if (isCorrect) {
                              cls = "border-secondary bg-secondary/8";
                              labelCls = "bg-secondary text-white";
                              iconEl = <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />;
                            } else if (isSelected) {
                              cls = "border-destructive bg-destructive/8";
                              labelCls = "bg-destructive text-white";
                              iconEl = <XCircle className="w-4 h-4 text-destructive shrink-0" />;
                            } else {
                              cls = "border-border opacity-50";
                            }
                          }

                          return (
                            <button
                              key={opt.key}
                              onClick={() => handleAnswer(q.question_id, opt.key)}
                              disabled={!!isRevealed}
                              className={`w-full text-right flex items-center gap-2.5 px-3.5 py-3 rounded-xl border-2 transition-all active:scale-[0.98] ${cls}`}
                            >
                              <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${labelCls}`}>
                                {opt.label}
                              </span>
                              <span className="text-sm flex-1 leading-relaxed">{opt.text}</span>
                              {iconEl}
                            </button>
                          );
                        })}

                        {isRevealed && q.explanation && (
                          <div className="bg-primary/5 border border-primary/15 p-3.5 rounded-xl space-y-1">
                            <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />الشرح
                            </p>
                            <p className="text-sm text-foreground leading-relaxed">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Paywall after free limit */}
            {!hasSubscription && questions.length > FREE_LIMIT && (
              <Card className="overflow-hidden border-accent/30 bg-accent/5">
                <CardContent className="p-5 text-center space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-accent" />
                  </div>
                  <p className="font-bold text-foreground text-sm">
                    {questions.length - FREE_LIMIT} سؤال إضافي متاح للمشتركين
                  </p>
                  <p className="text-xs text-muted-foreground">اشترك للوصول لجميع الأسئلة المهمة المتكررة</p>
                  <Button onClick={() => navigate("/subscription")} className="h-11 px-6 rounded-xl text-sm">
                    <Crown className="w-4 h-4 ml-2" />اشترك الآن
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default TopQuestions;
