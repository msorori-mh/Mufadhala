-- Restrict payment methods viewing to authenticated users only
DROP POLICY IF EXISTS "Anyone can view active methods" ON public.payment_methods;

CREATE POLICY "Authenticated can view active methods"
  ON public.payment_methods
  FOR SELECT
  TO authenticated
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));