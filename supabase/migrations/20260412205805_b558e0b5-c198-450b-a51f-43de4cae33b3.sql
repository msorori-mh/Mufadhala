ALTER TABLE public.universities
ADD COLUMN coordination_timeline jsonb DEFAULT '[]'::jsonb,
ADD COLUMN coordination_instructions text;