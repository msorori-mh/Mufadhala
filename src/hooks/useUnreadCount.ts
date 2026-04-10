import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared hook for unread notification count — cached globally.
 * Realtime increment is handled by useRealtimeNotifications (single channel).
 * No dedicated realtime channel here — reduces WebSocket overhead.
 */
export const useUnreadCount = (userId: string | undefined) => {
  return useQuery({
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
    staleTime: 60 * 1000,
  });
};
