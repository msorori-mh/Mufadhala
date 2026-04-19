import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { INSTALL_COPY } from "@/constants/installCopy";

const BRAND_PRIMARY = "#1A237E";
const BRAND_SECONDARY = "#2E7D32";
const INSTALL_URL = "https://mufadhala.com/install";

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

/**
 * Generates a high-conversion A4 marketing brochure for Mufadhala.
 * Structure: Brand → Headline → Value → 3 features → QR (hero) → 1-line install hint → final CTA.
 */
export async function generateBrochurePDF(_qrCanvas: HTMLCanvasElement): Promise<void> {
  const qrDataUrl = await generateBrandedQR(520);

  const A4_WIDTH_PX = 794;
  const A4_HEIGHT_PX = 1123;

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "-10000px";
  container.style.left = "0";
  container.style.width = `${A4_WIDTH_PX}px`;
  container.style.height = `${A4_HEIGHT_PX}px`;
  container.style.background = "#ffffff";
  container.style.fontFamily = "'Cairo', system-ui, sans-serif";
  container.setAttribute("dir", "rtl");

  container.innerHTML = `
    <div style="
      width:100%; height:100%; box-sizing:border-box;
      background:#ffffff;
      padding: 40px 44px 32px;
      display:flex; flex-direction:column;
      color:#0f172a;
      position:relative; overflow:hidden;
    ">
      <!-- Soft brand accents (top + bottom) -->
      <div style="position:absolute; top:0; left:0; right:0; height:6px;
        background: linear-gradient(to left, ${BRAND_PRIMARY}, ${BRAND_SECONDARY});"></div>
      <div style="position:absolute; bottom:0; left:0; right:0; height:6px;
        background: linear-gradient(to right, ${BRAND_PRIMARY}, ${BRAND_SECONDARY});"></div>

      <!-- 1) HEADER / BRAND -->
      <header style="text-align:center; margin-bottom: 18px;">
        <div style="
          display:inline-flex; align-items:center; justify-content:center;
          width:64px; height:64px; border-radius:18px;
          background: linear-gradient(135deg, ${BRAND_PRIMARY}, #3949AB);
          color:#ffffff;
          font-family: 'Arial Black', Helvetica, system-ui, sans-serif;
          font-weight: 900; font-size: 38px; line-height: 1;
          letter-spacing:-2px;
          box-shadow: 0 6px 16px rgba(26,35,126,0.30);
          margin-bottom: 10px;
        ">M</div>
        <h1 style="margin:0; font-size:28px; font-weight:800; color:${BRAND_PRIMARY}; letter-spacing:-0.5px;">
          مُفَاضَلَة
        </h1>
        <p style="margin:2px 0 0; font-size:11px; color:#94a3b8; letter-spacing:3px; font-weight:700;">
          MUFADHALA
        </p>
      </header>

      <!-- 2) MAIN HEADLINE -->
      <h2 style="
        margin: 6px 0 10px; text-align:center;
        font-size: 30px; font-weight: 900; line-height:1.35;
        color: ${BRAND_PRIMARY}; letter-spacing:-0.5px;
      ">
        🎯 استعد لاختبار القبول وادخل المفاضلة بثقة
      </h2>

      <!-- 3) VALUE STATEMENT -->
      <p style="
        margin: 0 0 22px; text-align:center;
        font-size: 16px; font-weight: 600; color:#475569; line-height:1.6;
      ">
        كل ما تحتاجه للنجاح في اختبار القبول في تطبيق واحد
      </p>

      <!-- 4) KEY FEATURES (3 only) -->
      <div style="display:flex; flex-direction:column; gap:10px; margin-bottom: 24px;">
        ${featureRow("📝", "نماذج اختبارات حقيقية من السنوات السابقة")}
        ${featureRow("🤖", "تدريب ذكي بالذكاء الاصطناعي حسب مستواك")}
        ${featureRow("🎯", "محاكاة اختبار حقيقي قبل يوم القبول")}
      </div>

      <!-- 5) QR HERO -->
      <div style="
        display:flex; flex-direction:column; align-items:center; gap:12px;
        margin: 4px 0 22px;
      ">
        <div style="
          background:#ffffff; padding:10px; border-radius:18px;
          box-shadow: 0 12px 30px rgba(26,35,126,0.18);
        ">
          <img src="${qrDataUrl}" alt="QR Code" style="display:block; width:230px; height:230px;" />
        </div>
        <p style="margin:4px 0 0; font-size:18px; font-weight:800; color:${BRAND_PRIMARY};">
          امسح الرمز وابدأ الآن
        </p>
        <p style="margin:0; font-size:12px; color:#64748b; direction:ltr; font-family:'Courier New', monospace; font-weight:700; letter-spacing:0.5px;">
          mufadhala.com/install
        </p>
      </div>

      <!-- 6) INSTALL INSTRUCTION (single line) -->
      <p style="
        margin: 0 0 20px; text-align:center;
        font-size: 12px; color:#64748b; line-height:1.7;
        max-width: 620px; margin-inline:auto;
      ">
        ${INSTALL_COPY.android.full}
      </p>

      <!-- 7) FINAL CTA -->
      <div style="margin-top:auto;">
        <div style="
          background: linear-gradient(135deg, ${BRAND_PRIMARY} 0%, ${BRAND_SECONDARY} 100%);
          border-radius: 16px;
          padding: 18px 20px;
          text-align:center;
          box-shadow: 0 10px 24px rgba(26,35,126,0.25);
        ">
          <p style="margin:0; font-size:20px; font-weight:900; color:#ffffff; line-height:1.4; letter-spacing:-0.3px;">
            🚀 ابدأ التدريب الآن ونافس على مقعدك الجامعي
          </p>
        </div>
        <p style="margin:14px 0 0; text-align:center; font-size:11px; color:#94a3b8; font-weight:600;">
          © ${new Date().getFullYear()} مُفَاضَلَة • منصتك للتحضير لاختبارات القبول الجامعي
        </p>
      </div>
    </div>
  `;

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
      width: A4_WIDTH_PX,
      height: A4_HEIGHT_PX,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");

    // Clickable QR hero region (covers QR image + caption + url) — coordinates in mm.
    pdf.link(65, 138, 80, 80, { url: INSTALL_URL });
    // Final CTA bar is also a clickable link.
    pdf.link(20, 252, 170, 24, { url: INSTALL_URL });

    pdf.save("mufadhala-brochure.pdf");
  } finally {
    document.body.removeChild(container);
  }
}

function featureRow(emoji: string, label: string): string {
  return `
    <div style="
      display:flex; align-items:center; gap:14px;
      background:#f8fafc;
      border-right: 4px solid ${BRAND_SECONDARY};
      border-radius: 12px;
      padding: 14px 16px;
    ">
      <div style="
        flex-shrink:0; width:44px; height:44px; border-radius:12px;
        background:#ffffff;
        display:flex; align-items:center; justify-content:center;
        font-size: 24px; line-height:1;
        box-shadow: 0 2px 6px rgba(15,23,42,0.06);
      ">${emoji}</div>
      <p style="margin:0; font-size:15px; font-weight:700; color:#1e293b; line-height:1.5;">
        ${label}
      </p>
    </div>
  `;
}
