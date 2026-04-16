

## تحليل الطلب

الأدمن يريد إضافة صلاحية مخصصة "نماذج الاختبارات السابقة" (`past_exams`) ضمن قائمة صلاحيات المشرفين، بحيث يمكن منحها/سحبها لكل مشرف على حدة، وتتحكم في الوصول إلى صفحة `/admin/past-exams` ومحرر الأسئلة الخاص بها.

## الوضع الحالي

- صفحة `/admin/past-exams` محمية حالياً بصلاحية `content` (المحتوى التعليمي العام) — حسب ما هو موثق في `mem://features/past-exam-models`.
- قائمة الصلاحيات في `src/hooks/useModeratorPermissions.ts` تضم 7 صلاحيات: `content, students, payments, payment_methods, subscriptions, reports, universities`.
- الأدمن يدير الصلاحيات من صفحة `/admin/users` (واجهة منح/سحب لكل مشرف).

## التغييرات المطلوبة

### 1. `src/hooks/useModeratorPermissions.ts`
- إضافة `"past_exams"` إلى `ModeratorPermission` type.
- إضافة label عربي: `past_exams: "نماذج الاختبارات السابقة"`.
- إضافتها إلى `ALL_PERMISSIONS`.

### 2. `src/pages/admin/AdminPastExams.tsx` (وصفحة محرر الأسئلة إن وُجدت كصفحة منفصلة)
- تغيير `<PermissionGate permission="content">` إلى `<PermissionGate permission="past_exams">`.

### 3. `src/components/admin/AdminLayout.tsx`
- التأكد أن عنصر القائمة "الاختبارات السابقة" يظهر/يختفي بناءً على صلاحية `past_exams` (إن كان موجوداً مع منطق إخفاء حسب الصلاحية).

### 4. لا حاجة لـ migration على قاعدة البيانات
- جدول `moderator_permissions` يخزّن الصلاحية كـ `text` بدون CHECK constraint، لذا الإضافة على مستوى الكود فقط كافية.

### 5. تحديث الذاكرة
- تحديث `mem://features/past-exam-models` لتغيير سطر "Admin permission: content" إلى "Admin permission: past_exams".
- تحديث `mem://features/moderator-access-control` (إن لزم) لذكر الصلاحية الجديدة.

## ملاحظة مهمة
المشرفون الحاليون الذين كانوا يعتمدون على `content` للوصول للنماذج السابقة سيفقدون الوصول. سأنبّه الأدمن في الرد النهائي ليمنحهم الصلاحية الجديدة يدوياً من `/admin/users`.

## الخطوات
1. تحديث `useModeratorPermissions.ts` (إضافة النوع + label + ALL_PERMISSIONS).
2. تحديث `PermissionGate` في `AdminPastExams.tsx`.
3. تحديث رابط القائمة في `AdminLayout.tsx` إن لزم.
4. تحديث ملفّي الذاكرة.
5. تنبيه الأدمن لمنح الصلاحية للمشرفين الحاليين.

