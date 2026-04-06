-- Add subject column to questions table
ALTER TABLE public.questions ADD COLUMN subject text NOT NULL DEFAULT 'general';

-- Add college guide columns to colleges table
ALTER TABLE public.colleges ADD COLUMN min_gpa numeric;
ALTER TABLE public.colleges ADD COLUMN acceptance_rate numeric;
ALTER TABLE public.colleges ADD COLUMN required_documents text[];
ALTER TABLE public.colleges ADD COLUMN registration_deadline text;
ALTER TABLE public.colleges ADD COLUMN notes text;