/**
 * Centralised content-filter logic.
 *
 * OFFICIAL content resolution path (v2 — track-based):
 *   student → college → admission_track → track_subjects → subject_ids → lessons
 *
 * Fallback (temporary, for colleges without admission_track_id):
 *   student → college → college_subjects → subject_ids → lessons
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
 * OFFICIAL: Resolve subject IDs via the admission_tracks path.
 * Path: college_id → colleges.admission_track_id → track_subjects → subject_ids
 *
 * Falls back to college_subjects if the college has no admission_track_id.
 */
export async function resolveSubjectIds(
  supabase: { from: (table: string) => any },
  collegeId: string,
): Promise<{ subjectIds: string[]; resolvedVia: "track" | "college_subjects" | "none" }> {
  // Step 1: Get admission_track_id from the college
  const { data: college } = await supabase
    .from("colleges")
    .select("admission_track_id")
    .eq("id", collegeId)
    .maybeSingle();

  const trackId = college?.admission_track_id;

  // Step 2: If track exists, use track_subjects (official path)
  if (trackId) {
    const { data } = await supabase
      .from("track_subjects")
      .select("subject_id")
      .eq("track_id", trackId);
    const ids = (data || []).map((r: any) => r.subject_id as string);
    if (ids.length > 0) return { subjectIds: ids, resolvedVia: "track" };
  }

  // Step 3: Fallback to college_subjects (temporary backward compat)
  const { data: csData } = await supabase
    .from("college_subjects")
    .select("subject_id")
    .eq("college_id", collegeId);
  const fallbackIds = (csData || []).map((r: any) => r.subject_id as string);

  if (fallbackIds.length > 0) {
    console.warn(`[ContentFilter] College ${collegeId} resolved via college_subjects fallback (no track or empty track_subjects)`);
    return { subjectIds: fallbackIds, resolvedVia: "college_subjects" };
  }

  return { subjectIds: [], resolvedVia: "none" };
}

/**
 * @deprecated Use resolveSubjectIds instead. Kept for temporary backward compat.
 */
export async function fetchSubjectIdsForCollege(
  supabase: { from: (table: string) => any },
  collegeId: string,
): Promise<string[]> {
  const { subjectIds } = await resolveSubjectIds(supabase, collegeId);
  return subjectIds;
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
