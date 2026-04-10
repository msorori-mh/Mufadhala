
-- 1) Materialized View for leaderboard
CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_leaderboard AS
SELECT
  ROW_NUMBER() OVER (ORDER BY AVG(ea.score::numeric / ea.total * 100) DESC) AS rank,
  s.id AS student_id,
  COALESCE(LEFT(s.first_name, 1) || '***', '***') AS first_name,
  COALESCE(s.fourth_name, '') AS fourth_name,
  COALESCE(c.name_ar, '') AS college_name,
  COALESCE(m.name_ar, '') AS major_name,
  s.major_id,
  ROUND(AVG(ea.score::numeric / ea.total * 100), 1) AS avg_score,
  COUNT(ea.id) AS total_exams,
  ROUND(MAX(ea.score::numeric / ea.total * 100), 1) AS best_score
FROM exam_attempts ea
JOIN students s ON s.id = ea.student_id
LEFT JOIN colleges c ON c.id = s.college_id
LEFT JOIN majors m ON m.id = s.major_id
WHERE ea.completed_at IS NOT NULL
  AND ea.total > 0
GROUP BY s.id, s.first_name, s.fourth_name, c.name_ar, m.name_ar, s.major_id
HAVING COUNT(ea.id) >= 2
ORDER BY avg_score DESC;

-- Unique index required for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_leaderboard_student ON public.mv_leaderboard (student_id);

-- Filter index for major
CREATE INDEX IF NOT EXISTS idx_mv_leaderboard_major ON public.mv_leaderboard (major_id);

-- Rank/score index for sorting
CREATE INDEX IF NOT EXISTS idx_mv_leaderboard_rank ON public.mv_leaderboard (rank);

-- 2) Function to refresh materialized view concurrently (safe for production)
CREATE OR REPLACE FUNCTION public.refresh_leaderboard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_leaderboard;
END;
$$;

-- 3) Replace get_leaderboard to read from MV instead of raw tables
CREATE OR REPLACE FUNCTION public.get_leaderboard(_limit integer DEFAULT 50, _major_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(rank bigint, student_id uuid, first_name text, fourth_name text, college_name text, major_name text, avg_score numeric, total_exams bigint, best_score numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY lb.avg_score DESC) AS rank,
    lb.student_id,
    lb.first_name,
    lb.fourth_name,
    lb.college_name,
    lb.major_name,
    lb.avg_score,
    lb.total_exams,
    lb.best_score
  FROM public.mv_leaderboard lb
  WHERE (_major_id IS NULL OR lb.major_id = _major_id)
  ORDER BY lb.avg_score DESC
  LIMIT _limit;
$$;

-- 4) Simple TTL-based cache table
CREATE TABLE IF NOT EXISTS public.app_cache (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS on cache table
ALTER TABLE public.app_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cache"
ON public.app_cache FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage cache"
ON public.app_cache FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5) Helper function to get cached value or NULL if expired
CREATE OR REPLACE FUNCTION public.get_cache(_key text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public.app_cache
  WHERE key = _key AND expires_at > now()
  LIMIT 1;
$$;

-- 6) Helper function to set cache with TTL
CREATE OR REPLACE FUNCTION public.set_cache(_key text, _value jsonb, _ttl_seconds integer DEFAULT 300)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.app_cache (key, value, expires_at)
  VALUES (_key, _value, now() + (_ttl_seconds || ' seconds')::interval)
  ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    expires_at = EXCLUDED.expires_at,
    created_at = now();
END;
$$;

-- 7) Trigger: auto-refresh leaderboard when an exam is completed
CREATE OR REPLACE FUNCTION public.trigger_refresh_leaderboard_on_exam()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only refresh when an exam is newly completed
  IF NEW.completed_at IS NOT NULL AND (OLD.completed_at IS NULL OR OLD.completed_at IS DISTINCT FROM NEW.completed_at) THEN
    PERFORM public.refresh_leaderboard();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_refresh_leaderboard_on_exam_complete
AFTER UPDATE ON public.exam_attempts
FOR EACH ROW
EXECUTE FUNCTION public.trigger_refresh_leaderboard_on_exam();
