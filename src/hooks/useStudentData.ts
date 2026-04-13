import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

/**
 * Shared hook to fetch student record — cached and deduplicated across pages.
 */
export const useStudentData = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["student", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("students")
        .select("id, user_id, first_name, second_name, third_name, fourth_name, phone, governorate, gpa, coordination_number, university_id, college_id, major_id, created_at, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      return data as Tables<"students"> | null;
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30s — lower to catch fresh registration data quickly
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });
};
