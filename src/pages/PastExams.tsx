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
  const { isPaid: hasActiveSubscription } = useSubscription(user?.id);

  const [selectedUniversityId, setSelectedUniversityId] = useState<string>("");

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
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>لا توجد نماذج متاحة لهذه الجامعة حالياً</p>
          </div>
        ) : (
          <div className="space-y-2">
            {universityName && (
              <p className="text-sm text-muted-foreground mb-1">
                نماذج {universityName}
              </p>
            )}
            {sortedModels.map((model, idx) => {
              const locked = model.is_paid && !hasActiveSubscription;
              const prevYear = idx > 0 ? sortedModels[idx - 1].year : null;
              const isYearBoundary = idx > 0 && prevYear !== model.year;
              return (
                <div key={model.id} className={isYearBoundary ? "pt-2 mt-1 border-t border-dashed border-border/60" : ""}>
                  <Card
                    className={`cursor-pointer transition-shadow hover:shadow-md ${locked ? "opacity-75" : ""}`}
                    onClick={() => {
                      if (locked) {
                        if (isPaymentUIEnabled()) {
                          trackSubscriptionClick("past_exams", { model_id: model.id, year: model.year });
                          navigate("/subscription");
                        }
                        // In native APK: do nothing (card stays visually locked, no upsell flow).
                      } else {
                        navigate(`/past-exams/${model.id}`);
                      }
                    }}
                  >
                    <CardContent className="flex items-center gap-3 p-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${locked ? "bg-primary/15 ring-1 ring-primary/30" : "bg-primary/10"}`}>
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
                              <span className="text-muted-foreground font-normal">{model.duration_minutes}د</span>
                            </>
                          )}
                        </p>
                      </div>
                      {model.is_paid && (
                        <Badge
                          variant={locked ? "default" : "secondary"}
                          className="text-[10px] shrink-0"
                        >
                          {locked ? "اشتراك" : "اشتراك ✓"}
                        </Badge>
                      )}
                      {!model.is_paid && (
                        <Badge variant="outline" className="text-[10px] shrink-0 border-secondary/40 text-secondary">مجاني</Badge>
                      )}
                      {locked && isPaymentUIEnabled() && (
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-[11px] shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            trackSubscriptionClick("past_exams", { model_id: model.id, year: model.year, from: "card_cta" });
                            navigate("/subscription");
                          }}
                        >
                          اشترك
                        </Button>
                      )}
                      {!locked && <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />}
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
