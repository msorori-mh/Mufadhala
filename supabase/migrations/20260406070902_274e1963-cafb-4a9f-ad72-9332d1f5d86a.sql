
-- 1. Make receipts bucket private
UPDATE storage.buckets SET public = false WHERE id = 'receipts';

-- 2. Drop existing overly permissive storage policies on receipts
DROP POLICY IF EXISTS "Anyone can view receipts" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;

-- 3. Create proper storage policies for receipts
CREATE POLICY "Receipt owner and staff can view receipts"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'receipts'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  )
);

CREATE POLICY "Users can upload own receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Receipt owner and admins can delete receipts"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'receipts'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

-- 4. Fix exam score tampering: remove student UPDATE policy
DROP POLICY IF EXISTS "Students can update own attempts" ON public.exam_attempts;

-- 5. Fix subscription gating on lessons
DROP POLICY IF EXISTS "Authenticated can view published lessons" ON public.lessons;
CREATE POLICY "Subscribed users can view published lessons"
ON public.lessons FOR SELECT TO authenticated
USING (
  (is_published = true AND public.has_active_subscription(auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- 6. Fix subscription gating on questions
DROP POLICY IF EXISTS "Authenticated can view questions of published lessons" ON public.questions;
CREATE POLICY "Subscribed users can view questions of published lessons"
ON public.questions FOR SELECT TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM lessons l
    WHERE l.id = questions.lesson_id AND l.is_published = true
  ) AND public.has_active_subscription(auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- 7. Fix subscription gating on lesson_reviews (viewing)
DROP POLICY IF EXISTS "Authenticated can view reviews" ON public.lesson_reviews;
CREATE POLICY "Subscribed users can view reviews"
ON public.lesson_reviews FOR SELECT TO authenticated
USING (
  public.has_active_subscription(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);
