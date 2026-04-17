import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Sparkles, BookOpen, AlertCircle } from "lucide-react";
import { useQuickReviewData } from "@/hooks/useQuickReviewData";
import QuickReviewCard from "@/components/QuickReviewCard";
import { cn } from "@/lib/utils";

const ALL_KEY = "__all__";

export default function QuickReview() {
  const navigate = useNavigate();
  const { data, isLoading, canAccess, hasContent } = useQuickReviewData();
  const [activeSubject, setActiveSubject] = useState<string>(ALL_KEY);

  const filteredLessons = useMemo(() => {
    if (!data) return [];
    if (activeSubject === ALL_KEY) return data.lessons;
    return data.bySubject[activeSubject] ?? [];
  }, [data, activeSubject]);

  const subjectChips = useMemo(() => {
    if (!data) return [];
    return data.subjects
      .map((s) => ({
        id: s.id,
        name: s.name_ar,
        count: data.bySubject[s.id]?.length ?? 0,
      }))
      .filter((s) => s.count > 0);
  }, [data]);

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9 shrink-0"
            aria-label="رجوع"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary shrink-0" />
              <h1 className="text-base font-bold text-foreground truncate">
                المراجعة السريعة
              </h1>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              ملخصات كل دروسك في مكان واحد
            </p>
          </div>
          {data && (
            <Badge variant="secondary" className="shrink-0 text-[11px]">
              {data.lessons.length} درس
            </Badge>
          )}
        </div>

        {/* Subject filter chips */}
        {subjectChips.length > 0 && (
          <div className="border-t border-border/40 bg-muted/30">
            <div className="max-w-3xl mx-auto px-3 py-2 overflow-x-auto">
              <div className="flex items-center gap-2 w-max">
                <ChipButton
                  active={activeSubject === ALL_KEY}
                  onClick={() => setActiveSubject(ALL_KEY)}
                  label="الكل"
                  count={data?.lessons.length ?? 0}
                />
                {subjectChips.map((s) => (
                  <ChipButton
                    key={s.id}
                    active={activeSubject === s.id}
                    onClick={() => setActiveSubject(s.id)}
                    label={s.name}
                    count={s.count}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Body */}
      <main className="max-w-3xl mx-auto px-4 py-4 pb-24">
        {!canAccess ? (
          <EmptyState
            icon={<AlertCircle className="w-6 h-6 text-muted-foreground" />}
            title="لا يمكن عرض المراجعة حالياً"
            desc="تأكد من اكتمال بياناتك الأكاديمية للوصول إلى ملخصات الدروس."
            actionLabel="إكمال البيانات"
            onAction={() => navigate("/profile")}
          />
        ) : isLoading ? (
          <LoadingState />
        ) : !hasContent ? (
          <EmptyState
            icon={<BookOpen className="w-6 h-6 text-muted-foreground" />}
            title="لا توجد ملخصات بعد"
            desc="ستظهر ملخصات دروسك هنا فور إضافتها."
            actionLabel="استعرض الدروس"
            onAction={() => navigate("/lessons")}
          />
        ) : filteredLessons.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="w-6 h-6 text-muted-foreground" />}
            title="لا دروس في هذه المادة"
            desc="جرّب اختيار مادة أخرى من الأعلى."
          />
        ) : (
          <div className="space-y-3">
            {filteredLessons.map((lesson, idx) => (
              <QuickReviewCard key={lesson.id} lesson={lesson} index={idx} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ChipButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold transition-all",
        "border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-background text-foreground/80 border-border hover:bg-muted",
      )}
    >
      <span className="truncate max-w-[120px]">{label}</span>
      <span
        className={cn(
          "tabular-nums text-[10px] px-1.5 py-0.5 rounded-full",
          active ? "bg-primary-foreground/20" : "bg-muted",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} className="border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
              <Skeleton className="h-5 w-2/3" />
            </div>
            <Skeleton className="h-20 w-full rounded-lg" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  desc,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-8 flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          {icon}
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground max-w-xs">{desc}</p>
        </div>
        {actionLabel && onAction && (
          <Button size="sm" onClick={onAction} className="mt-2">
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
