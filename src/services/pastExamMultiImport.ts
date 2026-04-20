import * as XLSX from "xlsx";

export type ParsedQuestion = {
  q_text: string;
  q_option_a: string;
  q_option_b: string;
  q_option_c: string | null;
  q_option_d: string | null;
  q_correct: "a" | "b" | "c" | "d";
  q_explanation: string | null;
  order_index?: number;
};

export type ParsedModel = {
  title: string;
  year: number;
  universityName: string;
  isPublished: boolean;
  isPaid: boolean;
  sheetName: string;
  questions: ParsedQuestion[];
  questionErrors: { row: number; reason: string }[];
};

export type MultiParseResult = {
  models: ParsedModel[];
  errors: string[];
  warnings: string[];
};

const norm = (v: unknown) =>
  String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");

const normalizeCorrect = (v: unknown): "a" | "b" | "c" | "d" | null => {
  const s = norm(v);
  if (!s) return null;
  const map: Record<string, "a" | "b" | "c" | "d"> = {
    a: "a", b: "b", c: "c", d: "d",
    "أ": "a", "ا": "a", "ب": "b", "ج": "c", "د": "d",
    "1": "a", "2": "b", "3": "c", "4": "d",
  };
  return map[s] ?? null;
};

const yesNo = (v: unknown): boolean => {
  const s = norm(v);
  return s === "نعم" || s === "yes" || s === "true" || s === "1";
};

// Parse questions from a 2D array starting at the headers row
function parseQuestionsFromAOA(
  aoa: any[][],
  headerRowIndex: number,
): { questions: ParsedQuestion[]; errors: { row: number; reason: string }[] } {
  const questions: ParsedQuestion[] = [];
  const errors: { row: number; reason: string }[] = [];

  if (!aoa || aoa.length <= headerRowIndex) return { questions, errors };

  const headers = (aoa[headerRowIndex] || []).map((h: any) => norm(h));

  // Map known header aliases to column index
  const findCol = (aliases: string[]): number => {
    for (const a of aliases) {
      const na = norm(a);
      const idx = headers.indexOf(na);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const cText = findCol(["نص السؤال", "السؤال", "question", "question_text"]);
  const cA = findCol(["الخيار أ", "أ", "a", "option_a"]);
  const cB = findCol(["الخيار ب", "ب", "b", "option_b"]);
  const cC = findCol(["الخيار ج", "ج", "c", "option_c"]);
  const cD = findCol(["الخيار د", "د", "d", "option_d"]);
  const cCorrect = findCol(["الإجابة الصحيحة", "الاجابة الصحيحة", "الإجابة", "correct", "answer"]);
  const cExpl = findCol(["الشرح", "explanation"]);
  const cOrder = findCol(["ترتيب العرض", "ترتيب", "order", "order_index"]);

  if (cText === -1 || cA === -1 || cB === -1 || cCorrect === -1) {
    errors.push({ row: headerRowIndex + 1, reason: "أعمدة الأسئلة غير مكتملة (نص/أ/ب/إجابة)" });
    return { questions, errors };
  }

  for (let i = headerRowIndex + 1; i < aoa.length; i++) {
    const row = aoa[i] || [];
    const rowNum = i + 1;

    const text = String(row[cText] ?? "").trim();
    const a = String(row[cA] ?? "").trim();
    const b = String(row[cB] ?? "").trim();
    const c = cC !== -1 ? String(row[cC] ?? "").trim() : "";
    const d = cD !== -1 ? String(row[cD] ?? "").trim() : "";
    const correctRaw = row[cCorrect];
    const expl = cExpl !== -1 ? String(row[cExpl] ?? "").trim() : "";
    const orderRaw = cOrder !== -1 ? row[cOrder] : "";

    if (!text && !a && !b) continue; // skip empty rows

    if (!text) { errors.push({ row: rowNum, reason: "نص السؤال مفقود" }); continue; }
    if (!a) { errors.push({ row: rowNum, reason: "الخيار أ مفقود" }); continue; }
    if (!b) { errors.push({ row: rowNum, reason: "الخيار ب مفقود" }); continue; }

    const correct = normalizeCorrect(correctRaw);
    if (!correct) { errors.push({ row: rowNum, reason: "الإجابة الصحيحة غير صالحة" }); continue; }
    if ((correct === "c" && !c) || (correct === "d" && !d)) {
      errors.push({ row: rowNum, reason: `الإجابة (${correct}) تشير لخيار فارغ` });
      continue;
    }

    const orderNum = Number(orderRaw);
    questions.push({
      q_text: text,
      q_option_a: a,
      q_option_b: b,
      q_option_c: c || null,
      q_option_d: d || null,
      q_correct: correct,
      q_explanation: expl || null,
      order_index: Number.isFinite(orderNum) && orderNum > 0 ? orderNum : undefined,
    });
  }

  return { questions, errors };
}

export function parseMultiModelFile(buffer: ArrayBuffer): MultiParseResult {
  const wb = XLSX.read(buffer, { type: "array" });
  const errors: string[] = [];
  const warnings: string[] = [];
  const models: ParsedModel[] = [];

  // Find index sheet — name contains "فهرس" or starts with 📋
  const indexSheetName = wb.SheetNames.find(
    (n) => n.includes("فهرس") || n.startsWith("📋") || norm(n) === "index",
  );
  if (!indexSheetName) {
    errors.push("لم يتم العثور على ورقة الفهرس (📋 الفهرس). تأكد أن الملف مُولَّد من ميزة 'تصدير المحدد'.");
    return { models, errors, warnings };
  }

  const indexWs = wb.Sheets[indexSheetName];
  const indexAoa = XLSX.utils.sheet_to_json<any[]>(indexWs, { header: 1, defval: "" });

  // Find header row in index (row containing "اسم النموذج" or "اسم الورقة")
  let headerIdx = -1;
  for (let i = 0; i < Math.min(indexAoa.length, 10); i++) {
    const row = (indexAoa[i] || []).map((c: any) => norm(c));
    if (row.includes("اسم النموذج") || row.includes("اسم الورقة")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) {
    errors.push("ورقة الفهرس لا تحتوي على رؤوس الأعمدة المطلوبة (اسم النموذج، السنة، الجامعة، اسم الورقة).");
    return { models, errors, warnings };
  }

  const headers = (indexAoa[headerIdx] || []).map((h: any) => norm(h));
  const colTitle = headers.indexOf("اسم النموذج");
  const colYear = headers.indexOf("السنة");
  const colUni = headers.indexOf("الجامعة");
  const colPublished = headers.indexOf("منشور");
  const colPaid = headers.indexOf("مدفوع");
  const colSheet = headers.indexOf("اسم الورقة");

  if (colTitle === -1 || colYear === -1 || colUni === -1 || colSheet === -1) {
    errors.push("ورقة الفهرس مفقود منها أعمدة أساسية: اسم النموذج / السنة / الجامعة / اسم الورقة.");
    return { models, errors, warnings };
  }

  // Iterate rows after header
  for (let i = headerIdx + 1; i < indexAoa.length; i++) {
    const row = indexAoa[i] || [];
    const title = String(row[colTitle] ?? "").trim();
    const yearRaw = row[colYear];
    const universityName = String(row[colUni] ?? "").trim();
    const sheetName = String(row[colSheet] ?? "").trim();
    const isPublished = colPublished !== -1 ? yesNo(row[colPublished]) : false;
    const isPaid = colPaid !== -1 ? yesNo(row[colPaid]) : false;

    if (!title && !sheetName) continue; // skip empty rows

    if (!title) { errors.push(`الصف ${i + 1} في الفهرس: اسم النموذج مفقود`); continue; }
    if (!universityName) { errors.push(`الصف ${i + 1} في الفهرس: الجامعة مفقودة لـ "${title}"`); continue; }
    const year = Number(yearRaw);
    if (!Number.isFinite(year) || year < 1900 || year > 2100) {
      errors.push(`الصف ${i + 1} في الفهرس: سنة غير صالحة لـ "${title}"`);
      continue;
    }
    if (!sheetName) { errors.push(`الصف ${i + 1} في الفهرس: اسم الورقة مفقود لـ "${title}"`); continue; }

    // Find sheet (case + space tolerant)
    const realSheetName = wb.SheetNames.find((n) => norm(n) === norm(sheetName));
    if (!realSheetName) {
      errors.push(`الورقة "${sheetName}" غير موجودة في الملف (للنموذج "${title}")`);
      continue;
    }

    const ws = wb.Sheets[realSheetName];
    const aoa = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" });

    // Find header row in sheet (contains "نص السؤال")
    let qHeaderIdx = -1;
    for (let j = 0; j < Math.min(aoa.length, 10); j++) {
      const r = (aoa[j] || []).map((c: any) => norm(c));
      if (r.includes("نص السؤال")) { qHeaderIdx = j; break; }
    }
    if (qHeaderIdx === -1) {
      errors.push(`الورقة "${realSheetName}" لا تحتوي على رؤوس الأسئلة (نص السؤال...)`);
      continue;
    }

    const { questions, errors: qErrs } = parseQuestionsFromAOA(aoa, qHeaderIdx);

    if (questions.length === 0) {
      warnings.push(`النموذج "${title}" لا يحتوي على أي سؤال صالح.`);
    }

    models.push({
      title,
      year,
      universityName,
      isPublished,
      isPaid,
      sheetName: realSheetName,
      questions,
      questionErrors: qErrs,
    });
  }

  if (models.length === 0 && errors.length === 0) {
    errors.push("ورقة الفهرس فارغة — لا توجد نماذج للاستيراد.");
  }

  return { models, errors, warnings };
}

export function downloadMultiModelTemplate(): void {
  const wb = XLSX.utils.book_new();

  // Index sheet
  const indexAoa: (string | number)[][] = [
    ["📋 فهرس النماذج — قالب الاستيراد المتعدد"],
    [],
    ["اسم النموذج", "السنة", "الجامعة", "عدد الأسئلة", "منشور", "مدفوع", "اسم الورقة"],
    ["النموذج الأول - تجريبي", 2024, "جامعة صنعاء", 2, "لا", "لا", "نموذج_1"],
    ["النموذج الثاني - تجريبي", 2024, "جامعة صنعاء", 1, "لا", "لا", "نموذج_2"],
  ];
  const indexWs = XLSX.utils.aoa_to_sheet(indexAoa);
  indexWs["!cols"] = [{ wch: 38 }, { wch: 8 }, { wch: 22 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 22 }];
  if (!indexWs["!merges"]) indexWs["!merges"] = [];
  indexWs["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } });
  (indexWs as any)["!rtl"] = true;
  XLSX.utils.book_append_sheet(wb, indexWs, "📋 الفهرس");

  const questionHeaders = [
    "نص السؤال", "الخيار أ", "الخيار ب", "الخيار ج", "الخيار د",
    "الإجابة الصحيحة", "الشرح", "ترتيب العرض",
  ];

  // Sheet 1
  const s1: (string | number)[][] = [
    ["اسم النموذج: النموذج الأول - تجريبي"],
    ["السنة: 2024  |  الجامعة: جامعة صنعاء  |  الحالة: مسودة / مجاني"],
    [],
    questionHeaders,
    ["ما هو ناتج 2 + 2؟", "3", "4", "5", "6", "ب", "الجمع البسيط", 1],
    ["ما هي عاصمة اليمن؟", "عدن", "صنعاء", "تعز", "إب", "ب", "صنعاء هي العاصمة", 2],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(s1);
  ws1["!cols"] = [{ wch: 50 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 35 }, { wch: 12 }];
  if (!ws1["!merges"]) ws1["!merges"] = [];
  ws1["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } });
  ws1["!merges"].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 7 } });
  (ws1 as any)["!rtl"] = true;
  XLSX.utils.book_append_sheet(wb, ws1, "نموذج_1");

  // Sheet 2
  const s2: (string | number)[][] = [
    ["اسم النموذج: النموذج الثاني - تجريبي"],
    ["السنة: 2024  |  الجامعة: جامعة صنعاء  |  الحالة: مسودة / مجاني"],
    [],
    questionHeaders,
    ["كم عدد أيام الأسبوع؟", "5", "6", "7", "8", "ج", "أيام الأسبوع 7", 1],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(s2);
  ws2["!cols"] = [{ wch: 50 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 35 }, { wch: 12 }];
  if (!ws2["!merges"]) ws2["!merges"] = [];
  ws2["!merges"].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } });
  ws2["!merges"].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 7 } });
  (ws2 as any)["!rtl"] = true;
  XLSX.utils.book_append_sheet(wb, ws2, "نموذج_2");

  XLSX.writeFile(wb, "قالب_استيراد_متعدد_النماذج.xlsx");
}
