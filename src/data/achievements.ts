import { Trophy, Target, BookOpen, Flame, Star, Zap, Award, Crown, Medal, GraduationCap } from "lucide-react";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: typeof Trophy;
  color: string;
  bgColor: string;
  check: (stats: AchievementStats) => boolean;
}

export interface AchievementStats {
  totalExams: number;
  avgScore: number;
  bestScore: number;
  completedLessons: number;
  totalLessons: number;
}

export const achievements: Achievement[] = [
  {
    id: "first_exam",
    title: "الخطوة الأولى",
    description: "أكمل أول اختبار",
    icon: Zap,
    color: "text-blue-500",
    bgColor: "bg-blue-500/15",
    check: (s) => s.totalExams >= 1,
  },
  {
    id: "five_exams",
    title: "المثابر",
    description: "أكمل 5 اختبارات",
    icon: Flame,
    color: "text-orange-500",
    bgColor: "bg-orange-500/15",
    check: (s) => s.totalExams >= 5,
  },
  {
    id: "ten_exams",
    title: "المتمرّس",
    description: "أكمل 10 اختبارات",
    icon: Target,
    color: "text-red-500",
    bgColor: "bg-red-500/15",
    check: (s) => s.totalExams >= 10,
  },
  {
    id: "twenty_exams",
    title: "المحترف",
    description: "أكمل 20 اختبار",
    icon: Crown,
    color: "text-purple-500",
    bgColor: "bg-purple-500/15",
    check: (s) => s.totalExams >= 20,
  },
  {
    id: "score_60",
    title: "على الطريق",
    description: "حقق معدل 60% أو أعلى",
    icon: Star,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/15",
    check: (s) => s.totalExams >= 1 && s.avgScore >= 60,
  },
  {
    id: "score_80",
    title: "متفوق",
    description: "حقق معدل 80% أو أعلى",
    icon: Award,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/15",
    check: (s) => s.totalExams >= 1 && s.avgScore >= 80,
  },
  {
    id: "score_90",
    title: "نجم قَبُول",
    description: "حقق معدل 90% أو أعلى",
    icon: Trophy,
    color: "text-amber-500",
    bgColor: "bg-amber-500/15",
    check: (s) => s.totalExams >= 1 && s.avgScore >= 90,
  },
  {
    id: "perfect_score",
    title: "الكمال",
    description: "حقق 100% في اختبار واحد",
    icon: Medal,
    color: "text-pink-500",
    bgColor: "bg-pink-500/15",
    check: (s) => s.bestScore >= 100,
  },
  {
    id: "first_lesson",
    title: "القارئ",
    description: "أكمل أول درس",
    icon: BookOpen,
    color: "text-teal-500",
    bgColor: "bg-teal-500/15",
    check: (s) => s.completedLessons >= 1,
  },
  {
    id: "all_lessons",
    title: "خاتم المنهج",
    description: "أكمل جميع الدروس المتاحة",
    icon: GraduationCap,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/15",
    check: (s) => s.totalLessons > 0 && s.completedLessons >= s.totalLessons,
  },
];

export function getUnlockedAchievements(stats: AchievementStats) {
  return achievements.map((a) => ({
    ...a,
    unlocked: a.check(stats),
  }));
}
