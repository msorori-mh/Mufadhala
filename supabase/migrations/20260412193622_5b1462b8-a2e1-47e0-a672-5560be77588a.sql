ALTER TABLE public.lessons ADD COLUMN grade_level smallint DEFAULT NULL;
COMMENT ON COLUMN public.lessons.grade_level IS '1=أول ثانوي, 2=ثاني ثانوي, 3=ثالث ثانوي';