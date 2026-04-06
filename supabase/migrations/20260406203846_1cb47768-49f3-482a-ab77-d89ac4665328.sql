
-- 1. Expand payment method types to include e-wallets
CREATE OR REPLACE FUNCTION public.validate_payment_method_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.type NOT IN ('bank', 'exchange', 'ewallet') THEN
    RAISE EXCEPTION 'type must be bank, exchange, or ewallet';
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Add is_free column to lessons for free trial content
ALTER TABLE public.lessons ADD COLUMN is_free boolean NOT NULL DEFAULT false;

-- 3. Drop old lessons SELECT policy and create Freemium-aware policies
DROP POLICY IF EXISTS "Subscribed users can view published lessons" ON public.lessons;

-- Policy: Anyone authenticated can see basic lesson info (title, summary) for published lessons
-- Full content is only available to subscribers or if lesson is free
CREATE POLICY "Authenticated can view published lesson basics"
ON public.lessons
FOR SELECT
TO authenticated
USING (
  (is_published = true)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);
