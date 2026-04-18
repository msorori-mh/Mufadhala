create or replace function public.get_lesson_question_counts(_lesson_ids uuid[])
returns table (lesson_id uuid, q_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select q.lesson_id, count(*)::bigint as q_count
  from public.questions q
  where q.lesson_id = any(_lesson_ids)
  group by q.lesson_id;
$$;