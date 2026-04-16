import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import NativeSelect from "@/components/NativeSelect";

type WithName = { id: string; name_ar: string; is_active?: boolean };
type University = WithName;
type College = WithName & { university_id: string };
type Major = WithName & { college_id: string };

export type CascadingAcademicSelectsProps = {
  universities: University[];
  colleges: College[];
  majors: Major[];
  universityId: string;
  collegeId: string;
  majorId: string;
  onUniversityChange: (id: string) => void;
  onCollegeChange: (id: string) => void;
  onMajorChange: (id: string) => void;

  // UX options
  required?: boolean;              // adds * to labels
  showLabels?: boolean;            // default true
  emptyOptionLabel?: string;       // e.g. "بدون" for admin, undefined for required forms
  className?: string;              // wrapper className
  layout?: "stack" | "grid";       // default "stack"
  // Restrict majors to allowed list (for moderator scope or plan restriction)
  allowedMajorIds?: string[] | null;
  // Filter inactive items out (default true for non-staff)
  includeInactive?: boolean;
  // Custom labels
  labels?: { university?: string; college?: string; major?: string };
  // Custom placeholders override
  placeholders?: { university?: string; college?: string; major?: string };
};

/**
 * Unified cascading selector for University → College → Major.
 *
 * Design rules (prevents past UX bugs):
 *  1. All three fields are ALWAYS rendered (no conditional mount).
 *  2. Disabled state replaces hidden state when parent is missing.
 *  3. Placeholder is dynamic and explains exactly why a field is disabled.
 *  4. Selecting a parent automatically resets dependent children.
 */
export default function CascadingAcademicSelects({
  universities,
  colleges,
  majors,
  universityId,
  collegeId,
  majorId,
  onUniversityChange,
  onCollegeChange,
  onMajorChange,
  required = false,
  showLabels = true,
  emptyOptionLabel,
  className = "",
  layout = "stack",
  allowedMajorIds = null,
  includeInactive = false,
  labels,
  placeholders,
}: CascadingAcademicSelectsProps) {
  const star = required ? " *" : "";
  const lUniv = (labels?.university ?? "الجامعة") + star;
  const lColl = (labels?.college ?? "الكلية") + star;
  const lMaj = (labels?.major ?? "التخصص") + star;

  const filteredUniversities = useMemo(
    () => universities.filter((u) => includeInactive || u.is_active !== false),
    [universities, includeInactive],
  );

  const filteredColleges = useMemo(() => {
    if (!universityId) return [];
    return colleges
      .filter((c) => c.university_id === universityId)
      .filter((c) => includeInactive || c.is_active !== false);
  }, [colleges, universityId, includeInactive]);

  const filteredMajors = useMemo(() => {
    if (!collegeId) return [];
    let list = majors
      .filter((m) => m.college_id === collegeId)
      .filter((m) => includeInactive || m.is_active !== false);
    if (allowedMajorIds && allowedMajorIds.length > 0) {
      list = list.filter((m) => allowedMajorIds.includes(m.id));
    }
    return list;
  }, [majors, collegeId, includeInactive, allowedMajorIds]);

  const handleUniversity = (v: string) => {
    onUniversityChange(v);
    if (collegeId) onCollegeChange("");
    if (majorId) onMajorChange("");
  };

  const handleCollege = (v: string) => {
    onCollegeChange(v);
    if (majorId) onMajorChange("");
  };

  const univPlaceholder =
    placeholders?.university ??
    (filteredUniversities.length === 0 ? "لا توجد جامعات متاحة" : "اختر الجامعة");

  const collPlaceholder =
    placeholders?.college ??
    (!universityId
      ? "اختر الجامعة أولاً"
      : filteredColleges.length === 0
        ? "لا توجد كليات لهذه الجامعة"
        : "اختر الكلية");

  const majPlaceholder =
    placeholders?.major ??
    (!collegeId
      ? "اختر الكلية أولاً"
      : filteredMajors.length === 0
        ? "لا توجد تخصصات لهذه الكلية"
        : "اختر التخصص");

  const buildOptions = (items: WithName[]) => {
    const opts = items.map((i) => ({ value: i.id, label: i.name_ar }));
    if (emptyOptionLabel) opts.unshift({ value: "", label: emptyOptionLabel });
    return opts;
  };

  const wrapperCls =
    layout === "grid"
      ? `grid grid-cols-1 sm:grid-cols-3 gap-3 ${className}`
      : `space-y-3 ${className}`;

  return (
    <div className={wrapperCls}>
      <div className="space-y-1.5">
        {showLabels && <Label>{lUniv}</Label>}
        <NativeSelect
          value={universityId}
          onValueChange={handleUniversity}
          placeholder={univPlaceholder}
          disabled={filteredUniversities.length === 0}
          options={buildOptions(filteredUniversities)}
        />
      </div>

      <div className="space-y-1.5">
        {showLabels && <Label>{lColl}</Label>}
        <NativeSelect
          value={collegeId}
          onValueChange={handleCollege}
          placeholder={collPlaceholder}
          disabled={!universityId || filteredColleges.length === 0}
          options={buildOptions(filteredColleges)}
        />
      </div>

      <div className="space-y-1.5">
        {showLabels && <Label>{lMaj}</Label>}
        <NativeSelect
          value={majorId}
          onValueChange={onMajorChange}
          placeholder={majPlaceholder}
          disabled={!collegeId || filteredMajors.length === 0}
          options={buildOptions(filteredMajors)}
        />
      </div>
    </div>
  );
}
