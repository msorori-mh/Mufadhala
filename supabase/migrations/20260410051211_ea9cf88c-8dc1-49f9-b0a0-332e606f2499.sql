
-- Add college_id column to lessons
ALTER TABLE public.lessons ADD COLUMN college_id uuid REFERENCES public.colleges(id);

-- Make major_id nullable
ALTER TABLE public.lessons ALTER COLUMN major_id DROP NOT NULL;
