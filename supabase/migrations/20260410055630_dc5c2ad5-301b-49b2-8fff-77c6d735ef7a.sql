
ALTER TABLE public.payment_methods ADD COLUMN barcode_url text;

INSERT INTO storage.buckets (id, name, public) VALUES ('payment-barcodes', 'payment-barcodes', true);

CREATE POLICY "Anyone can view payment barcodes"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-barcodes');

CREATE POLICY "Admins can upload payment barcodes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-barcodes' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update payment barcodes"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'payment-barcodes' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete payment barcodes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-barcodes' AND public.has_role(auth.uid(), 'admin'::public.app_role));
