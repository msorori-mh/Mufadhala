-- Create past_exam_attempts table
CREATE TABLE public.past_exam_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  model_id UUID NOT NULL,
  mode TEXT NOT NULL DEFAULT 'training',
  score INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  blank_count INTEGER NOT NULL DEFAULT 0,
  elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_past_exam_attempts_student ON public.past_exam_attempts(student_id, completed_at DESC);
CREATE INDEX idx_past_exam_attempts_model ON public.past_exam_attempts(model_id, completed_at DESC);

-- Validation trigger for mode
CREATE OR REPLACE FUNCTION public.validate_past_exam_attempt_mode()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.mode NOT IN ('training', 'strict') THEN
    RAISE EXCEPTION 'mode must be training or strict';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_past_exam_attempt_mode_trigger
BEFORE INSERT OR UPDATE ON public.past_exam_attempts
FOR EACH ROW
EXECUTE FUNCTION public.validate_past_exam_attempt_mode();

-- Enable RLS
ALTER TABLE public.past_exam_attempts ENABLE ROW LEVEL SECURITY;

-- Students can view their own attempts; staff can view all
CREATE POLICY "Students view own past exam attempts"
ON public.past_exam_attempts
FOR SELECT
TO authenticated
USING (
  (student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- Students can insert their own attempts
CREATE POLICY "Students create own past exam attempts"
ON public.past_exam_attempts
FOR INSERT
TO authenticated
WITH CHECK (
  student_id IN (SELECT s.id FROM public.students s WHERE s.user_id = auth.uid())
);

-- Admins can delete attempts
CREATE POLICY "Admins can delete past exam attempts"
ON public.past_exam_attempts
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));