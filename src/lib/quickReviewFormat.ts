/**
 * UI-only helpers for Quick Review.
 * Pure presentational logic — never mutates stored data.
 */

/**
 * Split a summary string into visual chunks for scannable rendering.
 * Strategy:
 *   1. Prefer existing paragraph breaks (\n\n)
 *   2. Otherwise, group sentences (. ! ? ؟ ! .) so each chunk ≈ 1–3 sentences
 *   3. Single short string → one chunk
 *
 * The original text is preserved verbatim across all chunks combined.
 */
export function chunkSummary(raw: string): string[] {
  const text = (raw ?? "").trim();
  if (!text) return [];

  // 1) Honor explicit paragraph breaks if present
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length > 1) return paragraphs;

  // 2) Short text → no chunking needed
  if (text.length <= 220) return [text];

  // 3) Sentence-based grouping (Arabic + Latin terminators)
  const parts = text
    .split(/(?<=[.!?؟])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length <= 1) return [text];

  const chunks: string[] = [];
  let buf = "";
  const TARGET = 200;

  for (const p of parts) {
    if (!buf) {
      buf = p;
    } else if ((buf + " " + p).length <= TARGET) {
      buf = buf + " " + p;
    } else {
      chunks.push(buf);
      buf = p;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

/**
 * Estimate read time in minutes from text length.
 * Arabic average: ~180 words/min; ~5 chars/word.
 */
export function estimateReadMinutes(text: string): number {
  const chars = (text ?? "").trim().length;
  if (!chars) return 0;
  const words = chars / 5;
  return Math.max(1, Math.round(words / 180));
}
