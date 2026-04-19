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
async function generateBrandedQR(size = 480): Promise<string> {
  // 1) Render the QR onto an off-screen canvas in brand colors
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

  // 2) Draw a centered white rounded square as the logo backdrop
  const logoSize = Math.round(size * 0.22);
  const cx = size / 2;
  const cy = size / 2;
  const half = logoSize / 2;
  const radius = 14;

  ctx.save();
  ctx.fillStyle = "#FFFFFF";
  // rounded rect
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

  // subtle border
  ctx.strokeStyle = BRAND_PRIMARY;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // 3) Draw the "M" letter (Mufadhala mark) inside the white square — Latin
  //    glyph guarantees correct rendering in any environment (no font dependency).
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
 * Generates an A4 print-ready brochure PDF for Mufadhala.
 * Strategy: Build the brochure as off-screen HTML (perfect Arabic RTL + icons + brand),
 * snapshot it with html2canvas, and embed into a single A4 page via jsPDF.
 *
 * @param _qrCanvas - Kept for backward compatibility; we now generate a branded QR ourselves.
 */
export async function generateBrochurePDF(_qrCanvas: HTMLCanvasElement): Promise<void> {
  const qrDataUrl = await generateBrandedQR(480);

  // A4 @ ~96 DPI working canvas: 794 x 1123 px (final PDF still vector-sharp via 2x scale)
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
      background: linear-gradient(135deg, #1A237E 0%, #283593 50%, #2E7D32 100%);
      padding: 36px;
      display:flex; flex-direction:column;
      color: #ffffff;
    ">
      <!-- Inner white card -->
      <div style="
        flex:1; background:#ffffff; border-radius:24px;
        padding: 40px 36px;
        display:flex; flex-direction:column; gap:24px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.25);
        color:#1A237E;
        position:relative; overflow:hidden;
      ">
        <!-- Decorative corner accents -->
        <div style="position:absolute; top:-60px; left:-60px; width:180px; height:180px; border-radius:50%; background:#1A237E; opacity:0.06;"></div>
        <div style="position:absolute; bottom:-80px; right:-80px; width:240px; height:240px; border-radius:50%; background:#2E7D32; opacity:0.06;"></div>

        <!-- Header / Brand -->
        <div style="text-align:center; position:relative;">
          <div style="
            display:inline-flex; align-items:center; justify-content:center;
            width:78px; height:78px; border-radius:20px;
            background: linear-gradient(135deg, #1A237E, #3949AB);
            box-shadow: 0 8px 20px rgba(26,35,126,0.35);
            margin-bottom:14px;
            color:#ffffff;
            font-family: 'Arial Black', Helvetica, system-ui, sans-serif;
            font-weight: 900;
            font-size: 48px;
            line-height: 1;
            letter-spacing: -2px;
          ">M</div>
          <h1 style="margin:0; font-size:36px; font-weight:800; color:#1A237E; letter-spacing:-0.5px;">
            مُفَاضَلَة
          </h1>
          <p style="margin:6px 0 0; font-size:14px; color:#5b6bb5; letter-spacing:2px; font-weight:600;">
            MUFADHALA
          </p>
          <p style="margin:14px 0 0; font-size:16px; color:#374151; font-weight:600; line-height:1.6;">
            منصتك الذكية للتحضير لاختبارات القبول الجامعي في اليمن
          </p>
        </div>

        <!-- Divider with badge -->
        <div style="display:flex; align-items:center; gap:12px; margin: 4px 0;">
          <div style="flex:1; height:2px; background: linear-gradient(to left, transparent, #2E7D32);"></div>
          <div style="
            background: #2E7D32; color:#fff; padding: 8px 18px;
            border-radius: 999px; font-size:13px; font-weight:700;
          ">
            امسح • ثبّت • ابدأ التحضير
          </div>
          <div style="flex:1; height:2px; background: linear-gradient(to right, transparent, #2E7D32);"></div>
        </div>

        <!-- QR Section -->
        <div style="
          display:flex; flex-direction:column; align-items:center; gap:14px;
          padding: 20px;
          background: #f8fafc; border: 2px dashed #1A237E33;
          border-radius:18px;
        ">
          <div style="
            background:#fff; padding:14px; border-radius:14px;
            box-shadow: 0 4px 14px rgba(0,0,0,0.08);
          ">
            <img src="${qrDataUrl}" alt="QR Code" style="display:block; width:200px; height:200px;" />
          </div>
          <div style="text-align:center;">
            <p style="margin:0; font-size:15px; font-weight:700; color:#1A237E;">
              وجّه كاميرا جوالك نحو الرمز
            </p>
            <p style="margin:6px 0 0; font-size:13px; color:#6b7280; direction:ltr; font-family: 'Courier New', monospace; font-weight:600;">
              mufadhala.com/install
            </p>
          </div>
        </div>

        <!-- Install Instructions: 2 columns -->
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:14px;">
          <!-- Android -->
          <div style="
            background:#fff; border:1.5px solid #e5e7eb;
            border-radius:14px; padding:16px;
            border-top: 4px solid #2E7D32;
          ">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
              <h3 style="margin:0; font-size:15px; font-weight:800; color:#1A237E;">Android</h3>
              <span style="
                font-size:11px; font-weight:700; color:#2E7D32;
                background:#2E7D3215; padding:3px 10px; border-radius:999px;
              ">أندرويد</span>
            </div>
            <ol style="margin:0 0 8px; padding:0; list-style:none; display:flex; flex-direction:column; gap:8px;">
              ${androidStep(1, "افتح الرابط باستخدام Google Chrome")}
              ${androidStep(2, "اضغط على قائمة الخيارات (⋮)")}
              ${androidStep(3, "اختر «تثبيت التطبيق»")}
            </ol>
            <div style="
              background:#FEF3C7; border:1px solid #F59E0B40;
              border-radius:8px; padding:8px 10px;
              font-size:11px; color:#92400E; font-weight:700; line-height:1.5;
            ">
              ${INSTALL_COPY.android.full}
            </div>
          </div>

          <!-- iOS -->
          <div style="
            background:#fff; border:1.5px solid #e5e7eb;
            border-radius:14px; padding:16px;
            border-top: 4px solid #1A237E;
          ">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
              <h3 style="margin:0; font-size:15px; font-weight:800; color:#1A237E;">iPhone / iPad</h3>
              <span style="
                font-size:11px; font-weight:700; color:#1A237E;
                background:#1A237E15; padding:3px 10px; border-radius:999px;
              ">آيفون</span>
            </div>
            <ol style="margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:8px;">
              ${iosStep(1, "افتح الموقع في متصفح Safari")}
              ${iosStep(2, "اضغط على زر المشاركة ⬆")}
              ${iosStep(3, "اختر «إضافة إلى الشاشة الرئيسية»")}
            </ol>
          </div>
        </div>

        <!-- Features highlights -->
        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; margin-top:4px;">
          ${featureBadge("📚", "دروس وملخصات")}
          ${featureBadge("🤖", "مُفَاضِل AI")}
          ${featureBadge("📝", "اختبارات سابقة")}
        </div>

        <!-- Footer -->
        <div style="
          margin-top:auto; text-align:center;
          padding-top:14px; border-top: 1px solid #e5e7eb;
        ">
          <p style="margin:0; font-size:12px; color:#6b7280; font-weight:600;">
            © ${new Date().getFullYear()} مُفَاضَلَة • هندسة النجاح في اختبارات القبول
          </p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    // Ensure Cairo font is fully loaded BEFORE snapshot, otherwise html2canvas
    // captures with a fallback font that breaks Arabic letter joining (مُفَاضَلَة → م ف ا ض ل ة).
    try {
      if (document.fonts) {
        await Promise.all([
          document.fonts.load("700 36px Cairo"),
          document.fonts.load("700 16px Cairo"),
          document.fonts.load("400 14px Cairo"),
        ]);
        await document.fonts.ready;
      }
    } catch {
      // ignore — system-ui fallback still shapes Arabic correctly on most OS
    }
    // One more frame so layout settles after fonts swap
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

    // A4 = 210 x 297 mm — fill the page
    pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");

    // Make the entire QR area + URL text a clickable link to the canonical install URL.
    // This guarantees that any tap in the PDF — even outside scanning — opens
    // mufadhala.com/install, regardless of which environment generated the file.
    // QR section sits roughly in the vertical middle of the A4 page.
    // Coordinates in mm (A4: 210 × 297). Tuned to cover QR image + URL caption.
    pdf.link(60, 110, 90, 90, { url: INSTALL_URL });
    // Footer-level link covering the displayed "mufadhala.com/install" text.
    pdf.link(60, 200, 90, 10, { url: INSTALL_URL });

    pdf.save("mufadhala-brochure.pdf");
  } finally {
    document.body.removeChild(container);
  }
}

function androidStep(n: number, text: string): string {
  return `
    <li style="display:flex; gap:10px; align-items:flex-start;">
      <span style="
        flex-shrink:0; width:22px; height:22px; border-radius:50%;
        background:#2E7D3215; color:#2E7D32; font-size:11px; font-weight:800;
        display:inline-flex; align-items:center; justify-content:center;
      ">${n}</span>
      <span style="font-size:12.5px; color:#374151; line-height:1.5; padding-top:2px;">${text}</span>
    </li>
  `;
}

function iosStep(n: number, text: string): string {
  return `
    <li style="display:flex; gap:10px; align-items:flex-start;">
      <span style="
        flex-shrink:0; width:22px; height:22px; border-radius:50%;
        background:#1A237E15; color:#1A237E; font-size:11px; font-weight:800;
        display:inline-flex; align-items:center; justify-content:center;
      ">${n}</span>
      <span style="font-size:12.5px; color:#374151; line-height:1.5; padding-top:2px;">${text}</span>
    </li>
  `;
}

function featureBadge(emoji: string, label: string): string {
  return `
    <div style="
      background: linear-gradient(135deg, #1A237E08, #2E7D3208);
      border:1px solid #1A237E20;
      border-radius:12px; padding:10px;
      text-align:center;
    ">
      <div style="font-size:22px; line-height:1;">${emoji}</div>
      <div style="margin-top:4px; font-size:11px; font-weight:700; color:#1A237E;">${label}</div>
    </div>
  `;
}
