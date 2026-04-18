import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { App } from "@capacitor/app";
import { isNativePlatform } from "@/lib/capacitor";

/**
 * Invalidates all student-related queries when the app returns to the foreground
 * (Capacitor `appStateChange` on native, `visibilitychange` on web).
 *
 * Ensures admin updates (subscriptions, content, roles) appear without logout/login.
 */
export function useAppRefresh() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const refreshAll = () => {
      // Invalidate everything — React Query will refetch only what's mounted/active.
      queryClient.invalidateQueries();
    };

    // Web: tab visibility
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshAll();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Native: Capacitor app state
    let nativeListener: { remove: () => void } | null = null;
    if (isNativePlatform()) {
      App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) refreshAll();
      }).then((handle) => {
        nativeListener = handle;
      });
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      nativeListener?.remove();
    };
  }, [queryClient]);
}
