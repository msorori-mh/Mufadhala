
CREATE TABLE public.college_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (college_id, subject_id)
);

ALTER TABLE public.college_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view college subjects"
ON public.college_subjects
FOR SELECT
TO public
USING (true);

CREATE POLICY "Staff can manage college subjects"
ON public.college_subjects
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE INDEX idx_college_subjects_college ON public.college_subjects(college_id);
CREATE INDEX idx_college_subjects_subject ON public.college_subjects(subject_id);
