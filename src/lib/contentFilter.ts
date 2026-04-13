/**
 * Centralised content-filter logic.
 *
 * The platform uses subject-based content resolution:
 *   student → college → college_subjects → subject_ids → lessons
 *
 * This eliminates duplicate lessons across colleges and ensures
 * content is shared correctly across the same admission track.
 */

export interface ContentFilter {
  /** Which relationship is being used */
  type: "major" | "college";
  /** The Supabase column name to filter on (legacy — kept for backward compat) */
  field: "major_id" | "college_id";
  /** The UUID value to match */
  value: string;
}

/**
 * Derive the content filter from a student-like object.
 * Returns `null` when neither major nor college is set.
 */
export function getContentFilter(
  student: { major_id?: string | null; college_id?: string | null } | null | undefined,
): ContentFilter | null {
  if (!student) return null;
  if (student.major_id) {
    return { type: "major", field: "major_id", value: student.major_id };
  }
  if (student.college_id) {
    return { type: "college", field: "college_id", value: student.college_id };
  }
  return null;
}

/**
 * Fetch the human-readable name for the current filter target.
 */
export async function fetchFilterName(
  supabase: { from: (table: string) => any },
  filter: ContentFilter,
): Promise<string> {
  const table = filter.type === "major" ? "majors" : "colleges";
  const { data } = await supabase
    .from(table)
    .select("name_ar")
    .eq("id", filter.value)
    .maybeSingle();
  return data?.name_ar ?? "";
}

/**
 * Fetch subject IDs for a college from college_subjects.
 * This is the NEW primary content resolution path.
 */
export async function fetchSubjectIdsForCollege(
  supabase: { from: (table: string) => any },
  collegeId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("college_subjects")
    .select("subject_id")
    .eq("college_id", collegeId);
  return (data || []).map((r: any) => r.subject_id);
}

/**
 * Fetch deduplicated published lessons by subject IDs.
 * Uses DISTINCT ON (title, subject_id) to remove cross-college duplicates.
 */
export async function fetchLessonsBySubjects(
  supabase: { from: (table: string) => any },
  subjectIds: string[],
): Promise<any[]> {
  if (subjectIds.length === 0) return [];
  const { data } = await supabase
    .from("lessons")
    .select("id, title, summary, display_order, is_free, subject_id, grade_level, major_id, college_id")
    .in("subject_id", subjectIds)
    .eq("is_published", true)
    .order("display_order");

  if (!data || data.length === 0) return [];

  // Deduplicate: keep first occurrence per (title, subject_id)
  const seen = new Set<string>();
  return data.filter((l: any) => {
    const key = `${l.title}::${l.subject_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
