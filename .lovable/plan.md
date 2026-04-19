
## Goal
1. Improve the **A4 brochure PDF** (`generateBrochurePDF.ts`) — compact the content, tighten cards, better use of empty space.
2. Add a **new 8th feature** to the brochure: "استخدام ذكي لميزات الذكاء الاصطناعي التوليدي في المساعدة على اجتياز اختبار المفاضلة".

## Current State
- File: `src/lib/generateBrochurePDF.ts`
- A4 brochure currently has **7 features** in a 2-column grid at the top (compact cards), then headline + QR + CTA below.
- Issue: cards have noticeable empty space, and adding an 8th item without compaction will overflow the page.

## Plan

### 1. Add the new feature (becomes #8)
Update `BROCHURE_FEATURES` array — append:
```ts
{ icon: "🧠", title: "استخدام ذكي لميزات الذكاء الاصطناعي التوليدي للمساعدة في اجتياز اختبار المفاضلة" }
```
Result: **8 features** → perfect 4×2 grid (no orphan card).

### 2. Compact the feature cards (A4)
In `compactFeatureCard()`:
- Reduce icon box: `30px → 26px`, font `16px → 14px`
- Reduce card padding: `8px 11px → 6px 9px`
- Reduce min-height: `44px → 38px`
- Reduce gap between icon and text: `9px → 7px`
- Slightly tighter line-height for label: `1.35 → 1.25`
- Font size stays at `11.5px` (still readable)

### 3. Tighten the features section header (A4)
In `buildA4Stacked()`:
- Section header bottom margin: `10px → 6px`
- Section margin-bottom: `18px → 12px`
- Grid gap: `8px → 6px`

### 4. Reclaim freed space for the middle section
- Headline margin: `0 0 6px → 0 0 4px`
- Subtitle margin: `0 0 12px → 0 0 8px`
- QR padding box & website badge stay the same (already optimal)
- Add a subtle accent stripe behind the QR area to visually fill empty space

### 5. Update PDF clickable link coordinates
QR moves slightly (the features section is now shorter). Recalculate `pdf.link()` for QR region (~y=170mm instead of ~180mm).

### 6. A5 stays unchanged
The A5 layout uses a different code path (`buildA5SingleColumn` with only 3 summary features). It already fits perfectly — no changes there.

## What Stays Untouched
- A5 brochure layout
- QR generation (`generateBrandedQR`)
- Header (logo + brand name)
- CTA button + footer
- All `pdf.link()` regions for the CTA

## Files to Edit
- `src/lib/generateBrochurePDF.ts` (only)
