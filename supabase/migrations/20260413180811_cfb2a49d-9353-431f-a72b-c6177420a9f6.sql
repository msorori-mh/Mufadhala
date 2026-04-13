
-- Add fraud detection columns to payment_requests
ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS receipt_hash TEXT,
  ADD COLUMN IF NOT EXISTS extracted_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS extracted_reference TEXT,
  ADD COLUMN IF NOT EXISTS extracted_date TEXT,
  ADD COLUMN IF NOT EXISTS fraud_status TEXT NOT NULL DEFAULT 'clean',
  ADD COLUMN IF NOT EXISTS duplicate_count INTEGER NOT NULL DEFAULT 0;

-- Add index on receipt_hash for fast duplicate lookups
CREATE INDEX IF NOT EXISTS idx_payment_requests_receipt_hash ON public.payment_requests (receipt_hash) WHERE receipt_hash IS NOT NULL;

-- Add index on extracted_reference for duplicate reference detection
CREATE INDEX IF NOT EXISTS idx_payment_requests_extracted_reference ON public.payment_requests (extracted_reference) WHERE extracted_reference IS NOT NULL;

-- Validation trigger for fraud_status
CREATE OR REPLACE FUNCTION public.validate_fraud_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.fraud_status NOT IN ('clean', 'review', 'suspicious') THEN
    RAISE EXCEPTION 'fraud_status must be clean, review, or suspicious';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_fraud_status_trigger
  BEFORE INSERT OR UPDATE ON public.payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_fraud_status();
