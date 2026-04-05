
-- Create lesson reviews table
CREATE TABLE public.lesson_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  comment TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, student_id)
);

-- Validation trigger for rating 1-5
CREATE OR REPLACE FUNCTION public.validate_lesson_review_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_lesson_review_rating
  BEFORE INSERT OR UPDATE ON public.lesson_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_lesson_review_rating();

-- Updated at trigger
CREATE TRIGGER update_lesson_reviews_updated_at
  BEFORE UPDATE ON public.lesson_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.lesson_reviews ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all reviews
CREATE POLICY "Authenticated can view reviews"
  ON public.lesson_reviews FOR SELECT
  TO authenticated
  USING (true);

-- Students can insert their own reviews
CREATE POLICY "Students can create own reviews"
  ON public.lesson_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = auth.uid())
  );

-- Students can update their own reviews
CREATE POLICY "Students can update own reviews"
  ON public.lesson_reviews FOR UPDATE
  TO authenticated
  USING (
    student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = auth.uid())
  );

-- Admins can delete any review
CREATE POLICY "Admins can delete reviews"
  ON public.lesson_reviews FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));
