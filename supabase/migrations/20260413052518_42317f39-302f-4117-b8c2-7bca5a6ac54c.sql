-- Make lesson-presentations bucket private
UPDATE storage.buckets SET public = false WHERE id = 'lesson-presentations';

-- Drop the old public SELECT policy
DROP POLICY IF EXISTS "Public can view lesson presentations" ON storage.objects;

-- New SELECT policy: only subscribers and staff can access
CREATE POLICY "Subscribers and staff can view lesson presentations"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lesson-presentations'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
    OR has_active_subscription(auth.uid())
  )
);