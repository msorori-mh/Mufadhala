import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared hook for unread notification count — cached + realtime incremented.
 * Replaces duplicate notification counting logic in Dashboard.
 */
export const useUnreadCount = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["unread-count", userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      return count ?? 0;
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 min
  });

  // Realtime increment on new notification
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`unread-count-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.setQueryData<number>(["unread-count", userId], (old) => (old ?? 0) + 1);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return query;
};
