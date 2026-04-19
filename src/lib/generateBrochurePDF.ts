import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { createRoot } from "react-dom/client";
import { createElement } from "react";
import InstallBrochureContent from "@/components/InstallBrochureContent";

const BRAND_PRIMARY = "#1A237E";
const INSTALL_URL = "https://mufadhala.com/install";

type PaperSize = "A4" | "A5";

interface PaperProfile {
  /** mm width × height (portrait) */
  pdf: { w: number; h: number };
  /** off-screen render canvas px (96dpi) */
  canvas: { w: number; h: number };
  /** filename suffix */
  filename: string;
  /** jsPDF format keyword */
  format: "a4" | "a5";
}

const PAPER: Record<PaperSize, PaperProfile> = {
  A4: { pdf: { w: 210, h: 297 }, canvas: { w: 794, h: 1123 }, filename: "mufadhala-brochure-A4.pdf", format: "a4" },
  A5: { pdf: { w: 148, h: 210 }, canvas: { w: 559, h: 794 }, filename: "mufadhala-brochure-A5.pdf", format: "a5" },
};

/**
 * Branded QR with the Mufadhala "M" overlay in the center.
 * High error correction (H=30%) keeps the code scannable despite the logo.
 */
async function generateBrandedQR(size = 520): Promise<string> {
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, INSTALL_URL, {
    width: size,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: BRAND_PRIMARY, light: "#FFFFFF" },
  });

  const ctx = qrCanvas.getContext("2d");
  if (!ctx) return qrCanvas.toDataURL("image/png");

  const logoSize = Math.round(size * 0.22);
  const cx = size / 2;
  const cy = size / 2;
  const half = logoSize / 2;
  const radius = 14;
  const x = cx - half;
  const y = cy - half;

  ctx.save();
  ctx.fillStyle = "#FFFFFF";
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
  ctx.fillStyle = BRAND_PRIMARY;
  ctx.font = `900 ${Math.round(logoSize * 0.7)}px "Arial Black", "Helvetica", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("M", cx, cy + Math.round(logoSize * 0.02));
  ctx.restore();

  return qrCanvas.toDataURL("image/png");
}

/** Wait for the given image element to load (or fail silently). */
function waitForImage(img: HTMLImageElement): Promise<void> {
  return new Promise((resolve) => {
    if (img.complete && img.naturalWidth > 0) return resolve();
    img.addEventListener("load", () => resolve(), { once: true });
    img.addEventListener("error", () => resolve(), { once: true });
  });
}

/**
 * Snapshot-based renderer: mounts the actual <InstallBrochureContent /> React
 * component into a hidden container, waits for fonts + images, captures with
 * html2canvas, then embeds in jsPDF. Guarantees the PDF mirrors the page.
 */
async function renderBrochure(size: PaperSize): Promise<void> {
  const profile = PAPER[size];
  const qrDataUrl = await generateBrandedQR(size === "A4" ? 520 : 380);

  // Off-screen mount point — outside the visible viewport but still painted.
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.top = "-10000px";
  host.style.left = "0";
  host.style.width = `${profile.canvas.w}px`;
  host.style.height = `${profile.canvas.h}px`;
  host.style.background = "#ffffff";
  host.style.zIndex = "-1";
  host.style.overflow = "hidden";
  host.setAttribute("dir", "rtl");
  document.body.appendChild(host);

  const root = createRoot(host);

  try {
    root.render(
      createElement(InstallBrochureContent, {
        printMode: true,
        pageSize: size,
        qrDataUrl,
      })
    );

    // Wait for React to commit + fonts to load + logo image to be ready.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    try {
      if (document.fonts) {
        await Promise.all([
          document.fonts.load("900 24px Cairo"),
          document.fonts.load("800 18px Cairo"),
          document.fonts.load("700 14px Cairo"),
          document.fonts.load("400 12px Cairo"),
        ]);
        await document.fonts.ready;
      }
    } catch {
      // ignore — system Arabic fallback is acceptable
    }

    // Wait for any <img> (logo, qr) inside the brochure to load.
    const imgs = Array.from(host.querySelectorAll("img"));
    await Promise.all(imgs.map(waitForImage));

    // One more frame so layout settles after fonts/images.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const canvas = await html2canvas(host, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      width: profile.canvas.w,
      height: profile.canvas.h,
      windowWidth: profile.canvas.w,
      windowHeight: profile.canvas.h,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: profile.format });
    pdf.addImage(imgData, "JPEG", 0, 0, profile.pdf.w, profile.pdf.h, undefined, "FAST");

    // Compute clickable regions from the rendered DOM.
    // px → mm conversion ratio (canvas px @ 96dpi → mm of paper).
    const pxToMm = profile.pdf.w / profile.canvas.w;
    const hostRect = host.getBoundingClientRect();

    const qrBlock = host.querySelector("[data-brochure-qr-block]") as HTMLElement | null;
    const cta = host.querySelector("[data-brochure-cta]") as HTMLElement | null;

    if (qrBlock) {
      const r = qrBlock.getBoundingClientRect();
      pdf.link(
        (r.left - hostRect.left) * pxToMm,
        (r.top - hostRect.top) * pxToMm,
        r.width * pxToMm,
        r.height * pxToMm,
        { url: INSTALL_URL }
      );
    }
    if (cta) {
      const r = cta.getBoundingClientRect();
      pdf.link(
        (r.left - hostRect.left) * pxToMm,
        (r.top - hostRect.top) * pxToMm,
        r.width * pxToMm,
        r.height * pxToMm,
        { url: INSTALL_URL }
      );
    }

    pdf.save(profile.filename);
  } finally {
    // Defer unmount to the next tick so React doesn't warn about sync unmount during render.
    setTimeout(() => {
      try {
        root.unmount();
      } catch {
        // ignore
      }
      if (host.parentNode) host.parentNode.removeChild(host);
    }, 0);
  }
}

/**
 * Generates a high-conversion A4 marketing brochure for Mufadhala.
 * The PDF is a 1:1 snapshot of the on-page features card + brand header,
 * extended with a QR + CTA + footer block.
 */
export async function generateBrochurePDF(_qrCanvas: HTMLCanvasElement): Promise<void> {
  await renderBrochure("A4");
}

/**
 * Generates the same brochure on A5 paper (half size — perfect for sticker prints).
 */
export async function generateBrochurePDFA5(): Promise<void> {
  await renderBrochure("A5");
}
