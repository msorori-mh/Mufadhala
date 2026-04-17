/**
 * Centralized file upload sanitization & validation.
 * - ASCII-safe storage keys (Supabase Storage rejects non-ASCII keys)
 * - Pre-upload size & MIME validation with unified Arabic error messages
 */

export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/** Allowed MIME types per category. */
export const MIME_GROUPS = {
  image: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  pdf: ["application/pdf"],
  pptx: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
  ],
} as const;

export type FileKind = keyof typeof MIME_GROUPS;

/** Common preset combinations. */
export const FILE_PRESETS = {
  receipt: ["image", "pdf"] as FileKind[],            // payment receipt
  paymentLogo: ["image"] as FileKind[],               // bank/wallet logo
  paymentBarcode: ["image"] as FileKind[],            // barcode image
  guide: ["pdf", "image"] as FileKind[],              // university guide
  presentation: ["pptx"] as FileKind[],               // lesson PPTX
} as const;

/**
 * Sanitize a file extension to ASCII-only lowercase.
 * Falls back to "bin" if the extension is missing or invalid.
 */
export function safeFileExtension(fileName: string, fallback = "bin"): string {
  const raw = (fileName.split(".").pop() || "").toLowerCase();
  const cleaned = raw.replace(/[^a-z0-9]/g, "");
  return cleaned || fallback;
}

/**
 * Build an ASCII-safe storage key. Original (possibly Arabic) name is NEVER used in the key.
 */
export function buildSafeStorageKey(
  fileName: string,
  opts: { prefix?: string; fallbackExt?: string } = {}
): string {
  const ext = safeFileExtension(fileName, opts.fallbackExt);
  const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return opts.prefix ? `${opts.prefix}/${id}.${ext}` : `${id}.${ext}`;
}

function kindsLabel(kinds: FileKind[]): string {
  const map: Record<FileKind, string> = { image: "JPG/PNG", pdf: "PDF", pptx: "PPTX" };
  return kinds.map(k => map[k]).join(" أو ");
}

function allowedMimes(kinds: FileKind[]): string[] {
  return kinds.flatMap(k => [...MIME_GROUPS[k]]);
}

function extensionMatchesKinds(fileName: string, kinds: FileKind[]): boolean {
  const ext = safeFileExtension(fileName);
  const extMap: Record<FileKind, string[]> = {
    image: ["jpg", "jpeg", "png", "webp"],
    pdf: ["pdf"],
    pptx: ["pptx", "ppt"],
  };
  return kinds.some(k => extMap[k].includes(ext));
}

export interface ValidateResult {
  ok: boolean;
  error?: string;
}

/**
 * Validate a File before upload. Returns unified Arabic error messages.
 * @param file the File from <input type="file">
 * @param kinds allowed categories (use FILE_PRESETS for common cases)
 * @param opts.maxSizeBytes override default 5MB cap
 */
export function validateUploadFile(
  file: File,
  kinds: FileKind[],
  opts: { maxSizeBytes?: number } = {}
): ValidateResult {
  if (!file) return { ok: false, error: "لم يتم اختيار ملف." };

  const cap = opts.maxSizeBytes ?? MAX_FILE_SIZE_BYTES;
  if (file.size > cap) {
    const mb = (cap / 1024 / 1024).toFixed(0);
    return { ok: false, error: `حجم الملف يتجاوز الحد المسموح (${mb} ميجابايت).` };
  }
  if (file.size === 0) {
    return { ok: false, error: "الملف فارغ." };
  }

  const mimes = allowedMimes(kinds);
  // Some browsers report empty type for unknown files → fall back to extension check
  const mimeOk = file.type ? mimes.includes(file.type) : extensionMatchesKinds(file.name, kinds);
  const extOk = extensionMatchesKinds(file.name, kinds);

  if (!mimeOk && !extOk) {
    return { ok: false, error: `نوع الملف غير مدعوم. يُقبل فقط: ${kindsLabel(kinds)}.` };
  }

  return { ok: true };
}
