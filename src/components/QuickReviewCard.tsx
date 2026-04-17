import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, BookOpen } from "lucide-react";
import type { QuickReviewLesson } from "@/hooks/useQuickReviewData";

interface QuickReviewCardProps {
  lesson: QuickReviewLesson;
  index: number;
}

/**
 * Read-only summary card. Links back to the original lesson page.
 * Does NOT modify lesson state, progress, or completion.
 */
export default function QuickReviewCard({ lesson, index }: QuickReviewCardProps) {
  return (
    <Card className="border bg-card hover:shadow-md transition-all">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-xs font-bold text-primary tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-sm leading-snug break-words">
              {lesson.title}
            </h3>
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 border border-border/60 p-3">
          <p className="text-[13px] text-foreground/90 leading-[1.85] whitespace-pre-wrap break-words">
            {lesson.summary}
          </p>
        </div>

        <Link
          to={`/lessons/${lesson.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded px-1 py-0.5"
          aria-label={`فتح الدرس الكامل: ${lesson.title}`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>افتح الدرس الكامل</span>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}
