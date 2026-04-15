/**
 * Tracks user engagement and decides when to trigger the paywall.
 * Uses lesson_progress count and question interaction count.
 */
import { useEffect, useRef } from "react";

const TRIGGERED_KEY = "paywall_auto_triggered";

interface PaywallTriggerConfig {
  completedLessons: number;
  questionInteractions: number;
  hasSubscription: boolean;
  onTrigger: (reason: "free_limit_reached" | "engagement") => void;
}

/**
 * Fires onTrigger once per session when:
 * - 2+ free lessons completed, OR
 * - 3+ question interactions (reveal answers)
 */
export function usePaywallTrigger({
  completedLessons,
  questionInteractions,
  hasSubscription,
  onTrigger,
}: PaywallTriggerConfig) {
  const triggered = useRef(false);

  useEffect(() => {
    if (hasSubscription || triggered.current) return;

    // Only fire once per session
    try {
      if (sessionStorage.getItem(TRIGGERED_KEY)) return;
    } catch {}

    let reason: "free_limit_reached" | "engagement" | null = null;

    if (completedLessons >= 10) {
      reason = "free_limit_reached";
    } else if (questionInteractions >= 20) {
      reason = "engagement";
    }

    if (reason) {
      triggered.current = true;
      try { sessionStorage.setItem(TRIGGERED_KEY, "1"); } catch {}
      // Slight delay so UI has time to settle
      const t = setTimeout(() => onTrigger(reason!), 1500);
      return () => clearTimeout(t);
    }
  }, [completedLessons, questionInteractions, hasSubscription, onTrigger]);
}
