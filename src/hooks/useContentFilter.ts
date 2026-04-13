import { useMemo } from "react";
import { useStudentData } from "./useStudentData";
import { getContentFilter, type ContentFilter } from "@/lib/contentFilter";

/**
 * Shared hook that derives the content filter from the cached student record.
 * Combines useStudentData + getContentFilter into a single reusable source.
 */
export const useContentFilter = (userId: string | undefined) => {
  const { data: student, isLoading, error } = useStudentData(userId);

  const filter = useMemo<ContentFilter | null>(
    () => getContentFilter(student),
    [student?.major_id, student?.college_id],
  );

  return {
    student,
    filter,
    isLoading,
    error,
  };
};
