
-- Add lesson_code column for import linking
ALTER TABLE public.lessons
ADD COLUMN lesson_code text DEFAULT NULL;

-- Create unique index for lesson_code per college (allowing nulls)
CREATE UNIQUE INDEX idx_lessons_code_college 
ON public.lessons (lesson_code, college_id) 
WHERE lesson_code IS NOT NULL;
