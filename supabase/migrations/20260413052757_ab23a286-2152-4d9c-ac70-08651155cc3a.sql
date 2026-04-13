-- Update storage policy: allow any authenticated user to view presentations
-- The real access control is on the lessons table RLS (which gates who can see presentation_url)
-- If a user has the signed URL, they already passed the lessons RLS check
DROP POLICY IF EXISTS "Subscribers and staff can view lesson presentations" ON storage.objects;

CREATE POLICY "Authenticated users can view lesson presentations"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'lesson-presentations');