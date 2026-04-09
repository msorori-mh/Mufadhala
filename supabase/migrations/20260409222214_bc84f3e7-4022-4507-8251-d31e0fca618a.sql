
-- Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  code TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT 'BookOpen',
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active subjects" ON public.subjects
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Staff can create subjects" ON public.subjects
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Staff can update subjects" ON public.subjects
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Admins can delete subjects" ON public.subjects
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create major_subjects junction table
CREATE TABLE public.major_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  major_id UUID NOT NULL REFERENCES public.majors(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (major_id, subject_id)
);

ALTER TABLE public.major_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view major subjects" ON public.major_subjects
  FOR SELECT USING (true);

CREATE POLICY "Staff can manage major subjects" ON public.major_subjects
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Add subject_id to lessons
ALTER TABLE public.lessons ADD COLUMN subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;

-- Add updated_at triggers
CREATE TRIGGER set_subjects_updated_at BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed initial subjects
INSERT INTO public.subjects (name_ar, name_en, code, icon, display_order) VALUES
  ('الكيمياء', 'Chemistry', 'chemistry', 'FlaskConical', 1),
  ('الأحياء', 'Biology', 'biology', 'Dna', 2),
  ('الفيزياء', 'Physics', 'physics', 'Atom', 3),
  ('الرياضيات', 'Mathematics', 'math', 'Calculator', 4),
  ('اللغة الإنجليزية', 'English', 'english', 'Languages', 5),
  ('أساسيات الحاسوب', 'Computer Science Basics', 'cs_basics', 'Monitor', 6),
  ('الثقافة العامة', 'General Knowledge', 'general', 'BookOpen', 7);
