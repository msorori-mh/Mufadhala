
-- Past exam models table
CREATE TABLE public.past_exam_models (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  university_id uuid REFERENCES public.universities(id) ON DELETE CASCADE NOT NULL,
  year integer NOT NULL,
  track text,
  is_published boolean NOT NULL DEFAULT false,
  is_paid boolean NOT NULL DEFAULT false,
  duration_minutes integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.past_exam_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published models"
  ON public.past_exam_models FOR SELECT
  USING (is_published = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Staff can manage models"
  ON public.past_exam_models FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE TRIGGER update_past_exam_models_updated_at
  BEFORE UPDATE ON public.past_exam_models
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Past exam model questions (linking table)
CREATE TABLE public.past_exam_model_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id uuid REFERENCES public.past_exam_models(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(model_id, question_id)
);

ALTER TABLE public.past_exam_model_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view model questions of published models"
  ON public.past_exam_model_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.past_exam_models m
      WHERE m.id = model_id AND (m.is_published = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
    )
  );

CREATE POLICY "Staff can manage model questions"
  ON public.past_exam_model_questions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE INDEX idx_past_exam_model_questions_model ON public.past_exam_model_questions(model_id);
CREATE INDEX idx_past_exam_models_university ON public.past_exam_models(university_id);
CREATE INDEX idx_past_exam_models_year ON public.past_exam_models(year);
