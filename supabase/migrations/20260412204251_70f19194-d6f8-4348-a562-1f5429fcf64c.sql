-- Add guide columns to universities
ALTER TABLE public.universities
  ADD COLUMN guide_url text,
  ADD COLUMN guide_text text;

-- Create public storage bucket for university guides
INSERT INTO storage.buckets (id, name, public)
VALUES ('university-guides', 'university-guides', true);

-- Public read access
CREATE POLICY "Anyone can view university guides"
ON storage.objects FOR SELECT
USING (bucket_id = 'university-guides');

-- Staff can upload
CREATE POLICY "Staff can upload university guides"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'university-guides'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'moderator'::public.app_role))
);

-- Staff can update
CREATE POLICY "Staff can update university guides"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'university-guides'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'moderator'::public.app_role))
);

-- Staff can delete
CREATE POLICY "Staff can delete university guides"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'university-guides'
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'moderator'::public.app_role))
);