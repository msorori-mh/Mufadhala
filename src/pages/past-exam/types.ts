export type PastExamMode = "select" | "training" | "strict_intro" | "strict_active" | "strict_finished";

export interface PastExamQuestion {
  id: string;
  q_text: string | null;
  q_option_a: string | null;
  q_option_b: string | null;
  q_option_c: string | null;
  q_option_d: string | null;
  q_correct: string | null;
  q_explanation: string | null;
  order_index: number;
}

export interface PastExamModelInfo {
  id: string;
  title: string;
  year: number;
  is_paid: boolean;
  is_published: boolean;
  university_id: string;
  duration_minutes: number | null;
  suggested_duration_minutes?: number | null;
}

export const OPTION_LABELS: Record<string, string> = { a: "أ", b: "ب", c: "ج", d: "د" };
