import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStudentData } from "@/hooks/useStudentData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import NativeSelect from "@/components/NativeSelect";
import { ArrowRight, FileText, Lock, ChevronLeft, Crown, Sparkles } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { trackSubscriptionClick } from "@/lib/conversionTracking";
import { isPaymentUIEnabled } from "@/lib/platformGate";

const PastExams = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: student } = useStudentData(user?.id);
  const { isPaid: hasActiveSubscription, isTrial } = useSubscription(user?.id);

  const [selectedUniversityId, setSelectedUniversityId] = useState<string>("");

  // Fallback university (currently the only one with published models): Taiz
  const FALLBACK_UNIVERSITY_ID = "a0000001-0000-0000-0000-000000000003";

  // Fetch universities
  const { data: universities = [] } = useQuery({
    queryKey: ["universities-active"],
    queryFn: async () => {
      const { data } = await supabase
        .from("universities")
        .select("id, name_ar")
        .eq("is_active", true)
        .order("display_order");
      return data || [];
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Auto-select student's university
  const effectiveUniversityId = selectedUniversityId || student?.university_id || "";

  // Fetch published models for selected university
  const { data: models = [], isLoading: modelsLoading } = useQuery({
    queryKey: ["past-exam-models", effectiveUniversityId],
    queryFn: async () => {
      if (!effectiveUniversityId) return [];
      const { data } = await supabase
        .from("past_exam_models")
        .select("id, title, year, is_paid, university_id, duration_minutes")
        .eq("university_id", effectiveUniversityId)
        .eq("is_published", true)
        .order("year", { ascending: false });
      return data || [];
    },
    enabled: !!effectiveUniversityId,
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Flat list sorted by year descending
  const sortedModels = useMemo(
    () => [...models].sort((a, b) => b.year - a.year),
    [models]
  );

  const universityName = universities.find((u) => u.id === effectiveUniversityId)?.name_ar;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-foreground">نماذج الأعوام السابقة</h1>
            <p className="text-xs text-muted-foreground">تدرّب على نماذج القبول الحقيقية</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        {/* University selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">اختر الجامعة</label>
          <NativeSelect
            value={effectiveUniversityId}
            onValueChange={setSelectedUniversityId}
            placeholder="اختر جامعة"
            options={universities.map((u) => ({ value: u.id, label: u.name_ar }))}
          />
          {student?.university_id && selectedUniversityId && selectedUniversityId !== student.university_id && (
            <Button
              variant="link"
              size="sm"
              className="text-xs px-0"
              onClick={() => setSelectedUniversityId("")}
            >
              العودة لجامعتي
            </Button>
          )}
        </div>

        {/* Content */}
        {!effectiveUniversityId ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>اختر جامعة لعرض النماذج المتاحة</p>
          </div>
        ) : modelsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : models.length === 0 ? (
          <div className="text-center py-12 px-4">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-40 text-muted-foreground" />
            <p className="text-foreground font-medium mb-1">
              لم يتم رفع نماذج لـ {universityName || "هذه الجامعة"} بعد
            </p>
            <p className="text-sm text-muted-foreground mb-5">
              نعمل على إضافة نماذج جديدة قريباً
            </p>
            {effectiveUniversityId !== FALLBACK_UNIVERSITY_ID && (
              <Button
                onClick={() => setSelectedUniversityId(FALLBACK_UNIVERSITY_ID)}
                className="gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>تصفح نماذج جامعة تعز (متاحة الآن)</span>
              </Button>
            )}
            {isPaymentUIEnabled() && (
              <p className="text-xs text-muted-foreground mt-4">
                اشترك الآن لتكون أول من يصل للنماذج عند رفعها
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {universityName && (
              <p className="text-sm text-muted-foreground mb-1">
                نماذج {universityName}
              </p>
            )}
            {/* Trial info banner — explains why paid models are still locked during trial */}
            {isTrial && isPaymentUIEnabled() &&
              sortedModels.some((m) => m.is_paid) && (
                <div className="flex items-center gap-2 rounded-lg bg-secondary/10 border border-secondary/30 px-3 py-2 text-xs text-foreground/90">
                  <Crown className="w-3.5 h-3.5 text-secondary shrink-0" />
                  <span>أنت في الفترة التجريبية. اشترك الآن لفتح النماذج المدفوعة</span>
                </div>
              )}
            {/* Conversion hint banner — only shown on web when there are locked paid models */}
            {isPaymentUIEnabled() &&
              sortedModels.some((m) => m.is_paid && !hasActiveSubscription) && (
                <div className="flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-foreground/80">
                  <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>اشترك للوصول لجميع النماذج المدفوعة دفعة واحدة</span>
                </div>
              )}
            {sortedModels.map((model, idx) => {
              const locked = model.is_paid && !hasActiveSubscription;
              const prevYear = idx > 0 ? sortedModels[idx - 1].year : null;
              const isYearBoundary = idx > 0 && prevYear !== model.year;
              return (
                <div key={model.id} className={isYearBoundary ? "pt-2 mt-1 border-t border-dashed border-border/60" : ""}>
                  <Card
                    className={`transition-shadow ${
                      locked
                        ? "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent shadow-sm"
                        : "cursor-pointer hover:shadow-md"
                    }`}
                    onClick={() => {
                      if (locked) return; // locked cards: action lives in the dedicated CTA below
                      navigate(`/past-exams/${model.id}`);
                    }}
                  >
                    <CardContent className="p-3">
                      {/* Top row: icon + title + badge */}
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            locked
                              ? "bg-primary/15 ring-1 ring-primary/30"
                              : "bg-primary/10"
                          }`}
                        >
                          {locked ? (
                            <Lock className="w-4 h-4 text-primary" />
                          ) : (
                            <FileText className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            <span>{model.title}</span>
                            <span className="text-muted-foreground font-normal"> · </span>
                            <span className="text-primary">{model.year}</span>
                            {model.duration_minutes && (
                              <>
                                <span className="text-muted-foreground font-normal"> · </span>
                                <span className="text-muted-foreground font-normal">
                                  {model.duration_minutes}د
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                        {model.is_paid ? (
                          <Badge
                            variant={locked ? "default" : "secondary"}
                            className="text-[10px] shrink-0"
                          >
                            {locked ? "اشتراك" : "اشتراك ✓"}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] shrink-0 border-secondary/40 text-secondary"
                          >
                            مجاني
                          </Badge>
                        )}
                        {!locked && (
                          <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                        )}
                      </div>

                      {/* Bottom row: full-width subscribe CTA — web only, locked only */}
                      {locked && isPaymentUIEnabled() && (
                        <Button
                          className="mt-3 w-full h-10 gap-2 font-semibold shadow-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            trackSubscriptionClick("past_exams", {
                              model_id: model.id,
                              year: model.year,
                              from: "card_cta_full",
                            });
                            navigate("/subscription");
                          }}
                        >
                          <Crown className="w-4 h-4" />
                          <span>اشترك مرة واحدة للوصول لجميع المحتويات</span>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default PastExams;
