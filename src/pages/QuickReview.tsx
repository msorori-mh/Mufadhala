import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ChevronRight,
  ChevronLeft,
  Sparkles,
  BookOpen,
  AlertCircle,
  Play,
  X,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useQuickReviewData, type QuickReviewLesson } from "@/hooks/useQuickReviewData";
import QuickReviewCard from "@/components/QuickReviewCard";
import { chunkSummary, estimateReadMinutes } from "@/lib/quickReviewFormat";
import { cn } from "@/lib/utils";

const ALL_KEY = "__all__";

export default function QuickReview() {
  const navigate = useNavigate();
  const { data, isLoading, canAccess, hasContent } = useQuickReviewData();
  const [activeSubject, setActiveSubject] = useState<string>(ALL_KEY);
  const [focusMode, setFocusMode] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);

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

  // Reset focus index when filter or list changes
  useEffect(() => {
    setFocusIndex(0);
  }, [activeSubject, filteredLessons.length]);

  // Lock body scroll while focus mode is open
  useEffect(() => {
    if (!focusMode) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [focusMode]);

  const startFocus = () => {
    if (filteredLessons.length === 0) return;
    setFocusIndex(0);
    setFocusMode(true);
  };

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
          <div className="space-y-4">
            {/* Focus Mode CTA banner */}
            <Card className="border-primary/30 bg-gradient-to-l from-primary/[0.06] to-primary/[0.02]">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground">
                    وضع المراجعة السريعة
                  </h3>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                    استعرض الملخصات واحداً تلو الآخر مثل البطاقات التعليمية
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={startFocus}
                  className="shrink-0 h-9 gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  ابدأ مراجعة سريعة
                </Button>
              </CardContent>
            </Card>

            {/* Completion progress (read-only, derived from lesson_progress) */}
            {(() => {
              const total = filteredLessons.length;
              const done = filteredLessons.filter((l) => l.isCompleted).length;
              if (total === 0) return null;
              const pct = Math.round((done / total) * 100);
              return (
                <div className="flex items-center gap-3 px-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        تقدّم القراءة
                      </span>
                      <span className="text-[11px] font-bold text-foreground tabular-nums">
                        {done} / {total}
                      </span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                </div>
              );
            })()}

            {/* List of summary cards */}
            <div className="space-y-3">
              {filteredLessons.map((lesson, idx) => (
                <QuickReviewCard key={lesson.id} lesson={lesson} index={idx} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Focus Mode overlay */}
      {focusMode && filteredLessons.length > 0 && (
        <FocusMode
          lessons={filteredLessons}
          index={focusIndex}
          onIndexChange={setFocusIndex}
          onClose={() => setFocusMode(false)}
          onOpenLesson={(id) => {
            setFocusMode(false);
            navigate(`/lessons/${id}`);
          }}
        />
      )}
    </div>
  );
}

// ─── Focus Mode (flashcard-style) ────────────────────────

function FocusMode({
  lessons,
  index,
  onIndexChange,
  onClose,
  onOpenLesson,
}: {
  lessons: QuickReviewLesson[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  onOpenLesson: (id: string) => void;
}) {
  const total = lessons.length;
  const current = lessons[Math.min(index, total - 1)];
  const progressPct = ((index + 1) / total) * 100;
  const isFirst = index === 0;
  const isLast = index === total - 1;

  const chunks = useMemo(() => chunkSummary(current.summary), [current.summary]);
  const minutes = estimateReadMinutes(current.summary);

  // Keyboard navigation (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // RTL: ArrowRight = previous, ArrowLeft = next
      if (e.key === "ArrowRight" && !isFirst) onIndexChange(index - 1);
      if (e.key === "ArrowLeft" && !isLast) onIndexChange(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, isFirst, isLast, onClose, onIndexChange]);

  return (
    <div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="وضع المراجعة السريعة"
    >
      {/* Top bar with progress */}
      <div className="border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 shrink-0"
            aria-label="إغلاق وضع المراجعة"
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">
                وضع المراجعة
              </span>
              <span className="text-xs font-bold text-foreground tabular-nums">
                {index + 1} / {total}
              </span>
            </div>
            <Progress value={progressPct} className="h-1.5" />
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <Card className="border-2 border-primary/15 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {/* Card header */}
              <div className="flex items-start gap-3 p-4 border-b border-border/40 bg-primary/[0.04]">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-primary/80 mb-0.5">
                    ملخص الدرس
                  </p>
                  <h2 className="font-bold text-foreground text-base leading-snug break-words">
                    {current.title}
                  </h2>
                </div>
                {minutes > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0 tabular-nums">
                    <Clock className="w-3 h-3" />
                    <span>~{minutes} د</span>
                  </div>
                )}
              </div>

              {/* Chunked body */}
              <div className="p-4 space-y-4">
                {chunks.map((chunk, i) => (
                  <div
                    key={i}
                    className="relative pr-3 border-r-[3px] border-primary/30"
                  >
                    <p className="text-[15px] text-foreground/90 leading-[1.95] break-words whitespace-pre-wrap">
                      {chunk}
                    </p>
                  </div>
                ))}
              </div>

              {/* Open full lesson */}
              <div className="px-4 pb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenLesson(current.id)}
                  className="h-9 gap-1.5 text-primary hover:bg-primary/5 px-2"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  افتح الدرس الكامل
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="border-t border-border/60 bg-background/95 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => onIndexChange(index - 1)}
            disabled={isFirst}
            className="flex-1 h-11 gap-1.5"
            aria-label="الملخص السابق"
          >
            <ChevronRight className="w-4 h-4" />
            السابق
          </Button>
          {isLast ? (
            <Button
              onClick={onClose}
              className="flex-1 h-11 gap-1.5"
              aria-label="إنهاء المراجعة"
            >
              تم 🎉
            </Button>
          ) : (
            <Button
              onClick={() => onIndexChange(index + 1)}
              className="flex-1 h-11 gap-1.5"
              aria-label="الملخص التالي"
            >
              التالي
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Small UI helpers ────────────────────────────────────

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
