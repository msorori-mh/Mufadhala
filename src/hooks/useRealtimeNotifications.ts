import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Single shared realtime channel for notifications.
 * Handles both:
 *  1. Toast popup on new notification
 *  2. Incrementing cached unread count
 *
 * Call once in a top-level authenticated layout (e.g. Dashboard).
 */
export const useRealtimeNotifications = (userId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifs-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as { title: string; message: string; type: string };
          const variant = n.type === "warning" || n.type === "error" ? "destructive" as const : "default" as const;
          toast({ title: n.title, description: n.message, variant });

          // Increment cached unread count
          queryClient.setQueryData<number>(["unread-count", userId], (old) => (old ?? 0) + 1);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast, queryClient]);
};
