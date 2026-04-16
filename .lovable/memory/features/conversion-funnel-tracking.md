---
name: Conversion Funnel Tracking
description: Subscription click tracking system with 5 approved touchpoints, conversion_events table, and admin /admin/conversion-funnel report
type: feature
---
## Conversion Funnel System

### Approved sources (sync with DB validation trigger)
1. `exam_simulator` — محاكي الاختبارات
2. `ai_generator` — مولد الأسئلة (مفاضل)
3. `past_exams` — النماذج السابقة
4. `ai_performance` — تحليل الأداء بالذكاء الاصطناعي
5. `chat_widget` — المساعد الذكي

### Architecture
- **Table**: `public.conversion_events` (user_id nullable, source, event_type 'view'|'click', metadata jsonb)
- **Validation trigger**: `validate_conversion_event()` enforces source + event_type whitelist
- **RLS**: authenticated users INSERT own events; admins SELECT all
- **Aggregation**: SECURITY DEFINER function `get_conversion_funnel_stats(_days)` joins with `subscriptions` for conversion counts

### Tracking entry point (single source of truth)
- File: `src/lib/conversionTracking.ts`
- Use `trackSubscriptionClick(source, metadata?)` everywhere a `/subscription` navigation occurs from a paywall touchpoint
- Fire-and-forget; never throws to UI
- `FreeLimitMessage` accepts optional `source` prop and tracks on click

### Admin report
- Route: `/admin/conversion-funnel`
- Permission gate: `reports`
- Sidebar: under التقارير (icon: Target)
- Filter: 7/30/90 days
