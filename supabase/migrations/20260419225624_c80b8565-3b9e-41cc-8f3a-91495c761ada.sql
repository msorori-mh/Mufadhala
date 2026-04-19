-- 1. Normalization function (pure text cleanup, immutable)
CREATE OR REPLACE FUNCTION public.normalize_arabic_question(_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT
    -- collapse remaining whitespace
    regexp_replace(
      -- remove punctuation/symbols (keep letters, digits, spaces)
      regexp_replace(
        -- unify hamza/alef/yaa/taa marbuta
        translate(
          -- strip Arabic diacritics (tashkeel) U+064B..U+0652 + tatweel U+0640
          regexp_replace(
            lower(coalesce(_text, '')),
            '[\u064B-\u0652\u0670\u0640]',
            '',
            'g'
          ),
          'إأآٱىيةؤئ',
          'اااايهوي'
        ),
        '[^\u0600-\u06FF a-z0-9]',
        ' ',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    )
$$;

-- 2. RPC: get repeated past-exam questions with model details
CREATE OR REPLACE FUNCTION public.get_repeated_past_questions(
  _university_id uuid DEFAULT NULL,
  _year integer DEFAULT NULL,
  _min_count integer DEFAULT 2,
  _limit integer DEFAULT 200
)
RETURNS TABLE(
  normalized_hash text,
  sample_text text,
  occurrence_count bigint,
  models jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      md5(public.normalize_arabic_question(pmq.q_text)) AS h,
      trim(pmq.q_text) AS q_text,
      m.id   AS model_id,
      m.title AS model_title,
      m.year AS model_year,
      u.name_ar AS university_name,
      u.id AS university_id
    FROM public.past_exam_model_questions pmq
    JOIN public.past_exam_models m ON m.id = pmq.model_id
    LEFT JOIN public.universities u ON u.id = m.university_id
    WHERE pmq.q_text IS NOT NULL
      AND length(trim(pmq.q_text)) >= 8
      AND m.is_published = true
      AND (_university_id IS NULL OR m.university_id = _university_id)
      AND (_year IS NULL OR m.year = _year)
  )
  SELECT
    b.h AS normalized_hash,
    (array_agg(b.q_text ORDER BY length(b.q_text) DESC))[1] AS sample_text,
    count(DISTINCT b.model_id)::bigint AS occurrence_count,
    jsonb_agg(DISTINCT jsonb_build_object(
      'model_id', b.model_id,
      'title', b.model_title,
      'year', b.model_year,
      'university_id', b.university_id,
      'university_name', b.university_name
    )) AS models
  FROM base b
  GROUP BY b.h
  HAVING count(DISTINCT b.model_id) >= GREATEST(_min_count, 2)
  ORDER BY occurrence_count DESC, sample_text
  LIMIT _limit;
$$;

-- 3. Restrict execution to staff only
REVOKE ALL ON FUNCTION public.get_repeated_past_questions(uuid, integer, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_repeated_past_questions(uuid, integer, integer, integer) TO authenticated;

-- Inner permission check: function returns empty for non-staff via wrapper
CREATE OR REPLACE FUNCTION public.get_repeated_past_questions(
  _university_id uuid DEFAULT NULL,
  _year integer DEFAULT NULL,
  _min_count integer DEFAULT 2,
  _limit integer DEFAULT 200
)
RETURNS TABLE(
  normalized_hash text,
  sample_text text,
  occurrence_count bigint,
  models jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role)) THEN
    RAISE EXCEPTION 'Access denied';
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
      u.id AS university_id
    FROM public.past_exam_model_questions pmq
    JOIN public.past_exam_models m ON m.id = pmq.model_id
    LEFT JOIN public.universities u ON u.id = m.university_id
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
    ))
  FROM base b
  GROUP BY b.h
  HAVING count(DISTINCT b.model_id) >= GREATEST(_min_count, 2)
  ORDER BY count(DISTINCT b.model_id) DESC
  LIMIT _limit;
END;
$$;