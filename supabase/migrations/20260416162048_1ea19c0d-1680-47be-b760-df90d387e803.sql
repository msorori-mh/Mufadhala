
-- 1. Drop policies that depend on is_free_lesson FIRST
DROP POLICY IF EXISTS "Subscribers and staff can view published lessons" ON public.lessons;
DROP POLICY IF EXISTS "Subscribed users can view questions of published lessons" ON public.questions;

-- 2. Create new policies without is_free_lesson dependency
CREATE POLICY "Authenticated can view published lessons"
ON public.lessons
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR (is_published = true)
);

CREATE POLICY "Authenticated can view questions of published lessons"
ON public.questions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR EXISTS (
    SELECT 1 FROM lessons l
    WHERE l.id = questions.lesson_id AND l.is_published = true
  )
);

-- 3. Now safe to drop the function
DROP FUNCTION IF EXISTS public.is_free_lesson(uuid);

-- 4. Drop the is_free column
ALTER TABLE public.lessons DROP COLUMN IF EXISTS is_free;

-- 5. Recreate get_published_lessons_list without is_free
DROP FUNCTION IF EXISTS public.get_published_lessons_list(uuid);
CREATE OR REPLACE FUNCTION public.get_published_lessons_list(_major_id uuid)
RETURNS TABLE(id uuid, title text, summary text, display_order integer, major_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.id, l.title, l.summary, l.display_order, l.major_id
  FROM lessons l
  WHERE l.major_id = _major_id AND l.is_published = true
  ORDER BY l.display_order;
$$;

-- 6. Recreate get_published_lessons_by_college without is_free
DROP FUNCTION IF EXISTS public.get_published_lessons_by_college(uuid);
CREATE OR REPLACE FUNCTION public.get_published_lessons_by_college(_college_id uuid)
RETURNS TABLE(id uuid, title text, summary text, display_order integer, major_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.id, l.title, l.summary, l.display_order, l.major_id
  FROM lessons l
  WHERE l.college_id = _college_id AND l.is_published = true
  ORDER BY l.display_order;
$$;
