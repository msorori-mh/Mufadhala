
CREATE OR REPLACE FUNCTION public.validate_payment_method_type()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.type NOT IN ('bank', 'exchange', 'ewallet', 'network_transfer', 'kuraimi_transfer', 'hasib_point') THEN
    RAISE EXCEPTION 'type must be bank, exchange, ewallet, network_transfer, kuraimi_transfer, or hasib_point';
  END IF;
  RETURN NEW;
END;
$function$;
