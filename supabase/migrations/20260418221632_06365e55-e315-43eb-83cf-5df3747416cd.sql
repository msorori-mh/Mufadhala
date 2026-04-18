CREATE OR REPLACE FUNCTION public.validate_conversion_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.source NOT IN ('exam_simulator','ai_generator','past_exams','ai_performance','chat_widget','install_share','brochure_download') THEN
    RAISE EXCEPTION 'Invalid conversion source: %', NEW.source;
  END IF;
  IF NEW.event_type NOT IN ('view','click') THEN
    RAISE EXCEPTION 'Invalid event_type: %', NEW.event_type;
  END IF;
  RETURN NEW;
END;
$function$;