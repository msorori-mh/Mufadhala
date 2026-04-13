-- Composite index for the hot path: lessons filtered by subject_id + is_published
CREATE INDEX IF NOT EXISTS idx_lessons_subject_published
ON public.lessons (subject_id, is_published)
WHERE is_published = true;
