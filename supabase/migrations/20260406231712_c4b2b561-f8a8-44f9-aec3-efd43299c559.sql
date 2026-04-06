
-- 1. Create subscription_plans table
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text DEFAULT '',
  features text[] DEFAULT '{}',
  price_zone_a numeric NOT NULL DEFAULT 0,
  price_zone_b numeric NOT NULL DEFAULT 0,
  price_default numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'YER',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  allowed_major_ids uuid[] DEFAULT NULL,
  is_free boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage plans" ON public.subscription_plans
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Create promo_codes table
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_percent integer NOT NULL DEFAULT 0,
  max_uses integer DEFAULT NULL,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage promo codes" ON public.promo_codes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view active promo codes" ON public.promo_codes
  FOR SELECT TO authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- 3. Add plan_id and trial_ends_at to subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN plan_id uuid REFERENCES public.subscription_plans(id),
  ADD COLUMN trial_ends_at timestamptz DEFAULT NULL;

-- 4. Add promo_code_id to payment_requests
ALTER TABLE public.payment_requests
  ADD COLUMN promo_code_id uuid REFERENCES public.promo_codes(id);

-- 5. Update subscription status validator to include 'trial'
CREATE OR REPLACE FUNCTION public.validate_subscription_status()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('pending', 'active', 'expired', 'cancelled', 'trial') THEN
    RAISE EXCEPTION 'status must be pending, active, expired, cancelled, or trial';
  END IF;
  RETURN NEW;
END;
$function$;

-- 6. Update has_active_subscription to include trial
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND (
        (status = 'active' AND (expires_at IS NULL OR expires_at > now()))
        OR
        (status = 'trial' AND trial_ends_at IS NOT NULL AND trial_ends_at > now())
      )
  );
$function$;

-- 7. Auto-create trial subscription on new student registration
CREATE OR REPLACE FUNCTION public.auto_create_trial_subscription()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Only create trial if user doesn't already have any subscription
  IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE user_id = NEW.user_id) THEN
    INSERT INTO public.subscriptions (user_id, status, trial_ends_at, starts_at)
    VALUES (NEW.user_id, 'trial', now() + interval '24 hours', now());
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER auto_trial_on_student_creation
  AFTER INSERT ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_trial_subscription();

-- 8. Insert default plans
INSERT INTO public.subscription_plans (name, slug, description, features, price_default, price_zone_a, price_zone_b, is_free, display_order) VALUES
  ('الخطة المجانية', 'free', 'وصول لبعض النماذج القديمة مع إعلانات', ARRAY['نماذج قديمة محدودة', 'ملخصات الدروس', 'إعلانات'], 0, 0, 0, true, 0),
  ('باقة طبيب المستقبل', 'medical', 'وصول كامل لأسئلة الأحياء والكيمياء والإنجليزي مع شرح الحلول', ARRAY['أسئلة الأحياء', 'أسئلة الكيمياء', 'أسئلة الإنجليزي', 'شرح الحلول', 'وضع أوفلاين'], 3000, 3000, 7000, false, 1),
  ('باقة المحترف التقني', 'engineering', 'وصول كامل للفيزياء والرياضيات والإنجليزي مع نماذج ذكاء', ARRAY['أسئلة الفيزياء', 'أسئلة الرياضيات', 'أسئلة الإنجليزي', 'نماذج ذكاء IQ', 'شرح الحلول'], 3000, 3000, 7000, false, 2),
  ('الباقة الشاملة VIP', 'vip', 'فتح جميع المواد + دليل المقابلة + أولوية الدعم', ARRAY['جميع المواد بلا استثناء', 'دليل المقابلة الشخصية', 'أولوية الدعم الفني', 'وضع أوفلاين', 'شرح الحلول'], 5000, 5000, 10000, false, 3);
