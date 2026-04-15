
CREATE OR REPLACE FUNCTION public.check_phone_exists(_phone text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students WHERE phone = _phone
  );
$$;
