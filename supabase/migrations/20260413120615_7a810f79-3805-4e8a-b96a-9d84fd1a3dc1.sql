
-- ══════════════════════════════════════════════════
-- PHASE 1: Create admission_tracks table
-- ══════════════════════════════════════════════════
CREATE TABLE public.admission_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admission_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active tracks"
  ON public.admission_tracks FOR SELECT TO public
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE POLICY "Staff can manage tracks"
  ON public.admission_tracks FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

CREATE TRIGGER update_admission_tracks_updated_at
  BEFORE UPDATE ON public.admission_tracks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════════
-- PHASE 2: Create track_subjects table
-- ══════════════════════════════════════════════════
CREATE TABLE public.track_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id UUID NOT NULL REFERENCES public.admission_tracks(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (track_id, subject_id)
);

ALTER TABLE public.track_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view track subjects"
  ON public.track_subjects FOR SELECT TO public
  USING (true);

CREATE POLICY "Staff can manage track subjects"
  ON public.track_subjects FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- ══════════════════════════════════════════════════
-- PHASE 3: Add admission_track_id to colleges (nullable, backward-compatible)
-- ══════════════════════════════════════════════════
ALTER TABLE public.colleges
  ADD COLUMN admission_track_id UUID REFERENCES public.admission_tracks(id);

CREATE INDEX idx_colleges_admission_track ON public.colleges(admission_track_id);
CREATE INDEX idx_track_subjects_track ON public.track_subjects(track_id);
CREATE INDEX idx_track_subjects_subject ON public.track_subjects(subject_id);
