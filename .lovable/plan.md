

# تغيير حدود المحتوى المجاني وإزالة قيود المحاكي للمشتركين

## ملخص التغييرات

### 1. زيادة الدروس المجانية من 3 إلى 10
- تحديث القيمة الافتراضية في `app_cache` عبر أداة الإدراج (INSERT/UPDATE)
- تحديث القيم الافتراضية (fallback) في الكود من `3` إلى `10` في:
  - `src/pages/LessonsList.tsx` (سطر 210)
  - `src/pages/LessonDetail.tsx` (سطر 124)
- تحديث دالة `is_free_lesson` في قاعدة البيانات لتغيير القيمة الافتراضية من 3 إلى 10

### 2. السماح بـ 20 سؤال مجاني قبل طلب الاشتراك
- تحديث `usePaywallTrigger.ts`: تغيير حد `questionInteractions` من `3` إلى `20`
- تحديث حد `completedLessons` من `2` إلى `10` ليتوافق مع الدروس المجانية الجديدة

### 3. إزالة حد المحاولات للمشتركين في المحاكي
- في `src/features/exams/hooks/useExamEngine.ts` (سطر 502-503): إزالة شرط `attemptsUsed < MAX_ATTEMPTS` للمشتركين — جعل `canStartOnline` غير مقيد بعدد المحاولات عند وجود اشتراك نشط
- نفس التغيير في `src/features/exams/hooks/useTrueExamEngine.ts` إن وُجد نفس القيد

## تفاصيل تقنية

**قاعدة البيانات:**
- تحديث `app_cache` بقيمة `free_lessons_count = 10`
- تحديث دالة `is_free_lesson` (migration) لتغيير fallback من 3 إلى 10

**ملفات الكود المتأثرة (4 ملفات):**
- `src/pages/LessonsList.tsx` — fallback value
- `src/pages/LessonDetail.tsx` — fallback value
- `src/hooks/usePaywallTrigger.ts` — حدود التفعيل
- `src/features/exams/hooks/useExamEngine.ts` — إزالة حد المحاولات للمشتركين

