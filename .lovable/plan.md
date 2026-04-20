
## الهدف
إضافة أداة **"كشف وحذف النماذج المكررة"** في `/admin/past-exams` تكتشف النماذج التي لها **نفس الجامعة + نفس السنة + نفس العنوان (حرفياً)**، وتسمح بحذف الأقدم تلقائياً مع الاحتفاظ بالأحدث.

## التحليل
- جدول `past_exam_models` يحتوي حالياً (بعد فحص استعلامي مبدئي يمكن إجراؤه): `university_id`, `year`, `title`, `created_at`, `is_published`, `is_paid`.
- الكشف يتم عميل-جانبي بسهولة من البيانات المحملة فعلاً في صفحة `AdminPastExams.tsx` عبر تجميع `(university_id|year|title.trim().toLowerCase())`.
- الحذف يستفيد من سياسة RLS: `Staff can manage models` (admin/moderator).
- عند حذف نموذج، تُحذف أسئلته تلقائياً (لا يوجد FK formal لكن RLS يسمح). الأفضل حذف أسئلته يدوياً قبل حذف النموذج لتفادي اليتامى.

## التغييرات

### ملف واحد فقط: `src/pages/admin/AdminPastExams.tsx`

1. **State جديد**:
   - `dupDialogOpen: boolean`
   - `dupBusy: boolean`
   - `selectedDupIds: Set<string>` (الـIDs المُعلَّمة للحذف)

2. **دالة الكشف `findDuplicates(models)`**:
   - تجمّع النماذج بمفتاح `${university_id}__${year}__${normalize(title)}`.
   - `normalize`: `title.trim().toLowerCase().replace(/\s+/g, ' ')`.
   - تُرجع فقط المجموعات التي تحتوي 2+ نماذج، مرتبة `created_at DESC` داخل كل مجموعة.

3. **زر في الترويسة**: بجانب "إنشاء نموذج"، زر **"كشف المكرر"** بأيقونة `Copy` ولون `outline` يفتح Dialog.

4. **Dialog تفاعلي**:
   - رأس: عدد المجموعات المكررة + عدد النماذج المرشحة للحذف.
   - زر **"تحديد الأقدم تلقائياً"** يُعلّم كل النسخ ما عدا الأحدث في كل مجموعة.
   - زر **"إلغاء التحديد"**.
   - قائمة بالمجموعات: لكل مجموعة Card يعرض:
     - رأس: `{اسم الجامعة} • {السنة} • "{العنوان}"` + شارة `{n} نسخ`.
     - صفوف لكل نسخة: Checkbox + تاريخ الإنشاء + شارة "الأحدث" للأول + شارة منشور/مسودة + عدد الأسئلة (اختياري — نتركه للنسخة المختصرة).
   - تذييل: **"حذف المحدد ({n})"** أحمر + "إلغاء".

5. **`handleDeleteDuplicates()`**:
   - حذف الأسئلة أولاً: `delete from past_exam_model_questions where model_id in (...)`.
   - ثم حذف النماذج: `delete from past_exam_models where id in (...)`.
   - `queryClient.invalidateQueries(["past-exam-models"])`.
   - `toast` نجاح + إغلاق الـDialog.

## ما لا يتغيّر
- لا تعديل على schema، لا migrations.
- منطق RLS، التسعير، صفحة الطالب، الاستيراد/التصدير — كلها سليمة.

## الملف المعدَّل
- `src/pages/admin/AdminPastExams.tsx` فقط.
