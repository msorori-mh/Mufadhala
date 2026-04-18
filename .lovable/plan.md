

## المشكلة

عرض "0 سؤال" خاطئ على معظم بطاقات الدروس، رغم أن كل درس يحتوي فعلياً على 20 سؤالاً.

## السبب الجذري

عند جلب الأسئلة لاحتساب العدد لكل درس في `LessonsList.tsx`:

```ts
supabase.from("questions").select("lesson_id").in("lesson_id", lessonIds)
```

مسار طلاب الكليات الطبية يحتوي على **198 درساً × ~20 سؤال = 3878 سجل**، لكن Supabase يفرض **حداً افتراضياً 1000 صف** لكل استعلام. فيتم احتساب أول ~1000 سؤال فقط، وأي درس لم يصادف ضمنها يظهر "0 سؤال".

تأكدت من قاعدة البيانات: لا توجد دروس مكررة بنفس العنوان، وكل درس فعلاً عنده 20 سؤال — المشكلة استعلامية بحتة.

نفس المشكلة موجودة بصمت في:
- `useTrueExamEngine` و`useExamEngine` (محرّكا الاختبار) — تستثني أسئلة من برك الاختيار
- `SearchContent.tsx` — البحث في الأسئلة
- `useQuickReviewData` (للتأكد)

## الحل

إنشاء **دالة Postgres** ترجع عدد الأسئلة المُجمَّع لكل درس في استعلام واحد، بدون قيد 1000:

```sql
create function public.get_lesson_question_counts(_lesson_ids uuid[])
returns table (lesson_id uuid, q_count bigint)
language sql stable security definer set search_path = public
as $$
  select lesson_id, count(*)::bigint
  from public.questions
  where lesson_id = any(_lesson_ids)
  group by lesson_id
$$;
```

ثم استدعاؤها في `LessonsList.tsx` بدلاً من جلب صفوف الأسئلة:

```ts
const { data: counts } = await supabase.rpc("get_lesson_question_counts", { _lesson_ids: lessonIds });
counts?.forEach(r => { questionCounts[r.lesson_id] = Number(r.q_count); });
```

### إصلاح محرك الاختبار (نفس الجذر)

في `useTrueExamEngine.ts` و`useExamEngine.ts`، استبدال جلب الأسئلة بطلب مُقسَّم (ranges) عبر حلقة `.range(0,999) → .range(1000,1999) ...` حتى تنتهي البيانات، لضمان دخول كل الأسئلة في بركة الاختيار العشوائي.

### نطاق التعديل

| الملف | التعديل |
|---|---|
| `supabase/migrations/...` | إضافة دالة `get_lesson_question_counts` |
| `src/pages/LessonsList.tsx` | استبدال استعلام `questions.select("lesson_id").in(...)` بـ RPC |
| `src/features/exams/hooks/useTrueExamEngine.ts` | جلب الأسئلة بالتقسيم (ranges) |
| `src/features/exams/hooks/useExamEngine.ts` | نفس الإصلاح |
| `src/pages/SearchContent.tsx` | جلب الأسئلة بالتقسيم |

## النتيجة المتوقعة

- جميع بطاقات الدروس ستعرض "20 سؤال" بدقة
- محاكي الاختبار سيختار من بركة كاملة 3878 سؤالاً بدلاً من 1000 فقط
- البحث سيغطي كل الأسئلة

