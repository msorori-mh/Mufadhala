import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface SummaryPDFDownloadProps {
  title: string;
  text: string;
}

const SummaryPDFDownload = ({ title, text }: SummaryPDFDownloadProps) => {
  const handleDownload = () => {
    const win = window.open("", "_blank");
    if (!win) return;

    const safeTitle = (title || "ملخص الدرس").replace(/</g, "&lt;");
    const safeText = (text || "").replace(/</g, "&lt;");
    const dateStr = new Date().toLocaleDateString("ar");

    win.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
      <title>${safeTitle} - ملخص</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        body { font-family: 'Cairo', Arial, sans-serif; padding: 32px; direction: rtl; color: #1a1a1a; line-height: 1.9; }
        .header { border-bottom: 2px solid #1A237E; padding-bottom: 12px; margin-bottom: 24px; }
        .brand { color: #1A237E; font-weight: 700; font-size: 14px; }
        h1 { font-size: 22px; margin: 8px 0 4px; color: #1A237E; }
        .date { color: #666; font-size: 12px; }
        .summary { font-size: 15px; white-space: pre-wrap; margin-top: 16px; }
        .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #ddd; color: #888; font-size: 11px; text-align: center; }
        @media print { body { padding: 16px; } }
      </style>
    </head><body>
      <div class="header">
        <div class="brand">منصة مُفَاضَلَة | Mufadhala</div>
        <h1>${safeTitle}</h1>
        <div class="date">ملخص الدرس · ${dateStr}</div>
      </div>
      <div class="summary">${safeText}</div>
      <div class="footer">© Mufadhala — تم التحميل من تطبيق مُفَاضَلَة</div>
      <script>setTimeout(() => { window.print(); }, 600);</script>
    </body></html>`);
    win.document.close();
  };

  if (!text?.trim()) return null;

  return (
    <Button onClick={handleDownload} variant="outline" size="sm" className="gap-2">
      <Download className="w-4 h-4" />
      تحميل الملخص PDF
    </Button>
  );
};

export default SummaryPDFDownload;
