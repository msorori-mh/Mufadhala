

## المشكلة

في صفحة `/past-exams` الطلاب يرون كل النماذج (ما عدا أول نموذج بالسنة الأقدم) مُعلَّمة كـ "مدفوع" ومقفلة، لأن الكود يعتمد قاعدة ضمنية: "أول نموذج (الأقدم) مجاني، والباقي مدفوع تلقائياً" — متجاهلاً عمود `is_paid` الموجود فعلاً في جدول `past_exam_models`.

## الحل المقترح

اعتماد عمود `is_paid` (الموجود بالفعل في DB) كمصدر وحيد للقرار، وحذف منطق "أول نموذج مجاني".

### 1. صفحة الطالب `src/pages/PastExams.tsx`
- حذف `firstFreeModelId` و `useMemo` المرتبط
- تغيير شرط القفل من `!isFirstFree && !hasActiveSubscription` إلى **`model.is_paid && !hasActiveSubscription`**
- النماذج المجانية (`is_paid = false`) متاحة للجميع بدون اشتراك

### 2. صفحة الممارسة `src/pages/PastExamPractice.tsx`
- حذف الاستعلام `is-first-free-model` بالكامل
- تغيير شرط القفل من `!isFirstFreeModel && !hasActiveSubscription` إلى **`model.is_paid && !hasActiveSubscription`**
- تعديل `ModeSelector` prop: استبدال `isFreeModel` بـ `!model.is_paid` (أو حذفها لو لا تُستخدم)

### 3. لوحة الإدارة `src/pages/admin/AdminPastExams.tsx`
- التحقق من وجود واجهة لتعديل `is_paid`، وإن لم تكن موجودة بشكل واضح، إضافة Switch بجانب كل نموذج (مدفوع / مجاني) في القائمة + داخل نموذج الإنشاء/التعديل

### 4. تحديث الذاكرة `mem://features/past-exam-models`
- حذف ذكر "أول نموذج مجاني تلقائياً"
- إضافة "is_paid هو المصدر الوحيد لتحديد القفل"

## الملفات المعدَّلة

| الملف | التغيير |
|---|---|
| `src/pages/PastExams.tsx` | حذف منطق "أول نموذج مجاني"، استخدام `is_paid` |
| `src/pages/PastExamPractice.tsx` | حذف استعلام `is-first-free-model`، استخدام `is_paid` |
| `src/pages/admin/AdminPastExams.tsx` | التأكد من / إضافة محوّل (Switch) "مدفوع / مجاني" لكل نموذج |
| `src/pages/past-exam/ModeSelector.tsx` | (إن لزم) تحديث prop المتعلق بكون النموذج مجانياً |
| `mem://features/past-exam-models` | تحديث القاعدة |

## النتيجة المتوقعة

- النماذج التي يُحدّدها المسؤول كـ "مجاني" (`is_paid = false`) تظهر متاحة لجميع الطلاب
- النماذج المعلَّمة كـ "مدفوع" فقط هي التي تتطلب اشتراكاً
- لا يوجد أي قاعدة ضمنية مبنية على ترتيب السنة
- المسؤول يتحكم بشكل كامل من لوحة الإدارة في حالة كل نموذج

