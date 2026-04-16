-- 1. Add pricing_zone to universities
ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS pricing_zone text NOT NULL DEFAULT 'a';

-- 2. Set zone values for existing universities
-- Zone A (old currency): Sana'a region universities
UPDATE public.universities SET pricing_zone = 'a' WHERE code IN ('SANAA', 'IBB', 'DHAMAR', 'Hod', 'MhwU', 'AmrU', 'GebU', '21sep');

-- Zone B (new currency): Southern/Eastern universities  
UPDATE public.universities SET pricing_zone = 'b' WHERE code IN ('ADEN', 'TAIZ', 'HADHRAMAUT', 'SAYOUN', 'SABA', 'SHABWA', 'MAHRA');

-- 3. Add pricing snapshot fields to payment_requests
ALTER TABLE public.payment_requests 
  ADD COLUMN IF NOT EXISTS pricing_zone text,
  ADD COLUMN IF NOT EXISTS expected_amount numeric,
  ADD COLUMN IF NOT EXISTS pricing_source text DEFAULT 'university',
  ADD COLUMN IF NOT EXISTS university_id uuid;