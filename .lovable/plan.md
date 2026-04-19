
## Goal
Make the downloaded A4 brochure look **exactly** like the `/install` page preview (same Arabic typography, same compact card layout, same hero feature, same colors).

## Why the current PDF looks different
The current implementation in `src/lib/generateBrochurePDF.ts` builds the PDF with **jsPDF + html2canvas**, but it uses a **completely separate HTML template** (`buildA4Stacked()`) that was hand-written months ago. It does NOT mirror the React JSX in `Install.tsx`. So whenever we update the page, the brochure drifts:
- Different feature wording
- Different card grid (no hero card, no "الأكثر طلباً" badge)
- Different header (no logo + bilingual title block)
- Different fonts/spacing
- Missing the new 8th AI feature visual treatment matching the page

## Two possible approaches

### Approach A — **Snapshot the live page (recommended)**
Render the actual `/install` page content into an off-screen container, then capture it with `html2canvas` → embed in PDF. The PDF becomes a true 1:1 visual copy of what the user sees.

- Pros: zero drift forever — page = brochure automatically.
- Cons: requires extracting the printable section into a reusable component.

### Approach B — **Rewrite the PDF HTML template to match**
Rewrite `buildA4Stacked()` so its HTML/CSS mirrors the new Install page (header, hero card, smart 2x2 grid, standard grid, 8 features, badges).

- Pros: keeps current architecture, full control over print-only tweaks.
- Cons: still two sources of truth → will drift again next time the page changes.

## Recommended plan — **Approach A**

### Steps
1. **Extract a printable component** `InstallBrochureContent.tsx` containing exactly the visual blocks the user wants in the brochure:
   - Brand header (logo + "مُفَاضَلَة | Mufadhala" + tagline)
   - Features card (hero + smart 2x2 + standard 2x1 — all 8 items)
   - QR + website badge + CTA
   - Footer line
2. **Use it in `Install.tsx`** in place of the current inline blocks (so the page and brochure share the same JSX).
3. **Rewrite `generateBrochurePDF.ts`**:
   - Mount `<InstallBrochureContent printMode pageSize="A4" qrDataUrl={...} />` into a hidden `<div>` sized to **794×1123 px** (A4 @ 96dpi).
   - Wait for fonts (`document.fonts.ready`) and the logo image to load.
   - Capture with `html2canvas({ scale: 2, useCORS: true, backgroundColor: '#ffffff' })`.
   - Add the resulting PNG to a jsPDF A4 page.
   - Re-attach the clickable `pdf.link()` over the QR + CTA regions (compute coordinates from the rendered DOM via `getBoundingClientRect`).
4. **A5 brochure**: same component, mounted at **559×794 px** with a `pageSize="A5"` prop that hides the standard-tier row to keep it short.
5. **Arabic font fidelity**: ensure Cairo is loaded before capture (already self-hosted in the app — just `await document.fonts.load('700 16px Cairo')`).

### What stays untouched
- `Install.tsx` page logic (QR generation, share, Android-Chrome detection, INSTALL_COPY)
- A5 / A4 download buttons and handlers
- Brochure file name + share counter

### Files to edit
- **New**: `src/components/InstallBrochureContent.tsx` (shared printable block)
- **Edit**: `src/pages/Install.tsx` (use the new component for the on-page features + header)
- **Rewrite**: `src/lib/generateBrochurePDF.ts` (snapshot-based generation)

### Visual outcome
The downloaded A4 PDF will be pixel-identical to the `/install` preview: same header, same hero card with the "الأكثر طلباً" badge, same 2x2 smart grid (8 features including the new AI one), same QR block, same Cairo Arabic typography.
