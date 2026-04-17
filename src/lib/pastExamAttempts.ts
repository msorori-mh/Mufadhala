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

export interface ModeAttemptStats {
  attempts: number;
  avgPct: number;
  bestPct: number;
  lastPcts: number[]; // chronological, oldest -> newest, max 5
}

export interface ModelAttemptStats {
  training: ModeAttemptStats;
  strict: ModeAttemptStats;
}

const emptyStats = (): ModeAttemptStats => ({ attempts: 0, avgPct: 0, bestPct: 0, lastPcts: [] });

export const fetchModelAttemptStats = async (
  studentId: string,
  modelId: string
): Promise<ModelAttemptStats> => {
  const { data, error } = await (supabase as any)
    .from("past_exam_attempts")
    .select("mode, score, total, completed_at")
    .eq("student_id", studentId)
    .eq("model_id", modelId)
    .order("completed_at", { ascending: true });

  if (error || !data) {
    return { training: emptyStats(), strict: emptyStats() };
  }

  const buildStats = (rows: any[]): ModeAttemptStats => {
    if (!rows.length) return emptyStats();
    const pcts = rows
      .map((r) => (r.total > 0 ? Math.round((r.score / r.total) * 100) : 0));
    const avg = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
    const best = Math.max(...pcts);
    return {
      attempts: rows.length,
      avgPct: avg,
      bestPct: best,
      lastPcts: pcts.slice(-5),
    };
  };

  return {
    training: buildStats(data.filter((r: any) => r.mode === "training")),
    strict: buildStats(data.filter((r: any) => r.mode === "strict")),
  };
};
