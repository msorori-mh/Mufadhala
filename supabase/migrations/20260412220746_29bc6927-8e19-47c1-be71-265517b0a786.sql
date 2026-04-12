
-- Create is_free_lesson function
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
      AND ranked.rn <= 3
  )
  OR EXISTS (
    SELECT 1 FROM public.lessons WHERE id = _lesson_id AND is_free = true
  );
$$;

-- Drop old SELECT policy on lessons
DROP POLICY IF EXISTS "Subscribers and staff can view published lessons" ON public.lessons;

-- Create new SELECT policy using is_free_lesson
CREATE POLICY "Subscribers and staff can view published lessons"
ON public.lessons
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR (is_published = true AND is_free_lesson(id))
  OR (is_published = true AND has_active_subscription(auth.uid()))
);

-- Drop old SELECT policy on questions
DROP POLICY IF EXISTS "Subscribed users can view questions of published lessons" ON public.questions;

-- Create new SELECT policy allowing free lesson questions
CREATE POLICY "Subscribed users can view questions of published lessons"
ON public.questions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR (
    EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = questions.lesson_id AND l.is_published = true
    )
    AND (
      has_active_subscription(auth.uid())
      OR is_free_lesson(questions.lesson_id)
    )
  )
);
