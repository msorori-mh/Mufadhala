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

export type ParseError = { row: number; reason: string };

export type ParseResult = {
  questions: ParsedQuestion[];
  errors: ParseError[];
  duplicateWarnings: number;
};

// Header aliases (Arabic + English) — case/space insensitive
const H = {
  text: ["نص السؤال", "السؤال", "question", "question_text", "text"],
  a: ["الخيار أ", "أ", "a", "option_a", "option a"],
  b: ["الخيار ب", "ب", "b", "option_b", "option b"],
  c: ["الخيار ج", "ج", "c", "option_c", "option c"],
  d: ["الخيار د", "د", "d", "option_d", "option d"],
  correct: ["الإجابة الصحيحة", "الاجابة الصحيحة", "الإجابة", "correct", "answer", "q_correct"],
  explanation: ["الشرح", "explanation", "q_explanation"],
  order: ["ترتيب العرض", "ترتيب", "order", "order_index"],
};

const norm = (v: unknown) => String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");

function findKey(row: Record<string, unknown>, aliases: string[]): string | undefined {
  const keys = Object.keys(row);
  const normalized = keys.map((k) => ({ orig: k, n: norm(k) }));
  for (const a of aliases) {
    const na = norm(a);
    const hit = normalized.find((k) => k.n === na);
    if (hit) return hit.orig;
  }
  return undefined;
}

function normalizeCorrect(v: unknown): "a" | "b" | "c" | "d" | null {
  const s = norm(v);
  if (!s) return null;
  const map: Record<string, "a" | "b" | "c" | "d"> = {
    a: "a", b: "b", c: "c", d: "d",
    "أ": "a", "ا": "a", "ب": "b", "ج": "c", "د": "d",
    "1": "a", "2": "b", "3": "c", "4": "d",
  };
  return map[s] ?? null;
}

export function parsePastExamFile(data: ArrayBuffer): ParseResult {
  const wb = XLSX.read(data, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return { questions: [], errors: [{ row: 0, reason: "الملف فارغ" }], duplicateWarnings: 0 };
  }
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  const questions: ParsedQuestion[] = [];
  const errors: ParseError[] = [];
  const seen = new Set<string>();
  let duplicateWarnings = 0;

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // header is row 1

    const kText = findKey(row, H.text);
    const kA = findKey(row, H.a);
    const kB = findKey(row, H.b);
    const kC = findKey(row, H.c);
    const kD = findKey(row, H.d);
    const kCorrect = findKey(row, H.correct);
    const kExpl = findKey(row, H.explanation);
    const kOrder = findKey(row, H.order);

    const text = String(kText ? row[kText] ?? "" : "").trim();
    const a = String(kA ? row[kA] ?? "" : "").trim();
    const b = String(kB ? row[kB] ?? "" : "").trim();
    const c = String(kC ? row[kC] ?? "" : "").trim();
    const d = String(kD ? row[kD] ?? "" : "").trim();
    const correctRaw = kCorrect ? row[kCorrect] : "";
    const expl = String(kExpl ? row[kExpl] ?? "" : "").trim();
    const orderRaw = kOrder ? row[kOrder] : "";

    // Skip fully empty rows silently
    if (!text && !a && !b) return;

    if (!text) { errors.push({ row: rowNum, reason: "نص السؤال مفقود" }); return; }
    if (!a) { errors.push({ row: rowNum, reason: "الخيار أ مفقود" }); return; }
    if (!b) { errors.push({ row: rowNum, reason: "الخيار ب مفقود" }); return; }

    const correct = normalizeCorrect(correctRaw);
    if (!correct) { errors.push({ row: rowNum, reason: "الإجابة الصحيحة غير صالحة (a/b/c/d أو أ/ب/ج/د)" }); return; }

    if ((correct === "c" && !c) || (correct === "d" && !d)) {
      errors.push({ row: rowNum, reason: `الإجابة (${correct}) تشير لخيار فارغ` });
      return;
    }

    const sig = norm(text);
    if (seen.has(sig)) duplicateWarnings++;
    else seen.add(sig);

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
  });

  return { questions, errors, duplicateWarnings };
}

export function downloadTemplate() {
  const headers = [
    "نص السؤال",
    "الخيار أ",
    "الخيار ب",
    "الخيار ج",
    "الخيار د",
    "الإجابة الصحيحة",
    "الشرح",
    "ترتيب العرض",
  ];
  const example = [
    "ما هو ناتج 2 + 2؟",
    "3",
    "4",
    "5",
    "6",
    "ب",
    "الجمع البسيط: 2 + 2 = 4",
    1,
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);
  ws["!cols"] = [{ wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 30 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "الأسئلة");
  XLSX.writeFile(wb, "قالب_اسئلة_نموذج.xlsx");
}
