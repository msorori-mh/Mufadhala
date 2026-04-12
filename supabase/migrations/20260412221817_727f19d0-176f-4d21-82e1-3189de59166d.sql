
-- Create chat_usage table to track AI assistant messages
CREATE TABLE public.chat_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  ip_address text,
  model text,
  tokens_prompt int DEFAULT 0,
  tokens_completion int DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.chat_usage ENABLE ROW LEVEL SECURITY;

-- Only admins can read chat usage stats
CREATE POLICY "Admins can view chat usage"
ON public.chat_usage FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Edge function inserts via service role, no INSERT policy needed for authenticated

-- Index for daily stats queries
CREATE INDEX idx_chat_usage_created_at ON public.chat_usage (created_at DESC);

-- Create a function to get chat stats for the admin dashboard
CREATE OR REPLACE FUNCTION public.get_chat_stats(_days int DEFAULT 30)
RETURNS TABLE (
  total_messages bigint,
  today_messages bigint,
  unique_users bigint,
  today_users bigint,
  daily_breakdown jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH daily AS (
    SELECT 
      date_trunc('day', created_at)::date AS day,
      count(*) AS cnt,
      count(DISTINCT COALESCE(user_id::text, ip_address)) AS users
    FROM public.chat_usage
    WHERE created_at >= now() - (_days || ' days')::interval
    GROUP BY 1
    ORDER BY 1
  )
  SELECT
    (SELECT count(*) FROM public.chat_usage) AS total_messages,
    (SELECT count(*) FROM public.chat_usage WHERE created_at >= date_trunc('day', now())) AS today_messages,
    (SELECT count(DISTINCT COALESCE(user_id::text, ip_address)) FROM public.chat_usage) AS unique_users,
    (SELECT count(DISTINCT COALESCE(user_id::text, ip_address)) FROM public.chat_usage WHERE created_at >= date_trunc('day', now())) AS today_users,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('date', day, 'messages', cnt, 'users', users) ORDER BY day) FROM daily), '[]'::jsonb) AS daily_breakdown;
$$;
