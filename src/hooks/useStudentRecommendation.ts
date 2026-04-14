import { useMemo } from "react";

export type RecommendationState =
  | "new_student"
  | "started_not_progressed"
  | "should_practice"
  | "active_student"
  | "no_content";

export interface StudentRecommendation {
  state: RecommendationState;
  title: string;
  message: string;
  ctaLabel: string;
  targetRoute: string;
}

interface RecommendationInput {
  completedLessons: number;
  totalLessons: number;
  totalExams: number;
  /** Number of lessons the student has opened / has any progress on */
  lessonsStarted: number;
}

/**
 * Pure function that resolves the primary dashboard recommendation
 * based on the student's actual learning progress — NOT subscription status.
 */
export function resolveRecommendation(input: RecommendationInput): StudentRecommendation {
  const { completedLessons, totalLessons, totalExams, lessonsStarted } = input;

  // STATE 5 — No available content
  if (totalLessons === 0) {
    return {
      state: "no_content",
      title: "سيتم إضافة المحتوى قريباً",
      message: "لا توجد دروس منشورة حالياً لمسارك، يرجى العودة لاحقاً",
      ctaLabel: "عرض الدروس",
      targetRoute: "/lessons",
    };
  }

  // STATE 1 — New student, never opened a lesson or taken an exam
  if (completedLessons === 0 && lessonsStarted === 0 && totalExams === 0) {
    return {
      state: "new_student",
      title: "ابدأ أول درس الآن",
      message: "ابدأ رحلتك من أول درس مخصص لمسارك",
      ctaLabel: "عرض الدرس",
      targetRoute: "/lessons",
    };
  }

  // STATE 2 — Started but hasn't completed any lesson yet
  if (completedLessons === 0 && (lessonsStarted > 0 || totalExams > 0)) {
    return {
      state: "started_not_progressed",
      title: "أكمل رحلتك التعليمية",
      message: "لقد بدأت بالفعل — أكمل الدرس التالي وواصل التقدم",
      ctaLabel: "أكمل الآن",
      targetRoute: "/lessons",
    };
  }

  // STATE 3 — Completed lesson(s) but never practiced (no exams)
  if (completedLessons > 0 && totalExams === 0) {
    return {
      state: "should_practice",
      title: "اختبر نفسك الآن",
      message: "طبّق ما تعلمته من خلال أسئلة هذا الدرس",
      ctaLabel: "ابدأ التدريب",
      targetRoute: "/exam",
    };
  }

  // STATE 4 — Active student (has completed lessons AND taken exams)
  if (completedLessons < totalLessons) {
    return {
      state: "active_student",
      title: "واصل تقدمك",
      message: `أنت تتقدم جيداً — ${totalLessons - completedLessons} درس متبقي`,
      ctaLabel: "الدرس التالي",
      targetRoute: "/lessons",
    };
  }

  // All lessons completed — encourage more practice
  return {
    state: "active_student",
    title: "أكملت جميع الدروس! 🎉",
    message: "واصل التدريب على الاختبارات لتعزيز مستواك",
    ctaLabel: "اختبار جديد",
    targetRoute: "/exam",
  };
}

/**
 * Hook wrapper for the recommendation resolver.
 */
export function useStudentRecommendation(input: RecommendationInput): StudentRecommendation {
  return useMemo(() => resolveRecommendation(input), [
    input.completedLessons,
    input.totalLessons,
    input.totalExams,
    input.lessonsStarted,
  ]);
}
