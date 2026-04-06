DROP POLICY IF EXISTS "No direct client exam attempt creation" ON public.exam_attempts;
DROP POLICY IF EXISTS "Staff can update exam attempts" ON public.exam_attempts;
DROP POLICY IF EXISTS "Staff can delete exam attempts" ON public.exam_attempts;

CREATE POLICY "No direct client exam attempt creation"
ON public.exam_attempts
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Staff can update exam attempts"
ON public.exam_attempts
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
);

CREATE POLICY "Staff can delete exam attempts"
ON public.exam_attempts
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
);