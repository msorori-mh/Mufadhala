import { supabase } from "@/integrations/supabase/client";

export interface SavePastExamAttemptParams {
  studentId: string;
  modelId: string;
  mode: "training" | "strict";
  score: number;
  total: number;
  blankCount: number;
  elapsedSeconds: number;
  answers: Record<number, string>;
}

export const savePastExamAttempt = async (params: SavePastExamAttemptParams) => {
  const { error } = await (supabase as any).from("past_exam_attempts").insert({
    student_id: params.studentId,
    model_id: params.modelId,
    mode: params.mode,
    score: params.score,
    total: params.total,
    blank_count: params.blankCount,
    elapsed_seconds: params.elapsedSeconds,
    answers: params.answers,
  });
  if (error) console.error("[savePastExamAttempt]", error);
  return { error };
};
