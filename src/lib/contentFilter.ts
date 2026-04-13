/**
 * Centralised content-filter logic.
 *
 * Many pages need to decide whether to filter lessons / exams by
 * `major_id` (preferred) or fall back to `college_id`.
 * This helper eliminates that duplication.
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
 *
 * Returns `null` when neither major nor college is set (student hasn't
 * completed registration properly).
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
 * Useful for headers like "دروس كلية الطب" / "دروس تخصص الجراحة".
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
