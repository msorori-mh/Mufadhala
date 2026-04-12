-- Composite index for fetching student's completed exams (Dashboard, ExamHistory)
CREATE INDEX IF NOT EXISTS idx_exam_attempts_student_completed
  ON public.exam_attempts (student_id, completed_at DESC NULLS LAST);

-- Index for filtering lessons by college (AdminContent, LessonsList)
CREATE INDEX IF NOT EXISTS idx_lessons_college_id
  ON public.lessons (college_id);

-- Composite index for filtering lessons by subject + grade level
CREATE INDEX IF NOT EXISTS idx_lessons_subject_grade
  ON public.lessons (subject_id, grade_level);

-- Composite index for subscription status checks (very frequent via RLS has_active_subscription)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status
  ON public.subscriptions (user_id, status);

-- Index for fetching questions by lesson (LessonDetail, ExamSimulator, AdminContent)
CREATE INDEX IF NOT EXISTS idx_questions_lesson_id
  ON public.questions (lesson_id);

-- Composite index for payment requests lookup
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_status
  ON public.payment_requests (user_id, status);

-- Composite index for lesson progress queries
CREATE INDEX IF NOT EXISTS idx_lesson_progress_student_completed
  ON public.lesson_progress (student_id, is_completed);

-- Composite index for user roles (used in every RLS policy via has_role)
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role
  ON public.user_roles (user_id, role);