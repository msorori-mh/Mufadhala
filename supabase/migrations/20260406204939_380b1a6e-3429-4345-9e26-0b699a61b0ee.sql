-- 1. Drop the old permissive SELECT policy on lessons
DROP POLICY IF EXISTS "Authenticated can view published lesson basics" ON public.lessons;

-- 2. New restrictive SELECT policy: only subscribers, staff, or free lessons get full row access
CREATE POLICY "Subscribers and staff can view published lessons"
  ON public.lessons
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
    OR (is_published = true AND is_free = true)
    OR (is_published = true AND has_active_subscription(auth.uid()))
  );

-- 3. Create a SECURITY DEFINER function for listing lessons (returns only safe columns)
CREATE OR REPLACE FUNCTION public.get_published_lessons_list(_major_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  summary text,
  display_order integer,
  is_free boolean,
  major_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id, l.title, l.summary, l.display_order, l.is_free, l.major_id
  FROM public.lessons l
  WHERE l.is_published = true
    AND l.major_id = _major_id
  ORDER BY l.display_order;
$$;