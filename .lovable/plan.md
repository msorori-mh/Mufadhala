
## Goal
1. Update the 7 feature titles in the A4 brochure to use the **exact wording** the user provided originally.
2. Move the **Features panel to the TOP** of the brochure (right after the header) so it's the **first thing** the student reads.

## Current State
- File: `src/lib/generateBrochurePDF.ts`
- Features currently appear in the **right column** of a two-column middle section (alongside QR on the left).
- Some titles were paraphrased instead of matching the user's exact text.

## Issues to Fix

### 1. Restore exact feature wording
Current vs. required:

| # | Current (in code) | Required (user's exact text) |
|---|---|---|
| 1 | شرح أكاديمي مرجعي لمحتوى الدروس | شرح اكاديمي مراجع لمحتوى الدروس |
| 2 | ملخصات ذكية للدروس | ملخصات ذكية للدروس ✓ |
| 3 | نماذج الاختبارات السابقة (مبتدئ + صارم) | التدرب على جميع نماذج الاختبارات السابقة بوضعين (مبتدئي - صارم) |
| 4 | محاكي الاختبار الحقيقي | التدرب على محاكي الاختبار الحقيقي |
| 5 | مولد الأسئلة الذكي (الأكثر تكراراً + المتوقعة) | مولد الاسئلة الذكي للأسئلة الاكثر تكرارا في النماذج السابقة والأسئلة المتوقعة |
| 6 | مراجعة ذكية سريعة ليلة الاختبار | مراجعة ذكية سريعة ليلة الاختبار ✓ |
| 7 | مساعد مُفَاضَلَة الذكي للاستفسار | مساعد مفاضلة الذكي للاستفسار عن اي معلومة |

### 2. Reorder layout — Features go to the TOP

New A4 structure (top → bottom):
```text
┌─────────────────────────────────────┐
│  ▔▔ accent bar ▔▔                   │
│  Header (logo + brand name)         │
│  ─────────────────────────────────  │
│  ✨ ماذا تقدم لك مُفَاضَلَة؟        │  ← FIRST thing student reads
│  ┌─────────────┐ ┌─────────────┐    │
│  │ 📚 درس مرجع │ │ ✨ ملخصات   │    │  ← 7 feature cards in a
│  │ 📝 نماذج    │ │ 🎯 محاكي    │    │     compact 2-column grid
│  │ 🤖 مولد     │ │ 🌙 مراجعة   │    │     (saves vertical space)
│  │ 💬 مساعد    │ │             │    │
│  └─────────────┘ └─────────────┘    │
│  ─────────────────────────────────  │
│  Headline + value statement         │
│  ┌────────┐                          │
│  │   QR   │  دخول وتحميل التطبيق    │
│  └────────┘  🌐 mufadhala.com/...   │
│  install hint (Android line)        │
│  ─────────────────────────────────  │
│  🚀 CTA bar (full width)            │
│  ▁▁ accent bar ▁▁                   │
└─────────────────────────────────────┘
```

The 7 cards arrange in a **2-column grid** at the top (instead of vertical 7-row column on the right) so they fit horizontally without pushing QR/CTA off the page.

## Implementation
Single file edit: `src/lib/generateBrochurePDF.ts`

1. Update `BROCHURE_FEATURES` array with the exact user-provided titles.
2. Refactor `buildA4TwoColumn` → rename to `buildA4Stacked`:
   - **Top section**: Section header + 7 feature cards in a 2-col grid (`flex-wrap` with `flex: 0 0 calc(50% - gap)`).
   - **Middle section**: Headline + QR (centered, single column for the lower half).
3. Tune sizing so everything still fits on one A4 page (compact card padding, smaller QR ~170px, tighter gaps).
4. Update `pdf.link()` coordinates: QR moves to lower-middle of page (~y=170mm instead of y=100mm).
5. **A5 unchanged** (already minimal).

## Files to Edit
- `src/lib/generateBrochurePDF.ts` (only)
