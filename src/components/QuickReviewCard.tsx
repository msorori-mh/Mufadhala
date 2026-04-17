import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, BookOpen, Clock, CheckCircle2 } from "lucide-react";
import type { QuickReviewLesson } from "@/hooks/useQuickReviewData";
import { chunkSummary, estimateReadMinutes } from "@/lib/quickReviewFormat";
import { cn } from "@/lib/utils";

interface QuickReviewCardProps {
  lesson: QuickReviewLesson;
  index: number;
}

/**
 * Read-only summary card with visual chunking.
 * Does NOT modify lesson state, progress, or completion.
 * Visually highlights lessons the student has already completed.
 */
export default function QuickReviewCard({ lesson, index }: QuickReviewCardProps) {
  const chunks = chunkSummary(lesson.summary);
  const minutes = estimateReadMinutes(lesson.summary);
  const done = lesson.isCompleted;

  return (
    <Card
      className={cn(
        "border hover:shadow-md transition-all overflow-hidden relative",
        done
          ? "bg-secondary/[0.04] border-secondary/40 ring-1 ring-secondary/20"
          : "bg-card",
      )}
    >
      {/* Right accent stripe (RTL) for completed lessons */}
      {done && (
        <span
          aria-hidden="true"
          className="absolute top-0 right-0 h-full w-[3px] bg-secondary"
        />
      )}
      <CardContent className="p-0">
        {/* Header strip */}
        <div
          className={cn(
            "flex items-center gap-3 p-4 pb-3 border-b border-border/40",
            done ? "bg-secondary/[0.07]" : "bg-muted/20",
          )}
        >
          <div
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
              done ? "bg-secondary/15" : "bg-primary/10",
            )}
          >
            {done ? (
              <CheckCircle2 className="w-5 h-5 text-secondary" />
            ) : (
              <span className="text-xs font-bold text-primary tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                "font-bold text-sm leading-snug break-words",
                done ? "text-foreground/85" : "text-foreground",
              )}
            >
              {lesson.title}
            </h3>
            {done && (
              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-secondary">
                <CheckCircle2 className="w-3 h-3" />
                مكتمل
              </span>
            )}
          </div>
          {minutes > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0 tabular-nums">
              <Clock className="w-3 h-3" />
              <span>~{minutes} د</span>
            </div>
          )}
        </div>

        {/* Chunked body with right accent bar (RTL) */}
        <div className="p-4 space-y-3">
          {chunks.map((chunk, i) => (
            <div
              key={i}
              className="relative pr-3 border-r-[3px] border-primary/30"
            >
              <p className="text-[14px] text-foreground/90 leading-[1.95] break-words whitespace-pre-wrap">
                {chunk}
              </p>
            </div>
          ))}
        </div>

        {/* Footer link */}
        <div className="px-4 pb-4">
          <Link
            to={`/lessons/${lesson.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded px-1 py-0.5"
            aria-label={`فتح الدرس الكامل: ${lesson.title}`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>افتح الدرس الكامل</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
