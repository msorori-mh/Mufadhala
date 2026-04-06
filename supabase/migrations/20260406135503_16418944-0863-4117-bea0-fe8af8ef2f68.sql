-- 1. Remove student INSERT policy on exam_attempts (now handled by edge function)
DROP POLICY IF EXISTS "Students can create own attempts" ON public.exam_attempts;

-- 2. Remove duplicate receipts INSERT policy
DROP POLICY IF EXISTS "Users can upload receipts" ON storage.objects;
