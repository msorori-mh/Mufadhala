
## Goal
Add a new "Features" panel on the **right side** of the Arabic A4 brochure showing 7 platform features as elegant cards, matching the app's visual style.

## Current State
- File: `src/lib/generateBrochurePDF.ts`
- Currently uses a single-column vertical layout with 3 generic features
- Generates A4 (full) and A5 (mini) versions
- RTL Arabic, brand colors `#1A237E` / `#2E7D32`

## Proposed Design

Convert the A4 brochure into a **two-column layout** (RTL):
- **Right column (≈55%)**: New "Features" panel — 7 elegant cards
- **Left column (≈45%)**: Existing hero content (logo, headline, value, QR, install hint, CTA)

A5 stays single-column (too small for 7 cards) — keeps current 3-feature summary.

### The 7 feature cards (right column)
Each card: small icon box + bold title (one line) + subtle accent border on the right (RTL accent).

| # | Icon | Title |
|---|------|-------|
| 1 | 📚 | شرح أكاديمي مرجعي لمحتوى الدروس |
| 2 | ✨ | ملخصات ذكية للدروس |
| 3 | 📝 | التدرب على نماذج الاختبارات السابقة (مبتدئ + صارم) |
| 4 | 🎯 | محاكي الاختبار الحقيقي |
| 5 | 🤖 | مولد الأسئلة الذكي (الأكثر تكراراً + المتوقعة) |
| 6 | 🌙 | مراجعة ذكية سريعة ليلة الاختبار |
| 7 | 💬 | مساعد مُفَاضَلَة الذكي للاستفسار |

### Visual Style
- Card bg: `#f8fafc` (matches app surface)
- Right border accent: 4px solid `#2E7D32` (RTL = visual leading edge)
- Icon chip: white rounded square with soft shadow
- Title: 13–14px, weight 700, color `#1e293b`
- Section header above cards: "✨ ماذا تقدم لك مُفَاضَلَة؟" in primary blue
- Compact spacing (7 cards must fit alongside QR)

### Layout Sketch (A4)
```text
┌──────────────────────────────────────────┐
│  ▔▔ accent gradient bar ▔▔               │
│  ┌────────── header (logo + brand) ──┐   │
│                                          │
│  ┌────── RIGHT ─────┐ ┌── LEFT ──────┐  │
│  │ ✨ ماذا تقدم...  │ │  Headline    │  │
│  │ [📚] درس مرجعي   │ │  Value line  │  │
│  │ [✨] ملخصات      │ │              │  │
│  │ [📝] نماذج سابقة │ │   ┌──────┐   │  │
│  │ [🎯] محاكي       │ │   │  QR  │   │  │
│  │ [🤖] مولد أسئلة  │ │   └──────┘   │  │
│  │ [🌙] مراجعة ليلة │ │  install hint│  │
│  │ [💬] مساعد ذكي   │ │              │  │
│  └──────────────────┘ └──────────────┘  │
│  ┌────────── final CTA bar ─────────┐   │
│  ▁▁ accent gradient bar ▁▁              │
└──────────────────────────────────────────┘
```

## Implementation Steps

1. **Edit `src/lib/generateBrochurePDF.ts`** only.
2. Add new feature list constant `BROCHURE_FEATURES` (icon + title pairs above).
3. Refactor `buildBrochureHTML` for the **A4 path**:
   - After header, render a flex row with two columns.
   - Right column: section title + 7 compact feature cards (using a new `compactFeatureRow` helper).
   - Left column: existing headline → value → QR block → install hint.
   - Footer + CTA stay full-width below.
4. Reduce font sizes slightly (headline 26px, value 14px) so the 2-column layout breathes.
5. Adjust the clickable QR/CTA `pdf.link()` coordinates for the A4 layout (QR moves to left column, CTA stays full-width bottom).
6. **A5 path stays unchanged** (single column, 3 feature summary) — too small for 7 cards.

## What Stays Untouched
- QR generation, `INSTALL_URL`, `INSTALL_COPY`
- Brand colors, fonts, A5 layout
- `Install.tsx` UI (download buttons unchanged)
- All other files

## Files to Edit
- `src/lib/generateBrochurePDF.ts` (single file)
