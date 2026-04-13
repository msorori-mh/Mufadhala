-- Sync college_id and university_id from auth metadata for affected students
-- Sets both university_id and college_id together to satisfy the validation trigger

CREATE OR REPLACE FUNCTION public.sync_student_metadata_from_auth()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer := 0;
  _rec record;
  _meta jsonb;
  _university_id uuid;
  _college_id uuid;
BEGIN
  FOR _rec IN 
    SELECT s.user_id, u.raw_user_meta_data
    FROM public.students s
    JOIN auth.users u ON u.id = s.user_id
    WHERE s.college_id IS NULL
      AND u.raw_user_meta_data->>'college_id' IS NOT NULL
  LOOP
    _meta := _rec.raw_user_meta_data;
    
    BEGIN
      _university_id := (_meta->>'university_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      _university_id := NULL;
    END;
    
    BEGIN
      _college_id := (_meta->>'college_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      _college_id := NULL;
    END;
    
    -- Only update if BOTH university and college are valid
    IF _college_id IS NOT NULL AND _university_id IS NOT NULL THEN
      -- Verify the relationship exists
      IF EXISTS (SELECT 1 FROM public.colleges WHERE id = _college_id AND university_id = _university_id) THEN
        UPDATE public.students 
        SET university_id = _university_id,
            college_id = _college_id,
            first_name = COALESCE(NULLIF(_meta->>'first_name', ''), first_name),
            fourth_name = COALESCE(NULLIF(_meta->>'fourth_name', ''), fourth_name),
            governorate = COALESCE(NULLIF(_meta->>'governorate', ''), governorate),
            phone = COALESCE(NULLIF(_meta->>'phone', ''), phone)
        WHERE user_id = _rec.user_id;
        _count := _count + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN _count;
END;
$$;

SELECT public.sync_student_metadata_from_auth();

DROP FUNCTION IF EXISTS public.sync_student_metadata_from_auth();