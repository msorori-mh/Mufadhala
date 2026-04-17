/**
 * Platform Gate — Single source of truth for platform-aware payment UI.
 *
 * RULE:
 *   - WEB build  → all subscription/payment UI remains active.
 *   - NATIVE APK → no payment signals are exposed (Google Play compliance + dual track strategy).
 *
 * Backend payment logic stays untouched. This module ONLY governs the client UI surface.
 */
import { isNativePlatform } from "@/lib/capacitor";

/** True when payment/subscription UI surfaces are allowed (currently: web only). */
export const isPaymentUIEnabled = (): boolean => !isNativePlatform();

/** Convenience inverse — true when running inside the native app shell. */
export const isPaymentUIHidden = (): boolean => isNativePlatform();

/**
 * Safe wrapper: only fires conversion tracking when the payment UI is visible.
 * Prevents APK from emitting subscription click events for hidden CTAs.
 */
export function safeTrackSubscriptionClick(
  fn: () => void
): void {
  if (!isPaymentUIEnabled()) return;
  try { fn(); } catch { /* swallow — analytics must never break UX */ }
}

/**
 * Safe navigate: blocks programmatic navigation to /subscription (and similar)
 * inside the native app, redirecting to a neutral fallback instead.
 */
export function safeSubscriptionNavigate(
  navigate: (path: string) => void,
  fallback: string = "/dashboard"
): void {
  if (!isPaymentUIEnabled()) {
    navigate(fallback);
    return;
  }
  navigate("/subscription");
}
