
-- exam_attempts indexes
CREATE INDEX IF NOT EXISTS idx_exam_attempts_student_id ON public.exam_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_major_id ON public.exam_attempts(major_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_completed_at ON public.exam_attempts(completed_at);

-- notifications index
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON public.notifications(user_id, is_read);

-- subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_expires ON public.subscriptions(status, expires_at);

-- questions index
CREATE INDEX IF NOT EXISTS idx_questions_lesson_id ON public.questions(lesson_id);

-- lessons composite index
CREATE INDEX IF NOT EXISTS idx_lessons_major_published ON public.lessons(major_id, is_published);

-- user_roles index
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
