
-- Competition periods table
CREATE TABLE public.competition_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  academic_year TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.competition_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view open periods" ON public.competition_periods
  FOR SELECT TO public USING (status IN ('open', 'completed') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

CREATE POLICY "Staff can create periods" ON public.competition_periods
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

CREATE POLICY "Staff can update periods" ON public.competition_periods
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can delete periods" ON public.competition_periods
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_competition_periods_updated_at BEFORE UPDATE ON public.competition_periods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Admission requirements table
CREATE TABLE public.admission_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  competition_period_id UUID NOT NULL REFERENCES public.competition_periods(id) ON DELETE CASCADE,
  major_id UUID NOT NULL REFERENCES public.majors(id) ON DELETE CASCADE,
  min_gpa NUMERIC NOT NULL DEFAULT 0,
  available_seats INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(competition_period_id, major_id)
);

ALTER TABLE public.admission_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view requirements" ON public.admission_requirements
  FOR SELECT TO public USING (true);

CREATE POLICY "Staff can create requirements" ON public.admission_requirements
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

CREATE POLICY "Staff can update requirements" ON public.admission_requirements
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can delete requirements" ON public.admission_requirements
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_admission_requirements_updated_at BEFORE UPDATE ON public.admission_requirements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Competition applications table
CREATE TABLE public.competition_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  competition_period_id UUID NOT NULL REFERENCES public.competition_periods(id) ON DELETE CASCADE,
  choice_1_major_id UUID REFERENCES public.majors(id),
  choice_2_major_id UUID REFERENCES public.majors(id),
  choice_3_major_id UUID REFERENCES public.majors(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'waitlisted')),
  accepted_major_id UUID REFERENCES public.majors(id),
  rank_score NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, competition_period_id)
);

ALTER TABLE public.competition_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own applications" ON public.competition_applications
  FOR SELECT TO authenticated USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator')
  );

CREATE POLICY "Students can create own applications" ON public.competition_applications
  FOR INSERT TO authenticated WITH CHECK (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

CREATE POLICY "Students can update own pending applications" ON public.competition_applications
  FOR UPDATE TO authenticated USING (
    (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()) AND status = 'pending')
    OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator')
  );

CREATE POLICY "Admins can delete applications" ON public.competition_applications
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_competition_applications_updated_at BEFORE UPDATE ON public.competition_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Staff can create notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator')
  );

CREATE POLICY "Admins can delete notifications" ON public.notifications
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
