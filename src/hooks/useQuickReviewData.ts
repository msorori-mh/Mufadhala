import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchLessonsBySubjects } from "@/lib/contentFilter";
import { useStudentAccess } from "./useStudentAccess";

export interface QuickReviewLesson {
  id: string;
  title: string;
  summary: string;
  subject_id: string | null;
  display_order: number;
  isCompleted: boolean;
}

export interface QuickReviewSubject {
  id: string;
  name_ar: string;
  icon: string | null;
}

export interface QuickReviewData {
  lessons: QuickReviewLesson[];
  subjects: QuickReviewSubject[];
  /** Map: subject_id -> lessons for fast grouping */
  bySubject: Record<string, QuickReviewLesson[]>;
  /** Total completed lessons (across all filtered) */
  completedCount: number;
}

/**
 * Read-only aggregator over existing lesson summaries.
 * No new tables, no new logic — reuses contentFilter pipeline.
 * Reads lesson_progress (read-only) to mark completed lessons visually.
 */
export function useQuickReviewData() {
  const { subjectIds, canAccessContent, loading: accessLoading, student } = useStudentAccess();

  const enabled = canAccessContent && subjectIds.length > 0;
  const cacheKey = subjectIds.slice().sort().join(",");
  const studentId = student?.id;

  const { data, isLoading, error } = useQuery<QuickReviewData>({
    queryKey: ["quick-review-data", cacheKey, studentId],
    queryFn: async () => {
      // Parallel: fetch lessons + subject names + completed lesson IDs (read-only)
      const [rawLessons, subjectsRes, progressRes] = await Promise.all([
        fetchLessonsBySubjects(supabase, subjectIds),
        supabase
          .from("subjects")
          .select("id, name_ar, icon")
          .in("id", subjectIds),
        studentId
          ? supabase
              .from("lesson_progress")
              .select("lesson_id")
              .eq("student_id", studentId)
              .eq("is_completed", true)
          : Promise.resolve({ data: [] as { lesson_id: string }[] }),
      ]);

      const completedSet = new Set<string>(
        ((progressRes as any).data ?? []).map((p: any) => p.lesson_id),
      );

      const lessons: QuickReviewLesson[] = (rawLessons ?? [])
        .filter((l: any) => l.summary && l.summary.trim().length > 0)
        .map((l: any) => ({
          id: l.id,
          title: l.title,
          summary: l.summary,
          subject_id: l.subject_id ?? null,
          display_order: l.display_order ?? 0,
          isCompleted: completedSet.has(l.id),
        }));

      const subjects: QuickReviewSubject[] = (subjectsRes.data ?? []).map((s: any) => ({
        id: s.id,
        name_ar: s.name_ar,
        icon: s.icon,
      }));

      const bySubject: Record<string, QuickReviewLesson[]> = {};
      for (const l of lessons) {
        const key = l.subject_id ?? "_unassigned";
        if (!bySubject[key]) bySubject[key] = [];
        bySubject[key].push(l);
      }

      const completedCount = lessons.filter((l) => l.isCompleted).length;

      return { lessons, subjects, bySubject, completedCount };
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });

  return {
    data,
    isLoading: accessLoading || (enabled && isLoading),
    error,
    canAccess: canAccessContent,
    hasContent: !!data && data.lessons.length > 0,
  };
}
