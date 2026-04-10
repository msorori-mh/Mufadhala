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
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      return data as Tables<"students"> | null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 min — student data rarely changes
  });
};
