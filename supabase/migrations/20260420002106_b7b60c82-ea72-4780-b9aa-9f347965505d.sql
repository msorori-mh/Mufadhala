CREATE OR REPLACE FUNCTION public.get_top_repeated_past_questions_for_students(
  _university_id uuid DEFAULT NULL,
  _year integer DEFAULT NULL,
  _min_count integer DEFAULT 2,
  _limit integer DEFAULT 200
)
RETURNS TABLE(
  normalized_hash text,
  sample_text text,
  occurrence_count bigint,
  models jsonb,
  linked_lesson_id uuid
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      md5(public.normalize_arabic_question(pmq.q_text)) AS h,
      trim(pmq.q_text) AS q_text,
      m.id   AS model_id,
      m.title AS model_title,
      m.year AS model_year,
      u.name_ar AS university_name,
      u.id AS university_id,
      q.lesson_id AS lesson_id
    FROM public.past_exam_model_questions pmq
    JOIN public.past_exam_models m ON m.id = pmq.model_id
    LEFT JOIN public.universities u ON u.id = m.university_id
    LEFT JOIN public.questions q ON q.id = pmq.question_id
    WHERE pmq.q_text IS NOT NULL
      AND length(trim(pmq.q_text)) >= 8
      AND m.is_published = true
      AND (_university_id IS NULL OR m.university_id = _university_id)
      AND (_year IS NULL OR m.year = _year)
  )
  SELECT
    b.h,
    (array_agg(b.q_text ORDER BY length(b.q_text) DESC))[1],
    count(DISTINCT b.model_id)::bigint,
    jsonb_agg(DISTINCT jsonb_build_object(
      'model_id', b.model_id,
      'title', b.model_title,
      'year', b.model_year,
      'university_id', b.university_id,
      'university_name', b.university_name
    )),
    (array_agg(b.lesson_id) FILTER (WHERE b.lesson_id IS NOT NULL))[1]
  FROM base b
  GROUP BY b.h
  HAVING count(DISTINCT b.model_id) >= GREATEST(_min_count, 2)
  ORDER BY count(DISTINCT b.model_id) DESC
  LIMIT _limit;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_top_repeated_past_questions_for_students(uuid, integer, integer, integer) TO authenticated;