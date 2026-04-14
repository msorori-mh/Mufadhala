/**
 * Lightweight funnel event tracking using localStorage.
 * Events are stored locally and can be sent to analytics later.
 */

export type FunnelEvent =
  | "user_registered"
  | "first_lesson_opened"
  | "lesson_completed"
  | "exam_started"
  | "exam_completed"
  | "paywall_viewed"
  | "subscribe_clicked"
  | "engagement_modal_shown"
  | "engagement_modal_clicked"
  | "paywall_cta_clicked"
  | "subscription_page_opened_from_paywall";

interface TrackedEvent {
  event: FunnelEvent;
  timestamp: string;
  meta?: Record<string, string | number>;
}

const STORAGE_KEY = "funnel_events";

export function trackFunnelEvent(event: FunnelEvent, meta?: Record<string, string | number>) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as TrackedEvent[];
    existing.push({ event, timestamp: new Date().toISOString(), meta });
    // Keep last 200 events max
    if (existing.length > 200) existing.splice(0, existing.length - 200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // Silent fail
  }
}

export function getFunnelEvents(): TrackedEvent[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function hasTrackedEvent(event: FunnelEvent): boolean {
  return getFunnelEvents().some((e) => e.event === event);
}
