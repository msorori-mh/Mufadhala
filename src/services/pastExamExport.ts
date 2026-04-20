import * as XLSX from "xlsx";

export type ExportModel = {
  id: string;
  title: string;
  year: number;
  is_published: boolean;
  is_paid: boolean;
  university_name: string;
};

export type ExportQuestion = {
  q_text: string | null;
  q_option_a: string | null;
  q_option_b: string | null;
  q_option_c: string | null;
  q_option_d: string | null;
  q_correct: string | null;
  q_explanation: string | null;
  order_index: number;
};

const correctToArabic = (c: string | null): string => {
  const map: Record<string, string> = { a: "أ", b: "ب", c: "ج", d: "د" };
  return map[(c || "").toLowerCase()] || "أ";
};

// Excel sheet name: max 31 chars, no : \ / ? * [ ]
const sanitizeSheetName = (raw: string): string => {
  const cleaned = raw.replace(/[:\\\/\?\*\[\]]/g, "_").trim();
  return cleaned.slice(0, 31) || "ورقة";
};

const uniqueSheetName = (base: string, used: Set<string>): string => {
  let name = sanitizeSheetName(base);
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  let i = 2;
  while (used.has(sanitizeSheetName(`${base}_${i}`))) i++;
  const final = sanitizeSheetName(`${base}_${i}`);
  used.add(final);
  return final;
};

const buildSheetBaseName = (m: ExportModel, index: number): string => {
  // Take first 2 words of university to keep names short
  const uniShort = (m.university_name || "جامعة").split(/\s+/).slice(0, 2).join("_");
  return `${uniShort}_${m.year}_${index + 1}`;
};

export function exportModelsToExcel(
  models: ExportModel[],
  questionsByModelId: Record<string, ExportQuestion[]>,
): void {
  const wb = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  // Pre-compute sheet names so the index can reference them
  const sheetNames = models.map((m, i) => uniqueSheetName(buildSheetBaseName(m, i), usedNames));

  // ===== 1) Index sheet =====
  const indexHeaders = [
    "اسم النموذج",
    "السنة",
    "الجامعة",
    "عدد الأسئلة",
    "منشور",
    "مدفوع",
    "اسم الورقة",
  ];
  const indexRows: (string | number)[][] = [
    [`📋 فهرس النماذج المُصدَّرة (${models.length} نموذج) — ${new Date().toLocaleDateString("ar")}`],
    [],
    indexHeaders,
    ...models.map((m, i) => [
      m.title,
      m.year,
      m.university_name,
      (questionsByModelId[m.id] || []).length,
      m.is_published ? "نعم" : "لا",
      m.is_paid ? "نعم" : "لا",
      sheetNames[i],
    ]),
  ];
  const indexWs = XLSX.utils.aoa_to_sheet(indexRows);
  indexWs["!cols"] = [{ wch: 38 }, { wch: 8 }, { wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 22 }];
  if (!indexWs["!merges"]) indexWs["!merges"] = [];
  indexWs["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: indexHeaders.length - 1 } });
  (indexWs as any)["!rtl"] = true;
  XLSX.utils.book_append_sheet(wb, indexWs, "📋 الفهرس");

  // ===== 2) One sheet per model =====
  const questionHeaders = [
    "نص السؤال",
    "الخيار أ",
    "الخيار ب",
    "الخيار ج",
    "الخيار د",
    "الإجابة الصحيحة",
    "الشرح",
    "ترتيب العرض",
  ];

  models.forEach((m, i) => {
    const qs = (questionsByModelId[m.id] || [])
      .slice()
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    const status = `${m.is_published ? "منشور" : "مسودة"} / ${m.is_paid ? "مدفوع" : "مجاني"}`;
    const aoa: (string | number)[][] = [
      [`اسم النموذج: ${m.title}`],
      [`السنة: ${m.year}  |  الجامعة: ${m.university_name}  |  الحالة: ${status}`],
      [],
      questionHeaders,
      ...qs.map((q, idx) => [
        q.q_text || "",
        q.q_option_a || "",
        q.q_option_b || "",
        q.q_option_c || "",
        q.q_option_d || "",
        correctToArabic(q.q_correct),
        q.q_explanation || "",
        q.order_index || idx + 1,
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [
      { wch: 50 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 35 }, { wch: 12 },
    ];
    if (!ws["!merges"]) ws["!merges"] = [];
    ws["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: questionHeaders.length - 1 } });
    ws["!merges"].push({ s: { r: 1, c: 0 }, e: { r: 1, c: questionHeaders.length - 1 } });
    (ws as any)["!rtl"] = true;

    XLSX.utils.book_append_sheet(wb, ws, sheetNames[i]);
  });

  const date = new Date().toISOString().slice(0, 10);
  const fileName = `نماذج_مختارة_${date}_${models.length}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
