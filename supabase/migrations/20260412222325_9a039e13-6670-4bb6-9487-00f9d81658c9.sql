
CREATE OR REPLACE FUNCTION public.is_free_lesson(_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM (
      SELECT l.id,
             ROW_NUMBER() OVER (
               PARTITION BY l.major_id, l.subject_id
               ORDER BY l.display_order, l.created_at
             ) AS rn
      FROM public.lessons l
      WHERE l.is_published = true
        AND l.major_id = (SELECT major_id FROM public.lessons WHERE id = _lesson_id)
        AND l.subject_id = (SELECT subject_id FROM public.lessons WHERE id = _lesson_id)
    ) ranked
    WHERE ranked.id = _lesson_id
      AND ranked.rn <= COALESCE(
        (SELECT (value::text)::int FROM public.app_cache WHERE key = 'free_lessons_count' AND expires_at > now()),
        3
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.lessons WHERE id = _lesson_id AND is_free = true
  );
$$;
