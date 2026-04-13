
-- 1. Fix CRITICAL: Restrict subscription INSERT to only allow 'pending' status
DROP POLICY IF EXISTS "Users can create own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can create own subscriptions"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND starts_at IS NULL
  AND expires_at IS NULL
  AND trial_ends_at IS NULL
);

-- 2. Fix: Add restrictive policy on otp_codes to block all client access
-- RLS is enabled but no policies exist = implicit deny, which is correct.
-- Add explicit deny policy for documentation clarity.
CREATE POLICY "No client access to OTP codes"
ON public.otp_codes
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);
