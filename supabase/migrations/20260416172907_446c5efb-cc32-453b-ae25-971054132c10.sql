
-- Track AI question generation usage per user per day
CREATE TABLE public.ai_generation_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  subject text,
  difficulty text
);

-- Index for fast daily count lookups
CREATE INDEX idx_ai_generation_usage_user_day 
  ON public.ai_generation_usage (user_id, generated_at DESC);

-- Enable RLS
ALTER TABLE public.ai_generation_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own usage"
  ON public.ai_generation_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- No direct client inserts (edge function uses service_role)
CREATE POLICY "No client inserts"
  ON public.ai_generation_usage FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Admins can view all
CREATE POLICY "Admins can view all usage"
  ON public.ai_generation_usage FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
