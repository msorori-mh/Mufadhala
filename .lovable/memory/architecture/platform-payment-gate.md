---
name: Platform-Aware Payment Gate
description: Strategy for hiding all payment/subscription UI in native APK while keeping web flow intact
type: feature
---

# Platform-Aware Payment Separation (Web vs APK)

## Strategy
Single codebase with platform-aware payment UI gating. Web build keeps the full subscription system; native APK (Google Play target) shows zero payment signals.

## Single Source of Truth
**`src/lib/platformGate.ts`** exports:
- `isPaymentUIEnabled()` → true on web, false in Capacitor native
- `isPaymentUIHidden()` → inverse
- `safeTrackSubscriptionClick(fn)` → swallows analytics in APK
- `safeSubscriptionNavigate(navigate, fallback)` → routes to /dashboard in APK

Built on top of existing `isNativePlatform()` from `@/lib/capacitor`.

## APK Behavior Rules
1. **Locked content**: show neutral message ("هذه الميزة غير متاحة في هذه النسخة"), no upsell, no price.
2. **Limit reached** (AI generator, simulator, chat): neutral wording only — no "اشترك الآن".
3. **`/subscription` route**: redirects to `/dashboard` via `useEffect` guard inside `Subscription.tsx`.
4. **Conversion analytics**: `trackConversionEvent` short-circuits when `!isPaymentUIEnabled()`.
5. **ChatWidget**: already gated at App.tsx level (`{!isNative && <ChatWidget />}`).

## Touchpoints Modified
- `src/lib/platformGate.ts` — new helper
- `src/lib/conversionTracking.ts` — gate analytics
- `src/pages/Subscription.tsx` — useEffect redirect guard
- `src/pages/PastExamPractice.tsx` — neutral locked message
- `src/pages/PastExams.tsx` — locked card click is no-op in APK
- `src/pages/ExamSimulator.tsx` — usage banner hidden
- `src/components/FreeLimitMessage.tsx` — neutral copy + back button
- `src/components/PostExamUpgrade.tsx` — returns null in APK
- `src/components/AIPracticeQuestions.tsx` — hides "اشترك الآن" CTA
- `src/components/AIPerformanceAnalysis.tsx` — hides entire card for non-paid users in APK
- `src/components/ChatWidget.tsx` — hides upsell links (widget itself already hidden in APK)
- `src/components/PastExamModeMiniStats.tsx` — neutral copy when free attempt used

## Backend Untouched
All subscription tables, edge functions, RLS, and payment_requests remain active. Backend is identical for both platforms; only the client UI layer is gated.

## Why
Google Play policy compliance + dual-track distribution (Web = monetised, APK = free distribution).
