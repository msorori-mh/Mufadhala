import * as XLSX from "xlsx";

export interface ExportData {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  summary?: Record<string, string | number>;
}

export const exportToExcel = (data: ExportData, filename: string) => {
  const wb = XLSX.utils.book_new();
  const wsData: (string | number)[][] = [];

  // Title row
  wsData.push([data.title]);
  wsData.push([]);

  // Summary if provided
  if (data.summary) {
    Object.entries(data.summary).forEach(([k, v]) => wsData.push([k, v]));
    wsData.push([]);
  }

  // Headers + rows
  wsData.push(data.headers);
  data.rows.forEach((r) => wsData.push(r));

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  // Set RTL
  ws["!cols"] = data.headers.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws, "تقرير");
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportToPDF = (data: ExportData, filename: string) => {
  const win = window.open("", "_blank");
  if (!win) return;

  const summaryHtml = data.summary
    ? `<table style="margin-bottom:16px;border-collapse:collapse"><tbody>${Object.entries(data.summary)
        .map(([k, v]) => `<tr><td style="padding:4px 12px;font-weight:bold">${k}</td><td style="padding:4px 12px">${v}</td></tr>`)
        .join("")}</tbody></table>`
    : "";

  const tableHtml = `<table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead><tr>${data.headers.map((h) => `<th style="border:1px solid #ddd;padding:8px;background:#f3f4f6;text-align:right">${h}</th>`).join("")}</tr></thead>
    <tbody>${data.rows.map((r) => `<tr>${r.map((c) => `<td style="border:1px solid #ddd;padding:6px 8px;text-align:right">${c}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>`;

  win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>${data.title}</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;direction:rtl}h1{font-size:20px;margin-bottom:8px}
    @media print{body{padding:0}}</style></head><body>
    <h1>${data.title}</h1><p style="color:#666;font-size:12px;margin-bottom:16px">${new Date().toLocaleDateString("ar")}</p>
    ${summaryHtml}${tableHtml}
    <script>setTimeout(()=>{window.print()},500)</script></body></html>`);
  win.document.close();
};
