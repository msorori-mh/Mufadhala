
-- Revoke direct API access to the materialized view
REVOKE ALL ON public.mv_leaderboard FROM anon, authenticated;

-- Grant access only to the function (which is SECURITY DEFINER)
-- The get_leaderboard function already has SECURITY DEFINER, so it bypasses this
