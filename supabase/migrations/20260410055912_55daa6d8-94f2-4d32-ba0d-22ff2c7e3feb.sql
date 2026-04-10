
ALTER TABLE public.payment_methods ADD COLUMN logo_url text;

INSERT INTO storage.buckets (id, name, public) VALUES ('payment-logos', 'payment-logos', true);

CREATE POLICY "Anyone can view payment logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-logos');

CREATE POLICY "Admins can upload payment logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-logos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update payment logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-logos' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete payment logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-logos' AND public.has_role(auth.uid(), 'admin'::public.app_role));
