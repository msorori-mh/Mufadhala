ALTER TABLE public.subscription_plans
ADD COLUMN discount_zone_a numeric NOT NULL DEFAULT 0,
ADD COLUMN discount_zone_b numeric NOT NULL DEFAULT 0;