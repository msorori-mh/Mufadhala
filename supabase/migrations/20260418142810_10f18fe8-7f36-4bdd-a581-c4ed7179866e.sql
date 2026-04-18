-- Drop broken trigger that references non-existent is_free column on lessons
-- The freemium paywall logic is handled in the frontend (ConversionBoosters), not via DB column
DROP TRIGGER IF EXISTS trg_auto_first_lesson_free ON public.lessons;
DROP FUNCTION IF EXISTS public.auto_set_first_lesson_free();