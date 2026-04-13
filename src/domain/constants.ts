/**
 * Shared domain constants — single source of truth.
 */

export const GOVERNORATES = [
  "أمانة العاصمة", "عدن", "تعز", "الحديدة", "إب", "ذمار", "حجة",
  "صعدة", "عمران", "صنعاء", "المحويت", "ريمة", "البيضاء", "مأرب",
  "الجوف", "شبوة", "حضرموت", "المهرة", "أبين", "لحج", "الضالع", "سقطرى",
];

export const ZONE_A_GOVERNORATES = [
  "صنعاء", "أمانة العاصمة", "عمران", "ذمار", "إب", "الحديدة",
  "صعدة", "حجة", "المحويت", "ريمة",
];

export const ZONE_B_GOVERNORATES = [
  "عدن", "تعز", "لحج", "أبين", "الضالع", "شبوة",
  "حضرموت", "المهرة", "مأرب", "الجوف", "البيضاء", "سقطرى",
];

export const YEMEN_PHONE_REGEX = /^7[0-9]{8}$/;

export const isValidYemeniPhone = (p: string) => !p || YEMEN_PHONE_REGEX.test(p);

export const GRADE_LABELS: Record<number, string> = {
  1: "مقرر الصف الأول الثانوي",
  2: "مقرر الصف الثاني الثانوي",
  3: "مقرر الصف الثالث الثانوي",
};

export const GRADE_LABELS_SHORT: Record<number, string> = {
  1: "أول ثانوي",
  2: "ثاني ثانوي",
  3: "ثالث ثانوي",
};
