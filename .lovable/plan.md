
## Goal
Update the **`/install` page** (NOT the brochure PDF) to:
1. Replace the current minimal "Platform Features" card with the **same elegant features grid** that appears in the app's Dashboard (the one shown in the user's screenshot).
2. **Reorder the page sections** so features appear first.

## Current State
File: `src/pages/Install.tsx`

Current order:
1. QR card
2. Install action button + brochure download buttons
3. Install instructions (Android/iPhone steps)
4. **Generic features card** (Training / AI — text-only bullets)
5. Share with friends

## New Order (per user request)

1. **✨ Features card** — matches the screenshot exactly (7 items in 2-column grid)
2. **QR card** — unchanged
3. **Install action button** ("افتح الصفحة وثبّت التطبيق") + brochure download buttons
4. **Install instructions** — Android / iPhone steps (unchanged)
5. **Share with friends** — unchanged

## The Features Card (Section 1)

Reuse the **exact same component pattern** from `Dashboard.tsx` (lines 414–447) so the design is consistent across the app:

- Title: `✨ ما الذي يميّز مُفَاضَلَة؟`
- 2-column grid of 7 cards
- First 4 items (smart features) get the **accent-tinted style** (border + hover highlight)
- Last 3 items get the plain hover style

Items (exactly as in screenshot):
| # | Emoji | Label | Sub |
|---|---|---|---|
| 1 | 🤖 | مساعد مفاضلة الذكي | يجيب عن أي سؤال فوراً |
| 2 | ✨ | مولد الأسئلة الذكي | أسئلة مخصصة لنقاط ضعفك |
| 3 | 📝 | نماذج اختبارات سابقة | مع إجابات نموذجية |
| 4 | ⏱️ | محاكاة واقعية | لبيئة الاختبار الفعلية |
| 5 | 📚 | 5000+ سؤال تدريبي | مراجع ومعتمد |
| 6 | 🧠 | شرح علمي مفصّل | لكل إجابة |
| 7 | 📶 | يعمل أوفلاين | بدون إنترنت |

## Implementation Steps

Single file edit: `src/pages/Install.tsx`

1. **Add the new Features card** (copy the exact styling/JSX pattern from `Dashboard.tsx` lines 414–447) at the **top** of the page (right after the opening container, before the QR card).
2. **Remove** the old generic "Platform Features" card (current lines 305–325 — the Training/AI bullet list).
3. **Reorder** the remaining JSX so the final order is:
   - Features card → QR card → Install action → Install instructions → Share section → Footer.
4. Keep all logic untouched: QR generation, brochure downloads, share tracking, Android-Chrome detection, `INSTALL_COPY`, share counter, etc.

## What Stays Untouched
- The brochure PDF (`generateBrochurePDF.ts`) — no changes
- All existing handlers (`downloadQR`, `downloadBrochure`, `shareNative`, `shareWhatsApp`, `shareTelegram`, `trackShare`)
- Android non-Chrome warning block
- Footer + safe-area padding

## Files to Edit
- `src/pages/Install.tsx` (only)
