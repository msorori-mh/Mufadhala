
CREATE OR REPLACE FUNCTION public.get_published_lessons_by_college(_college_id uuid)
RETURNS TABLE(id uuid, title text, summary text, display_order integer, is_free boolean, major_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id, l.title, l.summary, l.display_order, l.is_free, l.major_id
  FROM public.lessons l
  WHERE l.is_published = true
    AND l.college_id = _college_id
  ORDER BY l.display_order;
$$;
