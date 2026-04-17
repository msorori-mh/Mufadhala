import { supabase } from "@/integrations/supabase/client";
import { isPaymentUIEnabled } from "@/lib/platformGate";

/** Approved subscription touchpoints. Keep this in sync with DB validation trigger. */
export type ConversionSource =
  | "exam_simulator"
  | "ai_generator"
  | "past_exams"
  | "ai_performance"
  | "chat_widget";

export type ConversionEventType = "view" | "click";

/**
 * Track a conversion event (subscription touchpoint interaction).
 * Fire-and-forget — errors are swallowed to avoid impacting UX.
 */
export async function trackConversionEvent(
  source: ConversionSource,
  eventType: ConversionEventType = "click",
  metadata: Record<string, unknown> = {}
): Promise<void> {
  // Suppress all subscription analytics inside the native APK.
  if (!isPaymentUIEnabled()) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("conversion_events").insert({
      user_id: user?.id ?? null,
      source,
      event_type: eventType,
      metadata: metadata as never,
    });
  } catch (err) {
    // Silent fail — analytics must never break the user flow
    if (import.meta.env.DEV) console.warn("[conversion] tracking failed", err);
  }
}

/** Shortcut for the most common case: a click on a "subscribe" link from a touchpoint. */
export function trackSubscriptionClick(
  source: ConversionSource,
  metadata?: Record<string, unknown>
): void {
  void trackConversionEvent(source, "click", metadata);
}
