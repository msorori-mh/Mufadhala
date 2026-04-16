CREATE TABLE public.conversion_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NULL,
  source text NOT NULL,
  event_type text NOT NULL DEFAULT 'click',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversion_events_source_type_date
  ON public.conversion_events (source, event_type, created_at DESC);

CREATE INDEX idx_conversion_events_user
  ON public.conversion_events (user_id);

ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;

-- Validate source and event_type via trigger (immutable check constraint not needed)
CREATE OR REPLACE FUNCTION public.validate_conversion_event()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.source NOT IN ('exam_simulator','ai_generator','past_exams','ai_performance','chat_widget') THEN
    RAISE EXCEPTION 'Invalid conversion source: %', NEW.source;
  END IF;
  IF NEW.event_type NOT IN ('view','click') THEN
    RAISE EXCEPTION 'Invalid event_type: %', NEW.event_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_conversion_event
BEFORE INSERT OR UPDATE ON public.conversion_events
FOR EACH ROW EXECUTE FUNCTION public.validate_conversion_event();

-- Anyone authenticated may insert their own event (or anonymous with null user_id matching auth.uid())
CREATE POLICY "Users can insert own conversion events"
ON public.conversion_events
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Admins can view everything
CREATE POLICY "Admins can view all conversion events"
ON public.conversion_events
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Aggregation function for the funnel report
CREATE OR REPLACE FUNCTION public.get_conversion_funnel_stats(_days integer DEFAULT 30)
RETURNS TABLE(
  source text,
  total_clicks bigint,
  unique_users bigint,
  conversions bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH events AS (
    SELECT ce.source, ce.user_id, ce.created_at
    FROM public.conversion_events ce
    WHERE ce.created_at >= now() - (_days || ' days')::interval
      AND ce.event_type = 'click'
  ),
  agg AS (
    SELECT
      e.source,
      COUNT(*)::bigint AS total_clicks,
      COUNT(DISTINCT e.user_id)::bigint AS unique_users
    FROM events e
    GROUP BY e.source
  ),
  conv AS (
    SELECT
      e.source,
      COUNT(DISTINCT e.user_id)::bigint AS conversions
    FROM events e
    JOIN public.subscriptions s ON s.user_id = e.user_id
    WHERE s.created_at >= e.created_at
      AND s.status IN ('active','pending')
    GROUP BY e.source
  )
  SELECT
    a.source,
    a.total_clicks,
    a.unique_users,
    COALESCE(c.conversions, 0) AS conversions
  FROM agg a
  LEFT JOIN conv c ON c.source = a.source
  ORDER BY a.total_clicks DESC;
$$;