-- Extend allowed conversion sources to include install page sharing
create or replace function public.validate_conversion_event()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
BEGIN
  IF NEW.source NOT IN ('exam_simulator','ai_generator','past_exams','ai_performance','chat_widget','install_share') THEN
    RAISE EXCEPTION 'Invalid conversion source: %', NEW.source;
  END IF;
  IF NEW.event_type NOT IN ('view','click') THEN
    RAISE EXCEPTION 'Invalid event_type: %', NEW.event_type;
  END IF;
  RETURN NEW;
END;
$function$;