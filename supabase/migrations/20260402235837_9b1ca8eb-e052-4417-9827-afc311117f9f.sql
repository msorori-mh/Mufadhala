-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _meta jsonb;
BEGIN
  _meta := NEW.raw_user_meta_data;

  -- Insert student record
  INSERT INTO public.students (
    user_id,
    first_name,
    second_name,
    third_name,
    fourth_name,
    governorate,
    gpa,
    coordination_number,
    university_id,
    college_id,
    major_id
  ) VALUES (
    NEW.id,
    _meta->>'first_name',
    _meta->>'second_name',
    _meta->>'third_name',
    _meta->>'fourth_name',
    _meta->>'governorate',
    CASE WHEN _meta->>'high_school_gpa' IS NOT NULL 
         THEN (_meta->>'high_school_gpa')::numeric 
         ELSE NULL END,
    _meta->>'coordination_number',
    CASE WHEN _meta->>'university_id' IS NOT NULL AND _meta->>'university_id' != ''
         THEN (_meta->>'university_id')::uuid 
         ELSE NULL END,
    CASE WHEN _meta->>'college_id' IS NOT NULL AND _meta->>'college_id' != ''
         THEN (_meta->>'college_id')::uuid 
         ELSE NULL END,
    CASE WHEN _meta->>'major_id' IS NOT NULL AND _meta->>'major_id' != ''
         THEN (_meta->>'major_id')::uuid 
         ELSE NULL END
  );

  -- Assign student role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');

  RETURN NEW;
END;
$$;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();