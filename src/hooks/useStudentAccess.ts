import { useMemo } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useStudentData } from "./useStudentData";
import { getContentFilter, resolveSubjectIds, type ContentFilter } from "@/lib/contentFilter";
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
  status: StudentAccessStatus;
  loading: boolean;
  user: ReturnType<typeof useAuthContext>["user"];
  student: ReturnType<typeof useStudentData>["data"];
  filter: ContentFilter | null;
  filterName: string;
  /** Subject IDs derived from admission_tracks → track_subjects (official path) */
  subjectIds: string[];
  /** How subject IDs were resolved */
  resolvedVia: "track" | "none" | "pending";
  isAdmin: boolean;
  isModerator: boolean;
  isStaff: boolean;
  canAccessContent: boolean;
  canSubscribe: boolean;
  isLegacyCorrupted: boolean;
  refetchStudent: () => void;
}

/**
 * Centralized student access resolver — SINGLE SOURCE OF TRUTH.
 *
 * OFFICIAL content resolution path:
 *   student.college_id → colleges.admission_track_id → track_subjects → subject_ids → lessons
 */
export function useStudentAccess(): StudentAccessResult {
  const { user, loading: authLoading, isAdmin, isModerator, isStaff } = useAuthContext();
  const {
    data: student,
    isLoading: studentLoading,
    refetch: refetchStudent,
  } = useStudentData(user?.id);

  // Derive legacy content filter (kept for backward compat)
  const filter = useMemo<ContentFilter | null>(
    () => getContentFilter(student),
    [student?.major_id, student?.college_id],
  );

  // ── OFFICIAL: Resolve subject IDs via admission_tracks ──
  const collegeId = student?.college_id;
  const { data: subjectResult } = useQuery({
    queryKey: ["track-subject-ids", collegeId],
    queryFn: async () => {
      if (!collegeId) return { subjectIds: [] as string[], resolvedVia: "none" as const };
      return resolveSubjectIds(supabase, collegeId);
    },
    enabled: !!collegeId,
    staleTime: 10 * 60 * 1000,
  });

  const subjectIds = subjectResult?.subjectIds ?? [];
  const resolvedVia = subjectResult?.resolvedVia ?? "pending";

  // Fetch filter name (college display name)
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

  const isLegacyCorrupted =
    status === "incomplete_academic_data" && !!student;

  return {
    status,
    loading,
    user,
    student,
    filter,
    filterName,
    subjectIds,
    resolvedVia,
    isAdmin,
    isModerator,
    isStaff,
    canAccessContent,
    canSubscribe,
    isLegacyCorrupted,
    refetchStudent,
  };
}
