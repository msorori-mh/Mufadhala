
CREATE TABLE public.deletion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_user_id uuid NOT NULL,
  deleted_user_name text,
  deleted_by uuid NOT NULL,
  deleted_by_name text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deletion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view deletion logs"
  ON public.deletion_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert deletion logs"
  ON public.deletion_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
