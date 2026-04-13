
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _meta jsonb;
  _first_name text;
  _university_id uuid;
  _college_id uuid;
  _major_id uuid;
BEGIN
  _meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  _first_name := COALESCE(
    _meta->>'first_name',
    _meta->>'name',
    _meta->>'full_name',
    split_part(COALESCE(NEW.email, ''), '@', 1)
  );

  -- Safely cast UUID fields, defaulting to NULL on invalid input
  BEGIN
    _university_id := CASE 
      WHEN _meta->>'university_id' IS NOT NULL 
           AND _meta->>'university_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (_meta->>'university_id')::uuid 
      ELSE NULL END;
  EXCEPTION WHEN OTHERS THEN
    _university_id := NULL;
  END;

  BEGIN
    _college_id := CASE 
      WHEN _meta->>'college_id' IS NOT NULL 
           AND _meta->>'college_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (_meta->>'college_id')::uuid 
      ELSE NULL END;
  EXCEPTION WHEN OTHERS THEN
    _college_id := NULL;
  END;

  BEGIN
    _major_id := CASE 
      WHEN _meta->>'major_id' IS NOT NULL 
           AND _meta->>'major_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (_meta->>'major_id')::uuid 
      ELSE NULL END;
  EXCEPTION WHEN OTHERS THEN
    _major_id := NULL;
  END;

  INSERT INTO public.students (
    user_id, first_name, second_name, third_name, fourth_name,
    governorate, gpa, coordination_number,
    university_id, college_id, major_id
  ) VALUES (
    NEW.id,
    NULLIF(_first_name, ''),
    _meta->>'second_name',
    _meta->>'third_name',
    _meta->>'fourth_name',
    _meta->>'governorate',
    CASE WHEN _meta->>'high_school_gpa' IS NOT NULL 
         THEN (_meta->>'high_school_gpa')::numeric 
         ELSE NULL END,
    _meta->>'coordination_number',
    _university_id,
    _college_id,
    _major_id
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');

  RETURN NEW;
END;
$function$;
