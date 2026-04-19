
## Goal
Redesign the "ما الذي يميّز مُفَاضَلَة؟" features card on `/install` with new content (7 items, new order, new wording) and a more attention-grabbing visual hook.

## New Features (exact order & wording)

| # | Emoji | Label | Sub | Style tier |
|---|---|---|---|---|
| 1 | 📝 | التدرب على نماذج الاختبارات السابقة | بوضعين: تدريب وصارم | **Hero (full width)** |
| 2 | ⏱️ | محاكي واقعي للاختبارات | كأنك في قاعة الاختبار | Smart |
| 3 | ✨ | مولد الأسئلة الذكي | الأكثر تكراراً والمتوقعة | Smart |
| 4 | 🤖 | مساعد مُفَاضَلَة الذكي | استفسر عن أي شيء فوراً | Smart |
| 5 | 🧠 | تلخيص ذكي للدروس | ملخصات فورية بالذكاء الاصطناعي | Smart |
| 6 | ⚡ | وضع المراجعة السريعة | مثالي لليلة الاختبار | Standard |
| 7 | 📚 | أكثر من 5000 سؤال تدريبي | مراجع ومعتمد | Standard |

## Visual Hook (the "wow")

To give the card more presence and convert better:

1. **Hero feature on top (full-width)** — Item #1 (نماذج الاختبارات السابقة) gets a prominent full-width card with bigger emoji, gradient background (`from-primary/15 to-accent/15`), a small "الأكثر طلباً" badge, and tighter contrast. This is the platform's killer feature.
2. **Smart features (items 2–5)** — 2-column grid with accent-tinted cards (existing style, slightly enhanced with subtle gradient + shadow on hover).
3. **Standard features (items 6–7)** — 2-column grid with neutral hover cards.
4. **Card header** — Add a small animated sparkle accent next to "✨ ما الذي يميّز مُفَاضَلَة؟" and a one-line tagline below it: "كل ما تحتاجه للنجاح في اختبار القبول، في مكان واحد".
5. **Subtle visual cues** — Use `ring-1 ring-primary/10` on the outer card, gradient header strip, and slightly increased padding for readability without breaking compactness.

```text
┌──────────────────────────────────────────┐
│ ✨ ما الذي يميّز مُفَاضَلَة؟              │
│ كل ما تحتاجه للنجاح في اختبار القبول     │
├──────────────────────────────────────────┤
│ ┌──────────────────────────────────────┐ │
│ │ 📝  نماذج الاختبارات السابقة  [الأكثر│ │  ← Hero (full width)
│ │     بوضعين: تدريب وصارم       طلباً] │ │
│ └──────────────────────────────────────┘ │
│ ┌────────────┐ ┌────────────┐            │
│ │ ⏱️ محاكي   │ │ ✨ مولد    │            │  ← Smart row 1
│ └────────────┘ └────────────┘            │
│ ┌────────────┐ ┌────────────┐            │
│ │ 🤖 مساعد   │ │ 🧠 تلخيص   │            │  ← Smart row 2
│ └────────────┘ └────────────┘            │
│ ┌────────────┐ ┌────────────┐            │
│ │ ⚡ مراجعة  │ │ 📚 5000+   │            │  ← Standard
│ └────────────┘ └────────────┘            │
└──────────────────────────────────────────┘
```

## Implementation Steps

Single file edit: `src/pages/Install.tsx`

1. Replace the existing features array + JSX block (the `<Card className="bg-primary/5 border-primary/20">` section) with the new 3-tier layout (hero + smart + standard).
2. Add the small tagline under the title.
3. Keep all other sections (QR, install action, instructions, share) untouched.
4. Maintain compactness — hero card stays small (~64px tall), grid cards remain at current density.

## Files to Edit
- `src/pages/Install.tsx` (only)
