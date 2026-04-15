
-- 1. Remove notifications from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;

-- 2. Fix lesson-presentations bucket: drop overly permissive SELECT policy and create a proper one
DROP POLICY IF EXISTS "Authenticated users can view lesson presentations" ON storage.objects;
DROP POLICY IF EXISTS "authenticated can view lesson-presentations" ON storage.objects;

-- Create a restrictive SELECT policy that checks subscription
CREATE POLICY "Subscribed users can view lesson presentations"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'lesson-presentations'
  AND (
    public.has_active_subscription(auth.uid())
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  )
);
