import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Global hook that listens for new notifications via Realtime
 * and shows a toast. Call once in a top-level authenticated layout.
 */
export const useRealtimeNotifications = (userId: string | undefined) => {
  const { toast } = useToast();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`global-notifs-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as { title: string; message: string; type: string; link?: string };
          const variant = n.type === "warning" || n.type === "error" ? "destructive" as const : "default" as const;
          toast({
            title: n.title,
            description: n.message,
            variant,
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);
};
