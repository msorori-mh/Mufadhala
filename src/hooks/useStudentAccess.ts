import { useMemo } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useStudentData } from "./useStudentData";
import { getContentFilter, type ContentFilter } from "@/lib/contentFilter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Decision states ────────────────────────────────────────
export type StudentAccessStatus =
  | "loading"
  | "no_session"
  | "staff_user"
  | "no_student_record"
  | "incomplete_academic_data"
  | "ready_with_college"
  | "ready_with_major";

export interface StudentAccessResult {
  /** Current decision status */
  status: StudentAccessStatus;

  /** True while any upstream data is still loading */
  loading: boolean;

  /** Authenticated user (null when no session) */
  user: ReturnType<typeof useAuthContext>["user"];

  /** Full student row (null when missing) */
  student: ReturnType<typeof useStudentData>["data"];

  /** Derived content filter (null when academic data incomplete) */
  filter: ContentFilter | null;

  /** Human-readable name for the current filter target */
  filterName: string;

  /** Role flags from AuthContext */
  isAdmin: boolean;
  isModerator: boolean;
  isStaff: boolean;

  /** Convenience: student has enough data to access content */
  canAccessContent: boolean;

  /** Convenience: student has governorate set (needed for subscription pricing) */
  canSubscribe: boolean;

  /** Student record exists but critical academic fields are missing */
  isLegacyCorrupted: boolean;

  /** Refetch student data (useful after profile edits or retries) */
  refetchStudent: () => void;
}

/**
 * Centralized student access resolver.
 *
 * This is the SINGLE SOURCE OF TRUTH for every page that needs to know:
 * - whether the user can see content
 * - which content filter to use
 * - whether subscription pricing is available
 * - whether the student has corrupted legacy data
 *
 * All pages MUST use this hook instead of scattered student/filter checks.
 */
export function useStudentAccess(): StudentAccessResult {
  const { user, loading: authLoading, isAdmin, isModerator, isStaff } = useAuthContext();
  const {
    data: student,
    isLoading: studentLoading,
    refetch: refetchStudent,
  } = useStudentData(user?.id);

  // Derive content filter from student record
  const filter = useMemo<ContentFilter | null>(
    () => getContentFilter(student),
    [student?.major_id, student?.college_id],
  );

  // Fetch filter name (college or major display name)
  const { data: filterName = "" } = useQuery({
    queryKey: ["filter-name", filter?.type, filter?.value],
    queryFn: async () => {
      if (!filter) return "";
      const table = filter.type === "major" ? "majors" : "colleges";
      const { data } = await supabase
        .from(table)
        .select("name_ar")
        .eq("id", filter.value)
        .maybeSingle();
      return data?.name_ar ?? "";
    },
    enabled: !!filter,
    staleTime: 10 * 60 * 1000,
  });

  // ── Decision logic ─────────────────────────────────────
  const loading = authLoading || (!!user && studentLoading);

  const status = useMemo<StudentAccessStatus>(() => {
    if (loading) return "loading";
    if (!user) return "no_session";
    if (isStaff) return "staff_user";
    if (!student) return "no_student_record";
    // Student record exists — check completeness
    if (!student.college_id) return "incomplete_academic_data";
    if (student.major_id) return "ready_with_major";
    return "ready_with_college";
  }, [loading, user, isStaff, student]);

  const canAccessContent =
    status === "ready_with_major" ||
    status === "ready_with_college" ||
    status === "staff_user";

  const canSubscribe =
    (status === "ready_with_major" || status === "ready_with_college") &&
    !!student?.governorate;

  // Legacy corrupted = has a student record but missing college_id
  const isLegacyCorrupted =
    status === "incomplete_academic_data" && !!student;

  return {
    status,
    loading,
    user,
    student,
    filter,
    filterName,
    isAdmin,
    isModerator,
    isStaff,
    canAccessContent,
    canSubscribe,
    isLegacyCorrupted,
    refetchStudent,
  };
}
