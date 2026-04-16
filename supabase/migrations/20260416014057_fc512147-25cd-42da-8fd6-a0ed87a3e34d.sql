
-- Add direct question columns to past_exam_model_questions
ALTER TABLE public.past_exam_model_questions
  ADD COLUMN IF NOT EXISTS q_text text,
  ADD COLUMN IF NOT EXISTS q_option_a text,
  ADD COLUMN IF NOT EXISTS q_option_b text,
  ADD COLUMN IF NOT EXISTS q_option_c text,
  ADD COLUMN IF NOT EXISTS q_option_d text,
  ADD COLUMN IF NOT EXISTS q_correct text DEFAULT 'a',
  ADD COLUMN IF NOT EXISTS q_explanation text DEFAULT '';

-- Make question_id nullable (no longer required for direct questions)
ALTER TABLE public.past_exam_model_questions
  ALTER COLUMN question_id DROP NOT NULL;
