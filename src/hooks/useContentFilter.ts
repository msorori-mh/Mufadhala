import { useMemo } from "react";
import { useStudentData } from "./useStudentData";
import { getContentFilter, fetchFilterName, type ContentFilter } from "@/lib/contentFilter";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared hook that derives the content filter from the cached student record.
 * Combines useStudentData + getContentFilter into a single reusable source.
 * Also fetches the human-readable filter name (major/college name).
 */
export const useContentFilter = (userId: string | undefined) => {
  const { data: student, isLoading: studentLoading, error } = useStudentData(userId);

  const filter = useMemo<ContentFilter | null>(
    () => getContentFilter(student),
    [student?.major_id, student?.college_id],
  );

  const { data: filterName = "" } = useQuery({
    queryKey: ["filter-name", filter?.type, filter?.value],
    queryFn: () => fetchFilterName(supabase, filter!),
    enabled: !!filter,
    staleTime: 10 * 60 * 1000,
  });

  return {
    student,
    filter,
    filterName,
    isLoading: studentLoading,
    error,
  };
};
