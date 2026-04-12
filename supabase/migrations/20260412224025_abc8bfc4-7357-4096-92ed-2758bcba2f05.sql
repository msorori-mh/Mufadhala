ALTER TABLE public.subscription_plans
  ADD COLUMN default_price_zone_a numeric NOT NULL DEFAULT 0,
  ADD COLUMN default_price_zone_b numeric NOT NULL DEFAULT 0;

-- Seed from existing price_default
UPDATE public.subscription_plans
SET default_price_zone_a = price_default,
    default_price_zone_b = price_default;