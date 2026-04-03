
-- 1. Remove FK references from payment_requests and subscriptions
ALTER TABLE public.payment_requests DROP CONSTRAINT IF EXISTS payment_requests_plan_id_fkey;
ALTER TABLE public.payment_requests DROP COLUMN IF EXISTS plan_id;

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_id_fkey;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS plan_id;

-- 2. Drop subscription_plans table
DROP TABLE IF EXISTS public.subscription_plans CASCADE;

-- 3. Create simple subscription_settings table
CREATE TABLE public.subscription_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price NUMERIC NOT NULL DEFAULT 5000,
  currency TEXT NOT NULL DEFAULT 'YER',
  duration_months INTEGER NOT NULL DEFAULT 5,
  description TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default settings row
INSERT INTO public.subscription_settings (price, currency, duration_months, description)
VALUES (5000, 'YER', 5, 'اشتراك لفترة القبول');

ALTER TABLE public.subscription_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings"
  ON public.subscription_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage settings"
  ON public.subscription_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_subscription_settings_updated_at
  BEFORE UPDATE ON public.subscription_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Drop unused validation function
DROP FUNCTION IF EXISTS public.validate_duration_type() CASCADE;
