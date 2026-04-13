
-- Add question_type column with default
ALTER TABLE public.questions
ADD COLUMN question_type text NOT NULL DEFAULT 'multiple_choice';

-- Validation trigger for question_type
CREATE OR REPLACE FUNCTION public.validate_question_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.question_type NOT IN ('multiple_choice', 'true_false') THEN
    RAISE EXCEPTION 'question_type must be multiple_choice or true_false';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_question_type
BEFORE INSERT OR UPDATE ON public.questions
FOR EACH ROW
EXECUTE FUNCTION public.validate_question_type();
