
## Goal
Force the brochure PDF to fit in **one A4 page** instead of overflowing to a second page.

## Why it's printing on 2 pages
In `generateBrochurePDF.ts`, `html2canvas` captures the off-screen container at `794×1123 px` (A4 @ 96dpi). But the React component `InstallBrochureContent` content is **taller than 1123px** because:
- Header + features card + QR block + CTA + footer stack vertically with `gap: 14px` and `padding: 28px`
- The features card alone (hero + 2x2 smart + 2x1 standard) is ~480px tall
- The QR block with 200px QR + label + badge + paragraph is ~340px tall
- Total content ≈ 1200–1300px → overflows the captured area, jsPDF then splits it

Currently we capture only the first 1123px (`height: profile.canvas.h`), but if any element extends below that, the rendered canvas may still be taller and `pdf.addImage` with mismatched dimensions can cause a second auto-page.

## Fix (single file: `src/components/InstallBrochureContent.tsx` + tiny tweak in `generateBrochurePDF.ts`)

### 1. Compact the print-mode layout so it fits in 1123px
In `InstallBrochureContent.tsx` (printMode A4 branch only):
- Reduce outer `padding`: `28 → 18`
- Reduce outer `gap`: `14 → 8`
- Shrink QR image: `200×200 → 150×150`
- Reduce QR block `padding`: `p-4 → p-3`, inner white box `p-3 → p-2`
- Reduce CTA `py-3 → py-2`, font `text-base → text-sm`
- Reduce footer text margin
- Tighten the features `CardContent` paddings only when in printMode (pass a `compact` flag, or add a print-only wrapper class)

### 2. Guarantee single-page in `generateBrochurePDF.ts`
- Set the host container `overflow: "hidden"` so anything beyond 1123px is clipped (safety net)
- When calling `pdf.addImage`, keep current `0,0,210,297` mapping — already correct for single page
- Remove any chance of jsPDF auto-paging: we only call `addImage` once, so no second page is added by the library — the visual "page 2" the user sees is actually the captured canvas being taller than A4 and getting compressed/cropped weirdly. Clipping at 1123px solves it.

### 3. A5 stays unchanged
A5 (559×794) already fits — no edits needed.

## Files to Edit
- `src/components/InstallBrochureContent.tsx` — compact print-mode spacing + smaller QR
- `src/lib/generateBrochurePDF.ts` — add `overflow: hidden` to host container

## Visual outcome
Single A4 page with: header → features card → QR block → CTA → footer, all comfortably fitting with balanced spacing.
