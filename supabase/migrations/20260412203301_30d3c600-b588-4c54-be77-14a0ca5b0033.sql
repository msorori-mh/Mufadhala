INSERT INTO public.subjects (id, name_ar, name_en, code, icon, is_active, display_order)
VALUES
  ('a1b2c3d4-1111-4000-8000-000000000001', 'اللغة الإنجليزية', 'English', 'english', 'Languages', true, 3),
  ('a1b2c3d4-2222-4000-8000-000000000002', 'الرياضيات', 'Mathematics', 'math', 'Calculator', true, 4),
  ('a1b2c3d4-3333-4000-8000-000000000003', 'الفيزياء', 'Physics', 'physics', 'Atom', true, 5),
  ('a1b2c3d4-4444-4000-8000-000000000004', 'الحاسوب', 'Computer Science', 'computer', 'Monitor', true, 6),
  ('a1b2c3d4-5555-4000-8000-000000000005', 'اللغة العربية', 'Arabic', 'arabic', 'BookOpen', true, 7)
ON CONFLICT DO NOTHING;