
-- Function: get most repeated questions across past exam models
CREATE OR REPLACE FUNCTION public.get_top_repeated_questions(
  _university_id uuid DEFAULT NULL,
  _limit integer DEFAULT 50
)
RETURNS TABLE(
  question_id uuid,
  question_text text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  correct_option text,
  explanation text,
  question_type text,
  repeat_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    q.id AS question_id,
    q.question_text,
    q.option_a,
    q.option_b,
    q.option_c,
    q.option_d,
    q.correct_option,
    q.explanation,
    q.question_type,
    COUNT(DISTINCT pmq.model_id) AS repeat_count
  FROM public.past_exam_model_questions pmq
  JOIN public.past_exam_models m ON m.id = pmq.model_id AND m.is_published = true
  JOIN public.questions q ON q.id = pmq.question_id
  WHERE (_university_id IS NULL OR m.university_id = _university_id)
  GROUP BY q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.explanation, q.question_type
  HAVING COUNT(DISTINCT pmq.model_id) >= 2
  ORDER BY repeat_count DESC
  LIMIT _limit;
$$;
