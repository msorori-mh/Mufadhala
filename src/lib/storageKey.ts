/**
 * Sanitize a file extension to ASCII-only lowercase (Supabase Storage rejects non-ASCII keys).
 * Falls back to "bin" if the extension is missing or invalid.
 */
export function safeFileExtension(fileName: string, fallback = "bin"): string {
  const raw = (fileName.split(".").pop() || "").toLowerCase();
  const cleaned = raw.replace(/[^a-z0-9]/g, "");
  return cleaned || fallback;
}

/**
 * Build an ASCII-safe storage key. Original (possibly Arabic) name is NEVER used in the key.
 * Use file.name only for display in the UI / DB metadata.
 */
export function buildSafeStorageKey(
  fileName: string,
  opts: { prefix?: string; fallbackExt?: string } = {}
): string {
  const ext = safeFileExtension(fileName, opts.fallbackExt);
  const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return opts.prefix ? `${opts.prefix}/${id}.${ext}` : `${id}.${ext}`;
}
