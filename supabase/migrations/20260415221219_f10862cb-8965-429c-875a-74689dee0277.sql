
ALTER TABLE public.universities
ADD COLUMN guide_files jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Migrate existing guide_url data into guide_files
UPDATE public.universities
SET guide_files = jsonb_build_array(
  jsonb_build_object(
    'url', guide_url,
    'name', 'دليل التنسيق',
    'type', CASE WHEN guide_url ILIKE '%.pdf' THEN 'pdf' ELSE 'image' END,
    'uploaded_at', created_at::text
  )
)
WHERE guide_url IS NOT NULL AND guide_url <> '';
