
-- Backfill missing lesson_codes with auto-generated values
UPDATE public.lessons 
SET lesson_code = 'AUTO_' || SUBSTRING(id::text, 1, 8) 
WHERE lesson_code IS NULL OR lesson_code = '';

-- Add check constraint for question_type
ALTER TABLE public.questions
ADD CONSTRAINT chk_question_type 
CHECK (question_type IN ('multiple_choice', 'true_false'));

-- Add check constraint for correct_option
ALTER TABLE public.questions
ADD CONSTRAINT chk_correct_option 
CHECK (correct_option IN ('a', 'b', 'c', 'd'));

-- Add check constraint for grade_level on lessons
ALTER TABLE public.lessons
ADD CONSTRAINT chk_grade_level 
CHECK (grade_level IS NULL OR grade_level IN (1, 2, 3));

-- Add unique index on lesson_code (only for non-null, non-empty values)
CREATE UNIQUE INDEX idx_lessons_lesson_code_unique 
ON public.lessons (lesson_code) 
WHERE lesson_code IS NOT NULL AND lesson_code != '';

-- Add index for faster subject-based lesson lookups
CREATE INDEX IF NOT EXISTS idx_lessons_subject_id_published 
ON public.lessons (subject_id, is_published) 
WHERE is_published = true;

-- Add index for faster question lookups by lesson
CREATE INDEX IF NOT EXISTS idx_questions_lesson_id 
ON public.questions (lesson_id);
