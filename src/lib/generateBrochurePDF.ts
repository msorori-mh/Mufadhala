import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { INSTALL_COPY } from "@/constants/installCopy";

const BRAND_PRIMARY = "#1A237E";
const BRAND_SECONDARY = "#2E7D32";
const INSTALL_URL = "https://mufadhala.com/install";

/** The 7 platform features showcased in the A4 brochure right column. */
const BROCHURE_FEATURES: Array<{ icon: string; title: string }> = [
  { icon: "📚", title: "شرح أكاديمي مرجعي لمحتوى الدروس" },
  { icon: "✨", title: "ملخصات ذكية للدروس" },
  { icon: "📝", title: "نماذج الاختبارات السابقة (مبتدئ + صارم)" },
  { icon: "🎯", title: "محاكي الاختبار الحقيقي" },
  { icon: "🤖", title: "مولد الأسئلة الذكي (الأكثر تكراراً + المتوقعة)" },
  { icon: "🌙", title: "مراجعة ذكية سريعة ليلة الاختبار" },
  { icon: "💬", title: "مساعد مُفَاضَلَة الذكي للاستفسار" },
];

/**
 * Paper-size profiles. A4 is the full sheet; A5 is exactly half (148×210 mm).
 * Working canvas pixels @ ~96 DPI; html2canvas scale=2 keeps everything sharp.
 */
type PaperSize = "A4" | "A5";

interface PaperProfile {
  /** mm width × height (portrait) */
  pdf: { w: number; h: number };
  /** off-screen render canvas px */
  canvas: { w: number; h: number };
  /** scaling multiplier applied to all design tokens (font sizes, paddings, etc.) */
  scale: number;
  /** filename suffix */
  filename: string;
}

const PAPER: Record<PaperSize, PaperProfile> = {
  A4: { pdf: { w: 210, h: 297 }, canvas: { w: 794, h: 1123 }, scale: 1, filename: "mufadhala-brochure-A4.pdf" },
  A5: { pdf: { w: 148, h: 210 }, canvas: { w: 559, h: 794 }, scale: 0.7, filename: "mufadhala-brochure-A5.pdf" },
};

/** Round helper for px values */
const px = (v: number) => `${Math.max(1, Math.round(v))}px`;

/**
 * Generates a branded QR code with the Mufadhala logo overlaid in the center.
 * Uses high error correction (H=30%) so the centered logo doesn't break scanning.
 */
async function generateBrandedQR(size = 520): Promise<string> {
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, INSTALL_URL, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "H",
    color: {
      dark: BRAND_PRIMARY,
      light: "#FFFFFF",
    },
  });

  const ctx = qrCanvas.getContext("2d");
  if (!ctx) return qrCanvas.toDataURL("image/png");

  const logoSize = Math.round(size * 0.22);
  const cx = size / 2;
  const cy = size / 2;
  const half = logoSize / 2;
  const radius = 14;

  ctx.save();
  ctx.fillStyle = "#FFFFFF";
  const x = cx - half;
  const y = cy - half;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + logoSize - radius, y);
  ctx.quadraticCurveTo(x + logoSize, y, x + logoSize, y + radius);
  ctx.lineTo(x + logoSize, y + logoSize - radius);
  ctx.quadraticCurveTo(x + logoSize, y + logoSize, x + logoSize - radius, y + logoSize);
  ctx.lineTo(x + radius, y + logoSize);
  ctx.quadraticCurveTo(x, y + logoSize, x, y + logoSize - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = BRAND_PRIMARY;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = BRAND_PRIMARY;
  ctx.font = `900 ${Math.round(logoSize * 0.7)}px "Arial Black", "Helvetica", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("M", cx, cy + Math.round(logoSize * 0.02));
  ctx.restore();

  return qrCanvas.toDataURL("image/png");
}

/** Builds the brochure HTML at the requested paper scale. */
function buildBrochureHTML(qrDataUrl: string, scale: number, size: PaperSize): string {
  const s = scale;
  // Token helpers — every visual unit scales together so A5 looks like a true mini A4.
  const t = {
    padX: px(36 * s),
    padTop: px(34 * s),
    padBottom: px(28 * s),
    accentBar: px(6 * s),
    logoBox: px(56 * s),
    logoRadius: px(16 * s),
    logoFont: px(34 * s),
    brand: px(26 * s),
    brandLetter: px(10 * s),
    headline: px(size === "A4" ? 24 : 30 * s),
    value: px(size === "A4" ? 13 : 16 * s),
    qrSize: px(size === "A4" ? 200 : 230 * s),
    qrPad: px(10 * s),
    qrRadius: px(16 * s),
    qrCaption: px(size === "A4" ? 15 : 18 * s),
    qrUrl: px(11 * s),
    install: px(11 * s),
    ctaPadY: px(16 * s),
    ctaPadX: px(20 * s),
    ctaRadius: px(14 * s),
    ctaFont: px(size === "A4" ? 18 : 20 * s),
    footer: px(11 * s),
    // A5-only legacy tokens
    featureGap: px(10 * s),
    featurePad: px(14 * s),
    featurePadX: px(16 * s),
    featureIcon: px(44 * s),
    featureRadius: px(12 * s),
    featureFont: px(15 * s),
    featureBorder: px(4 * s),
  };

  const middleSection = size === "A4"
    ? buildA4TwoColumn(qrDataUrl, t)
    : buildA5SingleColumn(qrDataUrl, t, s);

  return `
    <div style="
      width:100%; height:100%; box-sizing:border-box;
      background:#ffffff;
      padding: ${t.padTop} ${t.padX} ${t.padBottom};
      display:flex; flex-direction:column;
      color:#0f172a;
      position:relative; overflow:hidden;
    ">
      <div style="position:absolute; top:0; left:0; right:0; height:${t.accentBar};
        background: linear-gradient(to left, ${BRAND_PRIMARY}, ${BRAND_SECONDARY});"></div>
      <div style="position:absolute; bottom:0; left:0; right:0; height:${t.accentBar};
        background: linear-gradient(to right, ${BRAND_PRIMARY}, ${BRAND_SECONDARY});"></div>

      <header style="text-align:center; margin-bottom: ${px(14 * s)};">
        <div style="
          display:inline-flex; align-items:center; justify-content:center;
          width:${t.logoBox}; height:${t.logoBox}; border-radius:${t.logoRadius};
          background: linear-gradient(135deg, ${BRAND_PRIMARY}, #3949AB);
          color:#ffffff;
          font-family: 'Arial Black', Helvetica, system-ui, sans-serif;
          font-weight: 900; font-size: ${t.logoFont}; line-height: 1;
          letter-spacing:-2px;
          box-shadow: 0 6px 16px rgba(26,35,126,0.30);
          margin-bottom: ${px(8 * s)};
        ">M</div>
        <h1 style="margin:0; font-size:${t.brand}; font-weight:800; color:${BRAND_PRIMARY}; letter-spacing:-0.5px;">
          مُفَاضَلَة
        </h1>
        <p style="margin:${px(2 * s)} 0 0; font-size:${t.brandLetter}; color:#94a3b8; letter-spacing:3px; font-weight:700;">
          MUFADHALA
        </p>
      </header>

      ${middleSection}

      <div style="margin-top:auto;">
        <div style="
          background: linear-gradient(135deg, ${BRAND_PRIMARY} 0%, ${BRAND_SECONDARY} 100%);
          border-radius: ${t.ctaRadius};
          padding: ${t.ctaPadY} ${t.ctaPadX};
          text-align:center;
          box-shadow: 0 10px 24px rgba(26,35,126,0.25);
        ">
          <p style="margin:0; font-size:${t.ctaFont}; font-weight:900; color:#ffffff; line-height:1.4; letter-spacing:-0.3px;">
            🚀 ابدأ التدريب الآن ونافس على مقعدك الجامعي
          </p>
        </div>
        <p style="margin:${px(12 * s)} 0 0; text-align:center; font-size:${t.footer}; color:#94a3b8; font-weight:600;">
          © ${new Date().getFullYear()} مُفَاضَلَة • منصتك للتحضير لاختبارات القبول الجامعي
        </p>
      </div>
    </div>
  `;
}

/** A4: two-column layout. Right = features panel, Left = headline/value/QR/install. */
function buildA4TwoColumn(qrDataUrl: string, t: Record<string, string>): string {
  const featureCards = BROCHURE_FEATURES.map((f) => compactFeatureCard(f.icon, f.title)).join("");

  return `
    <div style="display:flex; flex-direction:row-reverse; gap:18px; margin-bottom:18px; flex:1; min-height:0;">
      <!-- RIGHT column (features) -->
      <div style="flex: 0 0 55%; display:flex; flex-direction:column;">
        <h3 style="
          margin:0 0 12px; text-align:right;
          font-size:16px; font-weight:900; color:${BRAND_PRIMARY};
          padding-bottom:8px; border-bottom:2px solid ${BRAND_SECONDARY};
        ">
          ✨ ماذا تقدم لك مُفَاضَلَة؟
        </h3>
        <div style="display:flex; flex-direction:column; gap:7px;">
          ${featureCards}
        </div>
      </div>

      <!-- LEFT column (hero + QR) -->
      <div style="flex: 1 1 45%; display:flex; flex-direction:column; align-items:center; text-align:center;">
        <h2 style="
          margin: 0 0 8px;
          font-size: ${t.headline}; font-weight: 900; line-height:1.35;
          color: ${BRAND_PRIMARY}; letter-spacing:-0.5px;
        ">
          🎯 استعد لاختبار القبول بثقة
        </h2>
        <p style="
          margin: 0 0 14px;
          font-size: ${t.value}; font-weight: 600; color:#475569; line-height:1.6;
        ">
          كل ما تحتاجه للنجاح في تطبيق واحد
        </p>

        <div style="
          background:#ffffff; padding:${t.qrPad}; border-radius:${t.qrRadius};
          box-shadow: 0 12px 30px rgba(26,35,126,0.18);
          margin-bottom:10px;
        ">
          <img src="${qrDataUrl}" alt="QR Code" style="display:block; width:${t.qrSize}; height:${t.qrSize};" />
        </div>
        <p style="margin:4px 0 8px; font-size:${t.qrCaption}; font-weight:800; color:${BRAND_PRIMARY};">
          دخول وتحميل التطبيق
        </p>
        ${websiteLinkBadge()}
        <p style="
          margin: 10px 0 0; font-size: ${t.install}; color:#64748b; line-height:1.6;
        ">
          ${INSTALL_COPY.android.full}
        </p>
      </div>
    </div>
  `;
}

/** A5: original single-column layout with 3 features (kept untouched). */
function buildA5SingleColumn(qrDataUrl: string, t: Record<string, string>, s: number): string {
  return `
    <h2 style="
      margin: ${px(6 * s)} 0 ${px(10 * s)}; text-align:center;
      font-size: ${t.headline}; font-weight: 900; line-height:1.35;
      color: ${BRAND_PRIMARY}; letter-spacing:-0.5px;
    ">
      🎯 استعد لاختبار القبول وادخل المفاضلة بثقة
    </h2>

    <p style="
      margin: 0 0 ${px(22 * s)}; text-align:center;
      font-size: ${t.value}; font-weight: 600; color:#475569; line-height:1.6;
    ">
      كل ما تحتاجه للنجاح في اختبار القبول في تطبيق واحد
    </p>

    <div style="display:flex; flex-direction:column; gap:${t.featureGap}; margin-bottom: ${px(24 * s)};">
      ${legacyFeatureRow("📝", "نماذج اختبارات حقيقية من السنوات السابقة", t)}
      ${legacyFeatureRow("🤖", "تدريب ذكي بالذكاء الاصطناعي حسب مستواك", t)}
      ${legacyFeatureRow("🎯", "محاكاة اختبار حقيقي قبل يوم القبول", t)}
    </div>

    <div style="
      display:flex; flex-direction:column; align-items:center; gap:${px(12 * s)};
      margin: ${px(4 * s)} 0 ${px(22 * s)};
    ">
      <div style="
        background:#ffffff; padding:${t.qrPad}; border-radius:${t.qrRadius};
        box-shadow: 0 12px 30px rgba(26,35,126,0.18);
      ">
        <img src="${qrDataUrl}" alt="QR Code" style="display:block; width:${t.qrSize}; height:${t.qrSize};" />
      </div>
      <p style="margin:${px(4 * s)} 0 0; font-size:${t.qrCaption}; font-weight:800; color:${BRAND_PRIMARY};">
        امسح الرمز وابدأ الآن
      </p>
      <p style="margin:0; font-size:${t.qrUrl}; color:#64748b; direction:ltr; font-family:'Courier New', monospace; font-weight:700; letter-spacing:0.5px;">
        mufadhala.com/install
      </p>
    </div>

    <p style="
      margin: 0 auto ${px(20 * s)}; text-align:center;
      font-size: ${t.install}; color:#64748b; line-height:1.7;
      max-width: ${px(620 * s)};
    ">
      ${INSTALL_COPY.android.full}
    </p>
  `;
}

/** Compact feature card used in the A4 right column (7 fit cleanly). */
function compactFeatureCard(emoji: string, label: string): string {
  return `
    <div style="
      display:flex; align-items:center; gap:10px;
      background:#f8fafc;
      border-right: 4px solid ${BRAND_SECONDARY};
      border-radius: 10px;
      padding: 9px 12px;
    ">
      <div style="
        flex-shrink:0; width:32px; height:32px; border-radius:8px;
        background:#ffffff;
        display:flex; align-items:center; justify-content:center;
        font-size: 18px; line-height:1;
        box-shadow: 0 2px 6px rgba(15,23,42,0.08);
      ">${emoji}</div>
      <p style="margin:0; font-size:13px; font-weight:700; color:#1e293b; line-height:1.4; text-align:right; flex:1;">
        ${label}
      </p>
    </div>
  `;
}

/** Legacy feature row used by the A5 layout. */
function legacyFeatureRow(emoji: string, label: string, t: Record<string, string>): string {
  return `
    <div style="
      display:flex; align-items:center; gap:${px(14)};
      background:#f8fafc;
      border-right: ${t.featureBorder} solid ${BRAND_SECONDARY};
      border-radius: ${t.featureRadius};
      padding: ${t.featurePad} ${t.featurePadX};
    ">
      <div style="
        flex-shrink:0; width:${t.featureIcon}; height:${t.featureIcon}; border-radius:${t.featureRadius};
        background:#ffffff;
        display:flex; align-items:center; justify-content:center;
        font-size: ${px(parseInt(t.featureIcon) * 0.55)}; line-height:1;
        box-shadow: 0 2px 6px rgba(15,23,42,0.06);
      ">${emoji}</div>
      <p style="margin:0; font-size:${t.featureFont}; font-weight:700; color:#1e293b; line-height:1.5;">
        ${label}
      </p>
    </div>
  `;
}

/** Internal: render → snapshot → save PDF for the given paper size. */
async function renderBrochure(size: PaperSize): Promise<void> {
  const profile = PAPER[size];
  // Higher QR resolution for A4; still sharp at A5.
  const qrDataUrl = await generateBrandedQR(size === "A4" ? 520 : 380);

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "-10000px";
  container.style.left = "0";
  container.style.width = `${profile.canvas.w}px`;
  container.style.height = `${profile.canvas.h}px`;
  container.style.background = "#ffffff";
  container.style.fontFamily = "'Cairo', system-ui, sans-serif";
  container.setAttribute("dir", "rtl");
  container.innerHTML = buildBrochureHTML(qrDataUrl, profile.scale, size);

  document.body.appendChild(container);

  try {
    try {
      if (document.fonts) {
        await Promise.all([
          document.fonts.load("900 30px Cairo"),
          document.fonts.load("800 28px Cairo"),
          document.fonts.load("700 16px Cairo"),
          document.fonts.load("400 14px Cairo"),
        ]);
        await document.fonts.ready;
      }
    } catch {
      // ignore — system-ui fallback still shapes Arabic correctly on most OS
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      width: profile.canvas.w,
      height: profile.canvas.h,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: size === "A4" ? "a4" : "a5",
    });

    pdf.addImage(imgData, "JPEG", 0, 0, profile.pdf.w, profile.pdf.h, undefined, "FAST");

    // Clickable QR + CTA regions (proportional to paper). Coordinates in mm.
    const s = profile.pdf.w / 210; // proportional scaling vs A4 reference
    if (size === "A4") {
      // QR is in the LEFT column of the two-column layout (left ~45% of width).
      // Approx QR box: x≈18mm, y≈100mm, 70x70mm
      pdf.link(18 * s, 100 * s, 70 * s, 70 * s, { url: INSTALL_URL });
      // CTA stays full-width near bottom
      pdf.link(20 * s, 252 * s, 170 * s, 24 * s, { url: INSTALL_URL });
    } else {
      // A5 single-column (unchanged)
      pdf.link(65 * s, 138 * s, 80 * s, 80 * s, { url: INSTALL_URL });
      pdf.link(20 * s, 252 * s, 170 * s, 24 * s, { url: INSTALL_URL });
    }

    pdf.save(profile.filename);
  } finally {
    document.body.removeChild(container);
  }
}

/**
 * Generates a high-conversion A4 marketing brochure for Mufadhala.
 * A4 layout: 2 columns (right = 7 feature cards, left = headline/QR/CTA).
 */
export async function generateBrochurePDF(_qrCanvas: HTMLCanvasElement): Promise<void> {
  await renderBrochure("A4");
}

/**
 * Generates the same brochure on A5 paper (half size — perfect for sticker prints).
 * Uses the original single-column layout with 3 summary features.
 */
export async function generateBrochurePDFA5(): Promise<void> {
  await renderBrochure("A5");
}
