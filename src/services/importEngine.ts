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
  is_free: boolean;
  grade_level: number | null;
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
}

export interface ValidationError {
  row: number;
  sheet: string;
  field: string;
  message: string;
}

export interface ImportReport {
  lessonsCreated: number;
  lessonsSkipped: number;
  questionsCreated: number;
  questionsSkipped: number;
  errors: ValidationError[];
  mode: "lessons_only" | "questions_only" | "combined";
}

// ─── Parser ──────────────────────────────────────────────────────────
export function parseWorkbook(data: ArrayBuffer, fileName: string) {
  const wb = fileName.endsWith(".csv")
    ? XLSX.read(new TextDecoder("utf-8").decode(data), { type: "string" })
    : XLSX.read(data, { type: "array" });

  let lessonsRows: any[][] = [];
  let questionsRows: any[][] = [];

  wb.SheetNames.forEach((name) => {
    const sheet = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
    const nameLower = name.toLowerCase();
    if (nameLower.includes("سئلة") || nameLower.includes("question")) {
      questionsRows = rows;
    } else if (nameLower.includes("دروس") || nameLower.includes("lesson")) {
      lessonsRows = rows;
    } else if (lessonsRows.length === 0) {
      // First unnamed sheet → check column count to guess
      if (rows[0] && (rows[0] as any[]).length >= 9) {
        lessonsRows = rows;
      } else {
        lessonsRows = rows;
      }
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

export function validateLessons(rows: any[][]): { lessons: ImportLesson[]; errors: ValidationError[] } {
  const lessons: ImportLesson[] = [];
  const errors: ValidationError[] = [];

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

    const displayOrder = row[5] !== undefined && row[5] !== "" ? Number(row[5]) : i;
    if (isNaN(displayOrder)) {
      errors.push({ row: i + 1, sheet: "الدروس", field: "display_order", message: "ترتيب العرض يجب أن يكون رقماً" });
      continue;
    }

    const gradeLevel = row[8] !== undefined && row[8] !== "" ? Number(row[8]) : null;
    if (gradeLevel !== null && (isNaN(gradeLevel) || gradeLevel < 1 || gradeLevel > 3)) {
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
      is_free: parseBool(row[7]),
      grade_level: gradeLevel,
    });
  }
  return { lessons, errors };
}

export function validateQuestions(rows: any[][]): { questions: ImportQuestion[]; errors: ValidationError[] } {
  const questions: ImportQuestion[] = [];
  const errors: ValidationError[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as any[];
    if (!row || row.every(c => c === undefined || c === null || String(c).trim() === "")) continue;

    const lessonCode = row[0] ? String(row[0]).trim() : "";
    const questionType = row[1] ? String(row[1]).trim().toLowerCase() : "multiple_choice";
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
    if (!["multiple_choice", "true_false"].includes(questionType)) {
      errors.push({ row: i + 1, sheet: "الأسئلة", field: "question_type", message: "نوع السؤال يجب أن يكون multiple_choice أو true_false" });
      continue;
    }

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
        errors.push({ row: i + 1, sheet: "الأسئلة", field: "correct_answer", message: "الإجابة يجب أن تكون a, b, c, أو d" });
        continue;
      }
    } else {
      // true_false
      const validTF = ["a", "b", "true", "false", "صح", "خطأ"];
      if (!validTF.includes(correctAnswer)) {
        errors.push({ row: i + 1, sheet: "الأسئلة", field: "correct_answer", message: "الإجابة يجب أن تكون a/b أو true/false أو صح/خطأ" });
        continue;
      }
    }

    // Normalize correct_answer for true_false
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
    });
  }
  return { questions, errors };
}

// ─── Import Engine ───────────────────────────────────────────────────
export async function executeImport(opts: {
  lessonsRows: any[][];
  questionsRows: any[][];
  collegeIds: string[];
  subjects: ImportSubject[];
  existingLessons: { id: string; college_id: string | null; title: string; lesson_code: string | null }[];
  existingQuestions: { id: string; lesson_id: string; question_text: string }[];
  fallbackSubjectId?: string;
}): Promise<ImportReport> {
  const { lessonsRows, questionsRows, collegeIds, subjects, existingLessons, existingQuestions, fallbackSubjectId } = opts;

  const report: ImportReport = {
    lessonsCreated: 0,
    lessonsSkipped: 0,
    questionsCreated: 0,
    questionsSkipped: 0,
    errors: [],
    mode: lessonsRows.length > 1 && questionsRows.length > 1 ? "combined" : questionsRows.length > 1 ? "questions_only" : "lessons_only",
  };

  // Validate
  let validatedLessons: ImportLesson[] = [];
  let validatedQuestions: ImportQuestion[] = [];

  if (lessonsRows.length > 1) {
    const { lessons, errors } = validateLessons(lessonsRows);
    validatedLessons = lessons;
    report.errors.push(...errors);
  }
  if (questionsRows.length > 1) {
    const { questions, errors } = validateQuestions(questionsRows);
    validatedQuestions = questions;
    report.errors.push(...errors);
  }

  // Process per college
  for (const collegeId of collegeIds) {
    // lesson_code → lesson_id map for this college
    const codeToId = new Map<string, string>();

    // Pre-populate from existing lessons
    existingLessons
      .filter(l => l.college_id === collegeId && l.lesson_code)
      .forEach(l => codeToId.set(l.lesson_code!, l.id));

    // Also map by title as fallback
    const titleToId = new Map<string, string>();
    existingLessons
      .filter(l => l.college_id === collegeId)
      .forEach(l => titleToId.set(l.title.trim(), l.id));

    // Import lessons
    for (const lesson of validatedLessons) {
      // Duplicate check by lesson_code
      if (codeToId.has(lesson.lesson_code)) {
        report.lessonsSkipped++;
        continue;
      }
      // Duplicate check by title
      if (titleToId.has(lesson.title)) {
        // Update existing lesson's lesson_code
        const existingId = titleToId.get(lesson.title)!;
        await supabase.from("lessons").update({ lesson_code: lesson.lesson_code }).eq("id", existingId);
        codeToId.set(lesson.lesson_code, existingId);
        report.lessonsSkipped++;
        continue;
      }

      // Resolve subject
      const matchedSubject = lesson.subject_code
        ? subjects.find(s => s.name_ar === lesson.subject_code || s.code === lesson.subject_code)
        : null;
      const subjectId = fallbackSubjectId || matchedSubject?.id || null;

      const { data: inserted, error } = await supabase.from("lessons").insert({
        college_id: collegeId,
        lesson_code: lesson.lesson_code,
        title: lesson.title,
        content: lesson.content,
        summary: lesson.summary,
        display_order: lesson.display_order,
        is_published: lesson.is_published,
        is_free: lesson.is_free,
        grade_level: lesson.grade_level,
        subject_id: subjectId,
      }).select("id").single();

      if (error) {
        report.errors.push({ row: 0, sheet: "الدروس", field: "insert", message: `خطأ في "${lesson.title}": ${error.message}` });
      } else if (inserted) {
        codeToId.set(lesson.lesson_code, inserted.id);
        titleToId.set(lesson.title, inserted.id);
        report.lessonsCreated++;
      }
    }

    // Import questions
    for (const q of validatedQuestions) {
      const lessonId = codeToId.get(q.lesson_code);
      if (!lessonId) {
        // Try title match as last resort (for backward compat with existing lessons without lesson_code)
        const byTitle = titleToId.get(q.lesson_code);
        if (!byTitle) {
          report.errors.push({ row: 0, sheet: "الأسئلة", field: "lesson_code", message: `لم يتم العثور على درس بكود "${q.lesson_code}"` });
          continue;
        }
        // Use title match
        const resolvedId = byTitle;
        await importQuestion(q, resolvedId, existingQuestions, report);
        continue;
      }
      await importQuestion(q, lessonId, existingQuestions, report);
    }
  }

  return report;
}

async function importQuestion(
  q: ImportQuestion,
  lessonId: string,
  existingQuestions: { id: string; lesson_id: string; question_text: string }[],
  report: ImportReport
) {
  // Duplicate check
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
    report.errors.push({ row: 0, sheet: "الأسئلة", field: "insert", message: `خطأ في سؤال: ${error.message}` });
  } else {
    report.questionsCreated++;
    // Add to existing to prevent within-batch duplicates
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
