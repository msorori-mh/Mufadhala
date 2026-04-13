
-- Step 1: Drop RLS policies on college_subjects
DROP POLICY IF EXISTS "Public can view college subjects" ON public.college_subjects;
DROP POLICY IF EXISTS "Staff can manage college subjects" ON public.college_subjects;

-- Step 2: Drop the legacy table
DROP TABLE IF EXISTS public.college_subjects;
