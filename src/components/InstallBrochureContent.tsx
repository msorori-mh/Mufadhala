import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { INSTALL_COPY } from "@/constants/installCopy";

/**
 * Shared printable brochure block.
 *
 * Single source of truth for both:
 *  1) The on-page features card on /install (interactive)
 *  2) The downloaded A4 / A5 PDF brochure (snapshot)
 *
 * Pass `printMode` for the standalone PDF layout (header + features + QR + CTA + footer).
 * Without `printMode`, only the features card is rendered (page-embedded use).
 *
 * Why: previously the PDF used a hand-coded HTML template that drifted from the
 * page. Sharing this component guarantees pixel-equivalent output forever.
 */

const SMART_FEATURES = [
  { emoji: "⏱️", label: "محاكي واقعي للاختبارات", sub: "كأنك في قاعة الاختبار" },
  { emoji: "✨", label: "مولد الأسئلة الذكي", sub: "الأكثر تكراراً والمتوقعة" },
  { emoji: "🤖", label: "مساعد مُفَاضَلَة الذكي", sub: "استفسر عن أي شيء فوراً" },
  { emoji: "🧠", label: "تلخيص ذكي للدروس", sub: "ملخصات ذكية شاملة" },
];

const STANDARD_FEATURES = [
  { emoji: "⚡", label: "وضع المراجعة السريعة", sub: "مثالي لليلة الاختبار" },
  { emoji: "📚", label: "أكثر من 5000 سؤال", sub: "مراجع ومعتمد" },
];

interface InstallBrochureContentProps {
  /** When true → standalone PDF layout (header + features + QR + CTA). When false → only features card for embedding in /install. */
  printMode?: boolean;
  /** Paper size — only relevant in printMode (controls compactness of standard tier). */
  pageSize?: "A4" | "A5";
  /** QR code as data URL (PNG). Required in printMode. */
  qrDataUrl?: string;
}

export function InstallBrochureFeatures() {
  return (
    <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-primary/20 ring-1 ring-primary/10 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <CardContent className="p-3 space-y-2.5">
        <div className="text-center space-y-0.5">
          <h3 className="text-sm font-extrabold text-foreground inline-flex items-center gap-1.5">
            <span className="inline-block">✨</span>
            ما الذي يميّز مُفَاضَلَة؟
          </h3>
          <p className="text-[10px] text-muted-foreground leading-tight">
            كل ما تحتاجه للنجاح في اختبار القبول، في مكان واحد
          </p>
        </div>

        {/* HERO feature */}
        <div className="relative flex items-center gap-3 rounded-xl p-2.5 bg-gradient-to-l from-primary/15 to-accent/15 border border-primary/30 shadow-sm overflow-hidden">
          <div className="absolute -left-3 -top-3 w-12 h-12 rounded-full bg-primary/10 blur-xl" />
          <span className="text-2xl shrink-0 relative">📝</span>
          <div className="min-w-0 flex-1 relative">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-xs font-bold text-primary leading-tight">
                التدرب على نماذج الاختبارات السابقة
              </p>
            </div>
            <p className="text-[10px] text-foreground/70 leading-tight mt-0.5">
              بوضعين مختلفين: تدريب وصارم
            </p>
          </div>
        </div>

        {/* SMART 2x2 */}
        <div className="grid grid-cols-2 gap-2">
          {SMART_FEATURES.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg p-1.5 bg-accent/10 border border-accent/30"
            >
              <span className="text-base shrink-0">{f.emoji}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-tight text-accent">{f.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* STANDARD */}
        <div className="grid grid-cols-2 gap-2">
          {STANDARD_FEATURES.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg p-1.5">
              <span className="text-base shrink-0">{f.emoji}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-tight text-foreground">{f.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Brand header used at the top of the brochure (also reused on /install). */
export function InstallBrochureHeader() {
  return (
    <header className="flex items-center justify-center gap-2.5">
      <img
        src="/logo-original.png"
        alt="شعار مُفَاضَلَة"
        className="w-10 h-10 rounded-lg shadow-sm ring-1 ring-primary/20"
        loading="eager"
      />
      <div className="text-center">
        <h1 className="text-lg font-extrabold text-primary leading-tight tracking-tight">
          مُفَاضَلَة <span className="text-foreground/60 font-bold">|</span> Mufadhala
        </h1>
        <p className="text-[10px] text-muted-foreground leading-tight">
          منصتك الذكية لاختبارات القبول
        </p>
      </div>
    </header>
  );
}

/**
 * Full standalone brochure (used ONLY for the PDF snapshot).
 * Layout matches the on-page experience but adds the QR + CTA + footer in place
 * of the interactive install buttons.
 */
export default function InstallBrochureContent({
  printMode,
  pageSize = "A4",
  qrDataUrl,
}: InstallBrochureContentProps) {
  if (!printMode) {
    return <InstallBrochureFeatures />;
  }

  // Print-only standalone layout — must look like the page preview.
  // We use the SAME tokens (primary, accent, muted, etc.) so html2canvas captures
  // identical colors / typography.
  return (
    <div
      dir="rtl"
      data-brochure-root
      className="bg-background text-foreground font-sans flex flex-col"
      style={{
        width: pageSize === "A4" ? 794 : 559,
        height: pageSize === "A4" ? 1123 : 794,
        padding: pageSize === "A4" ? 28 : 20,
        gap: pageSize === "A4" ? 14 : 10,
        fontFamily: "'Cairo', system-ui, sans-serif",
      }}
    >
      <InstallBrochureHeader />

      <InstallBrochureFeatures />

      {/* QR + CTA block */}
      <div
        data-brochure-qr-block
        className="flex flex-col items-center gap-2 mt-auto rounded-2xl border border-primary/20 bg-card p-4 shadow-sm"
      >
        {qrDataUrl && (
          <div className="bg-white p-3 rounded-xl ring-1 ring-border">
            <img
              src={qrDataUrl}
              alt="QR"
              style={{ width: pageSize === "A4" ? 200 : 170, height: pageSize === "A4" ? 200 : 170, display: "block" }}
            />
          </div>
        )}
        <p className="text-sm font-bold text-foreground text-center">
          امسح الكود لفتح المنصة مباشرة
        </p>

        {/* Website badge — pill */}
        <div
          dir="ltr"
          className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-1.5 shadow"
        >
          <span className="text-xs">🌐</span>
          <span className="text-xs font-extrabold tracking-wide" style={{ fontFamily: "'Courier New', monospace" }}>
            mufadhala.com/install
          </span>
        </div>

        <p className="text-[11px] text-muted-foreground text-center leading-relaxed max-w-md">
          {INSTALL_COPY.android.full}
        </p>
      </div>

      {/* CTA */}
      <div
        data-brochure-cta
        className="rounded-2xl bg-gradient-to-l from-primary to-accent px-5 py-3 text-center shadow-lg"
      >
        <p className="text-base font-extrabold text-primary-foreground leading-snug">
          🚀 ابدأ التدريب الآن ونافس على مقعدك الجامعي
        </p>
      </div>

      <p className="text-[10px] text-muted-foreground text-center font-semibold">
        © {new Date().getFullYear()} مُفَاضَلَة • منصتك للتحضير لاختبارات القبول الجامعي
      </p>
    </div>
  );
}
