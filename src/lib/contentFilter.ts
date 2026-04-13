/**
 * Centralised content-filter logic.
 *
 * OFFICIAL content resolution path:
 *   student → college → admission_track → track_subjects → subject_ids → lessons
 */

export interface ContentFilter {
  /** Which relationship is being used */
  type: "major" | "college";
  /** The Supabase column name to filter on */
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
 * Resolve subject IDs via the admission_tracks path.
 * Path: college_id → colleges.admission_track_id → track_subjects → subject_ids
 */
export async function resolveSubjectIds(
  supabase: { from: (table: string) => any },
  collegeId: string,
): Promise<{ subjectIds: string[]; resolvedVia: "track" | "none" }> {
  // Step 1: Get admission_track_id from the college
  const { data: college } = await supabase
    .from("colleges")
    .select("admission_track_id")
    .eq("id", collegeId)
    .maybeSingle();

  const trackId = college?.admission_track_id;

  // Step 2: If track exists, use track_subjects
  if (trackId) {
    const { data } = await supabase
      .from("track_subjects")
      .select("subject_id")
      .eq("track_id", trackId);
    const ids = (data || []).map((r: any) => r.subject_id as string);
    if (ids.length > 0) return { subjectIds: ids, resolvedVia: "track" };
  }

  return { subjectIds: [], resolvedVia: "none" };
}

/**
 * Fetch deduplicated published lessons by subject IDs.
 * Uses client-side dedup by (title, subject_id) to remove cross-college duplicates.
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
