---
name: Conversion Funnel Tracking
description: Subscription click tracking system with 7 approved touchpoints, conversion_events table, and admin /admin/conversion-funnel report
type: feature
---
## Conversion Funnel System

### Approved sources (sync with DB validation trigger `validate_conversion_event`)
1. `exam_simulator` — محاكي الاختبارات
2. `ai_generator` — مولد الأسئلة (مفاضل)
3. `past_exams` — النماذج السابقة
4. `ai_performance` — تحليل الأداء بالذكاء الاصطناعي
5. `chat_widget` — المساعد الذكي
6. `install_share` — مشاركة التطبيق (من /install)
7. `brochure_download` — تنزيل البروشور PDF (من /install)

### Architecture
- **Table**: `public.conversion_events` (user_id nullable, source, event_type 'view'|'click', metadata jsonb)
- **Validation trigger**: `validate_conversion_event()` enforces source + event_type whitelist
- **RLS**: authenticated users INSERT own events (user_id null allowed for anonymous); admins SELECT all
- **Aggregation**: SECURITY DEFINER function `get_conversion_funnel_stats(_days)` joins with `subscriptions` for conversion counts
- **Note**: `brochure_download` and `install_share` are usually anonymous (public /install page) → they appear in clicks column but rarely produce "conversions" since there's no user_id to join against subscriptions

### Tracking entry point
- File: `src/lib/conversionTracking.ts` — `trackSubscriptionClick(source, metadata?)` for paywall touchpoints
- `Install.tsx` writes `install_share` and `brochure_download` directly via supabase client (anonymous-friendly)

### Admin report
- Route: `/admin/conversion-funnel`
- Permission gate: `reports`
- Sidebar: under التقارير (icon: Target)
- Filter: 7/30/90 days
- All 7 sources rendered even if zero events
