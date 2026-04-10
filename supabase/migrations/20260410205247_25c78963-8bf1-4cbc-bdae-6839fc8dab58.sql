-- Add presentation_url column to lessons table
ALTER TABLE public.lessons ADD COLUMN presentation_url text;

-- Create storage bucket for lesson presentations
INSERT INTO storage.buckets (id, name, public) VALUES ('lesson-presentations', 'lesson-presentations', true);

-- Public can view presentations
CREATE POLICY "Public can view lesson presentations"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-presentations');

-- Staff can upload presentations
CREATE POLICY "Staff can upload lesson presentations"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lesson-presentations'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  )
);

-- Staff can update presentations
CREATE POLICY "Staff can update lesson presentations"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'lesson-presentations'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  )
);

-- Staff can delete presentations
CREATE POLICY "Staff can delete lesson presentations"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lesson-presentations'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  )
);