
-- Create a leaderboard function that returns top students by average exam score
-- Uses SECURITY DEFINER to bypass RLS safely and only exposes necessary data
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  _limit integer DEFAULT 50,
  _major_id uuid DEFAULT NULL
)
RETURNS TABLE (
  rank bigint,
  student_id uuid,
  first_name text,
  fourth_name text,
  college_name text,
  major_name text,
  avg_score numeric,
  total_exams bigint,
  best_score numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY AVG(ea.score::numeric / ea.total * 100) DESC) AS rank,
    s.id AS student_id,
    COALESCE(LEFT(s.first_name, 1) || '***', '***') AS first_name,
    COALESCE(s.fourth_name, '') AS fourth_name,
    COALESCE(c.name_ar, '') AS college_name,
    COALESCE(m.name_ar, '') AS major_name,
    ROUND(AVG(ea.score::numeric / ea.total * 100), 1) AS avg_score,
    COUNT(ea.id) AS total_exams,
    ROUND(MAX(ea.score::numeric / ea.total * 100), 1) AS best_score
  FROM exam_attempts ea
  JOIN students s ON s.id = ea.student_id
  LEFT JOIN colleges c ON c.id = s.college_id
  LEFT JOIN majors m ON m.id = s.major_id
  WHERE ea.completed_at IS NOT NULL
    AND ea.total > 0
    AND (_major_id IS NULL OR ea.major_id = _major_id)
  GROUP BY s.id, s.first_name, s.fourth_name, c.name_ar, m.name_ar
  HAVING COUNT(ea.id) >= 2
  ORDER BY avg_score DESC
  LIMIT _limit;
$$;
