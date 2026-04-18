import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────────
export interface ImportSubject {
  id: string;
  name_ar: string;
  code: string;
}

export interface ImportLesson {
  lesson_code: string;
  subject_code: string;
  title: string;
  content: string;
  summary: string;
  display_order: number;
  is_published: boolean;
  grade_level: number | null;
  sourceRow: number;
}

export interface ImportQuestion {
  lesson_code: string;
  question_type: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
  display_order: number;
  sourceRow: number;
}

export interface ValidationError {
  row: number;
  sheet: string;
  field: string;
  message: string;
  severity?: "error" | "warning";
}

export interface ImportReport {
  lessonsCreated: number;
  lessonsUpdated: number;
  lessonsSkipped: number;
  questionsCreated: number;
  questionsSkipped: number;
  questionsFailed: number;
  errors: ValidationError[];
  warnings: ValidationError[];
  mode: "lessons_only" | "questions_only" | "combined";
}

// ─── Expected headers for relaxed validation ─────────────────────────
const LESSON_HEADERS = ["كود الدرس", "المادة", "عنوان الدرس", "المحتوى", "الملخص", "ترتيب العرض", "منشور", "مجاني", "الصف الدراسي"];
const QUESTION_HEADERS = ["كود الدرس", "نوع السؤال", "نص السؤال", "الخيار أ", "الخيار ب", "الخيار ج", "الخيار د", "الإجابة الصحيحة", "الشرح", "ترتيب العرض"];

// Keywords that identify each required column (allows wide variations)
const LESSON_KEYWORDS = ["كود", "ماد", "عنوان"]; // first 3 columns
const QUESTION_KEYWORDS = ["كود", "نوع", "نص"]; // first 3 columns

function normalizeHeader(h: string): string {
  return String(h ?? "")
    .trim()
    .replace(/\s*\(.*?\)\s*/g, "") // remove parenthesized hints
    .replace(/[\u064B-\u065F\u0670]/g, "") // remove Arabic diacritics
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function validateHeaders(actual: any[], expected: string[], sheet: string, keywords: string[]): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!actual || actual.length === 0) {
    errors.push({ row: 1, sheet, field: "headers", message: `ورقة "${sheet}" فارغة أو بدون عناوين أعمدة. تأكد من وجود صف ترويسات في الأعلى.`, severity: "error" });
    return errors;
  }
  const normalizedActual = actual.map(h => normalizeHeader(h));
  // Relaxed: only check that the keyword exists somewhere in the corresponding header cell
  for (let i = 0; i < keywords.length; i++) {
    const cell = normalizedActual[i] || "";
    if (!cell.includes(keywords[i])) {
      errors.push({
        row: 1, sheet, field: `header_${i}`,
        message: `العمود ${i + 1} في ورقة "${sheet}" يجب أن يحتوي على كلمة "${keywords[i]}" — وُجد: "${actual[i] ?? "(فارغ)"}". المتوقع: "${expected[i]}".`,
        severity: "error",
      });
    }
  }
  return errors;
}

// ─── Parser ──────────────────────────────────────────────────────────
export function parseWorkbook(data: ArrayBuffer, fileName: string) {
  const wb = fileName.endsWith(".csv")
    ? XLSX.read(new TextDecoder("utf-8").decode(data), { type: "string" })
    : XLSX.read(data, { type: "array" });

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error("الملف فارغ أو لا يحتوي على أوراق عمل");
  }

  let lessonsRows: any[][] = [];
  let questionsRows: any[][] = [];

  wb.SheetNames.forEach((name) => {
    const sheet = wb.Sheets[name];
    if (!sheet) return;
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    const nameLower = name.toLowerCase();
    if (nameLower.includes("سئلة") || nameLower.includes("question")) {
      questionsRows = rows;
    } else if (nameLower.includes("دروس") || nameLower.includes("lesson")) {
      lessonsRows = rows;
    } else if (lessonsRows.length === 0) {
      lessonsRows = rows;
    }
  });

  const mode: ImportReport["mode"] =
    lessonsRows.length > 1 && questionsRows.length > 1
      ? "combined"
      : questionsRows.length > 1
        ? "questions_only"
        : "lessons_only";

  return { lessonsRows, questionsRows, mode };
}

// ─── Validators ──────────────────────────────────────────────────────
function parseBool(val: any): boolean {
  if (typeof val === "boolean") return val;
  const s = String(val).trim().toLowerCase();
  return s === "نعم" || s === "true" || s === "1" || s === "yes";
}

export function validateLessons(rows: any[][]): { lessons: ImportLesson[]; errors: ValidationError[]; warnings: ValidationError[] } {
  const lessons: ImportLesson[] = [];
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Header validation
  if (rows.length > 0) {
    const headerErrors = validateHeaders(rows[0], LESSON_HEADERS, "الدروس");
    if (headerErrors.length > 0) {
      errors.push(...headerErrors);
      return { lessons, errors, warnings };
    }
  }

  // Track duplicates within file
  const seenCodes = new Map<string, number>();
  const seenTitles = new Map<string, number>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as any[];
    if (!row || row.every(c => c === undefined || c === null || String(c).trim() === "")) continue;

    const lessonCode = row[0] ? String(row[0]).trim() : "";
    const subjectCode = row[1] ? String(row[1]).trim() : "";
    const title = row[2] ? String(row[2]).trim() : "";

    if (!lessonCode) {
      errors.push({ row: i + 1, sheet: "الدروس", field: "lesson_code", message: "كود الدرس مطلوب" });
      continue;
    }
    if (!title) {
      errors.push({ row: i + 1, sheet: "الدروس", field: "lesson_title", message: "عنوان الدرس مطلوب" });
      continue;
    }

    // Duplicate lesson_code within same file
    if (seenCodes.has(lessonCode)) {
      errors.push({ row: i + 1, sheet: "الدروس", field: "lesson_code", message: `كود الدرس "${lessonCode}" مكرر في الملف (أول ظهور: سطر ${seenCodes.get(lessonCode)})` });
      continue;
    }
    seenCodes.set(lessonCode, i + 1);

    // Duplicate title within same subject in file
    const titleKey = `${subjectCode}::${title}`;
    if (seenTitles.has(titleKey)) {
      warnings.push({ row: i + 1, sheet: "الدروس", field: "title", message: `عنوان الدرس مكرر لنفس المادة في الملف (سطر ${seenTitles.get(titleKey)})`, severity: "warning" });
    }
    seenTitles.set(titleKey, i + 1);

    const displayOrder = row[5] !== undefined && row[5] !== "" ? Number(row[5]) : i;
    if (isNaN(displayOrder)) {
      errors.push({ row: i + 1, sheet: "الدروس", field: "display_order", message: "ترتيب العرض يجب أن يكون رقماً" });
      continue;
    }

    const gradeLevel = row[8] !== undefined && row[8] !== "" ? Number(row[8]) : null;
    if (gradeLevel !== null && (isNaN(gradeLevel) || ![1, 2, 3].includes(gradeLevel))) {
      errors.push({ row: i + 1, sheet: "الدروس", field: "grade_level", message: "الصف الدراسي يجب أن يكون 1 أو 2 أو 3" });
      continue;
    }

    lessons.push({
      lesson_code: lessonCode,
      subject_code: subjectCode,
      title,
      content: row[3] ? String(row[3]) : "",
      summary: row[4] ? String(row[4]) : "",
      display_order: displayOrder,
      is_published: parseBool(row[6]),
      grade_level: gradeLevel,
      sourceRow: i + 1,
    });
  }
  return { lessons, errors, warnings };
}

export function validateQuestions(rows: any[][]): { questions: ImportQuestion[]; errors: ValidationError[]; warnings: ValidationError[] } {
  const questions: ImportQuestion[] = [];
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Header validation
  if (rows.length > 0) {
    const headerErrors = validateHeaders(rows[0], QUESTION_HEADERS, "الأسئلة");
    if (headerErrors.length > 0) {
      errors.push(...headerErrors);
      return { questions, errors, warnings };
    }
  }

  // Track duplicates within file
  const seenQuestions = new Map<string, number>();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as any[];
    if (!row || row.every(c => c === undefined || c === null || String(c).trim() === "")) continue;

    const lessonCode = row[0] ? String(row[0]).trim() : "";
    const rawType = row[1] ? String(row[1]).trim().toLowerCase() : "multiple_choice";
    const questionText = row[2] ? String(row[2]).trim() : "";
    const correctAnswer = row[7] ? String(row[7]).trim().toLowerCase() : "";

    if (!lessonCode) {
      errors.push({ row: i + 1, sheet: "الأسئلة", field: "lesson_code", message: "كود الدرس مطلوب" });
      continue;
    }
    if (!questionText) {
      errors.push({ row: i + 1, sheet: "الأسئلة", field: "question_text", message: "نص السؤال مطلوب" });
      continue;
    }

    // Normalize question_type (handle common variants)
    let questionType = rawType;
    if (["tf", "true_false", "truefalse", "صح_خطأ", "صح/خطأ", "صح وخطأ", "صح و خطأ"].includes(rawType)) {
      questionType = "true_false";
    } else if (["mc", "multiple_choice", "multiplechoice", "اختيار", "اختيار_متعدد", "اختيار متعدد"].includes(rawType)) {
      questionType = "multiple_choice";
    }

    if (!["multiple_choice", "true_false"].includes(questionType)) {
      errors.push({ row: i + 1, sheet: "الأسئلة", field: "question_type", message: `نوع السؤال غير صالح: "${rawType}". يجب أن يكون multiple_choice أو true_false` });
      continue;
    }

    // Duplicate question within same lesson in file
    const dupeKey = `${lessonCode}::${questionText}`;
    if (seenQuestions.has(dupeKey)) {
      warnings.push({ row: i + 1, sheet: "الأسئلة", field: "question_text", message: `سؤال مكرر لنفس الدرس في الملف (سطر ${seenQuestions.get(dupeKey)})`, severity: "warning" });
    }
    seenQuestions.set(dupeKey, i + 1);

    const optionA = row[3] ? String(row[3]).trim() : "";
    const optionB = row[4] ? String(row[4]).trim() : "";
    const optionC = row[5] ? String(row[5]).trim() : "";
    const optionD = row[6] ? String(row[6]).trim() : "";

    if (questionType === "multiple_choice") {
      if (!optionA || !optionB || !optionC || !optionD) {
        errors.push({ row: i + 1, sheet: "الأسئلة", field: "options", message: "جميع الخيارات الأربعة مطلوبة لسؤال الاختيار من متعدد" });
        continue;
      }
      if (!["a", "b", "c", "d"].includes(correctAnswer)) {
        errors.push({ row: i + 1, sheet: "الأسئلة", field: "correct_answer", message: `الإجابة "${correctAnswer}" غير صالحة. يجب أن تكون a, b, c, أو d` });
        continue;
      }
    } else {
      if (!optionA && !optionB) {
        // Auto-fill for true/false
      }
      const validTF = ["a", "b", "true", "false", "صح", "خطأ"];
      if (!validTF.includes(correctAnswer)) {
        errors.push({ row: i + 1, sheet: "الأسئلة", field: "correct_answer", message: `الإجابة "${correctAnswer}" غير صالحة. يجب أن تكون a/b أو true/false أو صح/خطأ` });
        continue;
      }
    }

    let normalizedAnswer = correctAnswer;
    if (questionType === "true_false") {
      if (correctAnswer === "true" || correctAnswer === "صح") normalizedAnswer = "a";
      else if (correctAnswer === "false" || correctAnswer === "خطأ") normalizedAnswer = "b";
    }

    const displayOrder = row[9] !== undefined && row[9] !== "" ? Number(row[9]) : i;

    questions.push({
      lesson_code: lessonCode,
      question_type: questionType,
      question_text: questionText,
      option_a: questionType === "true_false" ? "صح" : optionA,
      option_b: questionType === "true_false" ? "خطأ" : optionB,
      option_c: questionType === "true_false" ? "" : optionC,
      option_d: questionType === "true_false" ? "" : optionD,
      correct_answer: normalizedAnswer,
      explanation: row[8] ? String(row[8]) : "",
      display_order: isNaN(displayOrder) ? i : displayOrder,
      sourceRow: i + 1,
    });
  }
  return { questions, errors, warnings };
}

// ─── Import Engine (SUBJECT-BASED, NO COLLEGE DUPLICATION) ───────────
export async function executeImport(opts: {
  lessonsRows: any[][];
  questionsRows: any[][];
  subjects: ImportSubject[];
  existingLessons: { id: string; title: string; lesson_code: string | null; subject_id: string | null }[];
  existingQuestions: { id: string; lesson_id: string; question_text: string }[];
  fallbackSubjectId?: string;
}): Promise<ImportReport> {
  const { lessonsRows, questionsRows, subjects, existingLessons, existingQuestions, fallbackSubjectId } = opts;

  const report: ImportReport = {
    lessonsCreated: 0,
    lessonsUpdated: 0,
    lessonsSkipped: 0,
    questionsCreated: 0,
    questionsSkipped: 0,
    questionsFailed: 0,
    errors: [],
    warnings: [],
    mode: lessonsRows.length > 1 && questionsRows.length > 1 ? "combined" : questionsRows.length > 1 ? "questions_only" : "lessons_only",
  };

  // Validate
  let validatedLessons: ImportLesson[] = [];
  let validatedQuestions: ImportQuestion[] = [];

  if (lessonsRows.length > 1) {
    const { lessons, errors, warnings } = validateLessons(lessonsRows);
    validatedLessons = lessons;
    report.errors.push(...errors);
    report.warnings.push(...warnings);
  }
  if (questionsRows.length > 1) {
    const { questions, errors, warnings } = validateQuestions(questionsRows);
    validatedQuestions = questions;
    report.errors.push(...errors);
    report.warnings.push(...warnings);
  }

  // Abort if there are critical errors in validation
  if (report.errors.length > 0) {
    return report;
  }

  // Build subject lookup maps
  const subjectByCode = new Map<string, string>();
  const subjectByName = new Map<string, string>();
  subjects.forEach(s => {
    subjectByCode.set(s.code.toLowerCase(), s.id);
    subjectByName.set(s.name_ar, s.id);
  });

  // Global lesson_code → lesson_id map
  const codeToId = new Map<string, string>();
  existingLessons
    .filter(l => l.lesson_code)
    .forEach(l => codeToId.set(l.lesson_code!, l.id));

  // Global title+subject → lesson_id fallback map (safer than title-only)
  const titleSubjectToId = new Map<string, string>();
  existingLessons.forEach(l => {
    const key = `${(l.subject_id || "")}::${l.title.trim()}`;
    titleSubjectToId.set(key, l.id);
  });

  // Import lessons — ONE lesson per lesson_code, globally shared
  for (const lesson of validatedLessons) {
    // Resolve subject first — needed for dedup and insert
    const subjectId = lesson.subject_code
      ? (subjectByCode.get(lesson.subject_code.toLowerCase()) || subjectByName.get(lesson.subject_code) || null)
      : null;
    const resolvedSubjectId = subjectId || fallbackSubjectId || null;

    if (!resolvedSubjectId) {
      report.errors.push({ row: lesson.sourceRow, sheet: "الدروس", field: "subject_code", message: `المادة "${lesson.subject_code}" غير موجودة في النظام` });
      continue;
    }

    // Duplicate check by lesson_code (GLOBAL)
    if (codeToId.has(lesson.lesson_code)) {
      report.lessonsSkipped++;
      continue;
    }

    // Duplicate check by title within same subject (safer fallback)
    const titleKey = `${resolvedSubjectId}::${lesson.title}`;
    const existingByTitleId = titleSubjectToId.get(titleKey);
    if (existingByTitleId) {
      // Update existing lesson's lesson_code for future linking
      await supabase.from("lessons").update({ lesson_code: lesson.lesson_code }).eq("id", existingByTitleId);
      codeToId.set(lesson.lesson_code, existingByTitleId);
      report.lessonsUpdated++;
      continue;
    }

    const { data: inserted, error } = await supabase.from("lessons").insert({
      lesson_code: lesson.lesson_code,
      title: lesson.title,
      content: lesson.content,
      summary: lesson.summary,
      display_order: lesson.display_order,
      is_published: lesson.is_published,
      grade_level: lesson.grade_level,
      subject_id: resolvedSubjectId,
      college_id: null,
      major_id: null,
    }).select("id").single();

    if (error) {
      report.errors.push({ row: lesson.sourceRow, sheet: "الدروس", field: "insert", message: `خطأ في إدراج "${lesson.title}": ${error.message}` });
    } else if (inserted) {
      codeToId.set(lesson.lesson_code, inserted.id);
      titleSubjectToId.set(titleKey, inserted.id);
      report.lessonsCreated++;
    }
  }

  // Import questions
  const unresolvedCodes = new Set<string>();
  for (const q of validatedQuestions) {
    const lessonId = codeToId.get(q.lesson_code);
    if (!lessonId) {
      if (!unresolvedCodes.has(q.lesson_code)) {
        report.errors.push({ row: q.sourceRow, sheet: "الأسئلة", field: "lesson_code", message: `لم يتم العثور على درس بكود "${q.lesson_code}"` });
        unresolvedCodes.add(q.lesson_code);
      }
      report.questionsFailed++;
      continue;
    }
    await importQuestion(q, lessonId, existingQuestions, report);
  }

  return report;
}

async function importQuestion(
  q: ImportQuestion,
  lessonId: string,
  existingQuestions: { id: string; lesson_id: string; question_text: string }[],
  report: ImportReport
) {
  const isDuplicate = existingQuestions.some(
    eq => eq.lesson_id === lessonId && eq.question_text.trim() === q.question_text
  );
  if (isDuplicate) {
    report.questionsSkipped++;
    return;
  }

  const { error } = await supabase.from("questions").insert({
    lesson_id: lessonId,
    question_text: q.question_text,
    question_type: q.question_type,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    correct_option: q.correct_answer,
    explanation: q.explanation,
    display_order: q.display_order,
    subject: "general",
  });

  if (error) {
    report.errors.push({ row: q.sourceRow, sheet: "الأسئلة", field: "insert", message: `خطأ في إدراج سؤال (سطر ${q.sourceRow}): ${error.message}` });
    report.questionsFailed++;
  } else {
    report.questionsCreated++;
    existingQuestions.push({ id: "", lesson_id: lessonId, question_text: q.question_text });
  }
}

// ─── Unified Template Generator ──────────────────────────────────────
export function downloadUnifiedTemplate(subjects: ImportSubject[]) {
  const wb = XLSX.utils.book_new();
  const subjectNames = subjects.map(s => s.name_ar).join(" / ");

  const lessonsData = [
    [
      "كود الدرس",
      `المادة (${subjectNames || "اختياري"})`,
      "عنوان الدرس",
      "المحتوى",
      "الملخص",
      "ترتيب العرض",
      "منشور (نعم/لا)",
      "مجاني (نعم/لا)",
      "الصف الدراسي (1/2/3)",
    ],
    ["L001", subjects[0]?.name_ar || "", "مقدمة في البرمجة", "محتوى الدرس هنا...", "ملخص قصير", 1, "نعم", "لا", ""],
    ["L002", subjects[0]?.name_ar || "", "المتغيرات والثوابت", "محتوى الدرس...", "ملخص...", 2, "نعم", "لا", ""],
  ];

  const questionsData = [
    [
      "كود الدرس",
      "نوع السؤال (multiple_choice / true_false)",
      "نص السؤال",
      "الخيار أ",
      "الخيار ب",
      "الخيار ج",
      "الخيار د",
      "الإجابة الصحيحة (a/b/c/d)",
      "الشرح",
      "ترتيب العرض",
    ],
    ["L001", "multiple_choice", "ما هي لغة البرمجة؟", "أداة تصميم", "لغة حاسوب", "جهاز", "شبكة", "b", "لغة البرمجة هي لغة يفهمها الحاسوب", 1],
    ["L001", "true_false", "الأرض مسطحة", "صح", "خطأ", "", "", "b", "الأرض كروية الشكل", 2],
    ["L002", "multiple_choice", "ما هو المتغير؟", "ثابت", "مكان في الذاكرة", "عملية حسابية", "نوع بيانات", "b", "المتغير هو مكان في الذاكرة لتخزين البيانات", 1],
  ];

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lessonsData), "الدروس");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(questionsData), "الأسئلة");
  XLSX.writeFile(wb, "قالب_الاستيراد_الموحد.xlsx");
}
