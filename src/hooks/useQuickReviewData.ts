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
}

/**
 * Read-only aggregator over existing lesson summaries.
 * No new tables, no new logic — reuses contentFilter pipeline.
 */
export function useQuickReviewData() {
  const { subjectIds, canAccessContent, loading: accessLoading } = useStudentAccess();

  const enabled = canAccessContent && subjectIds.length > 0;
  const cacheKey = subjectIds.slice().sort().join(",");

  const { data, isLoading, error } = useQuery<QuickReviewData>({
    queryKey: ["quick-review-data", cacheKey],
    queryFn: async () => {
      // Parallel: fetch lessons via existing helper + subject names
      const [rawLessons, subjectsRes] = await Promise.all([
        fetchLessonsBySubjects(supabase, subjectIds),
        supabase
          .from("subjects")
          .select("id, name_ar, icon")
          .in("id", subjectIds),
      ]);

      const lessons: QuickReviewLesson[] = (rawLessons ?? [])
        .filter((l: any) => l.summary && l.summary.trim().length > 0)
        .map((l: any) => ({
          id: l.id,
          title: l.title,
          summary: l.summary,
          subject_id: l.subject_id ?? null,
          display_order: l.display_order ?? 0,
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

      return { lessons, subjects, bySubject };
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  return {
    data,
    isLoading: accessLoading || (enabled && isLoading),
    error,
    canAccess: canAccessContent,
    hasContent: !!data && data.lessons.length > 0,
  };
}
