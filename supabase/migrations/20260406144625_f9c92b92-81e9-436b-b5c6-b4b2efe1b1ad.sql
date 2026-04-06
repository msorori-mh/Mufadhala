-- Add explicit DELETE policy for lesson_progress: only owning student and admins can delete
CREATE POLICY "Students can delete own progress"
ON public.lesson_progress
FOR DELETE
TO authenticated
USING (
  (student_id IN (SELECT id FROM students WHERE user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);