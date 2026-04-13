

## خطة حل التعارض — إلغاء النموذج الثاني واعتماد الكلية لعرض الدروس

### المشكلة
صفحة الدروس (`LessonsList.tsx`) تحجب المحتوى إذا لم يكن للطالب `major_id`، وتوجّهه لصفحة الملف الشخصي. بما أن جدول التخصصات فارغ، لا يستطيع أي طالب مسجّل رؤية الدروس.

### التغييرات المطلوبة

**1. دالة SQL جديدة — `get_published_lessons_by_college`**
- Migration تنشئ دالة مطابقة لـ `get_published_lessons_list` لكن تفلتر بـ `college_id` بدلاً من `major_id`
```sql
CREATE FUNCTION public.get_published_lessons_by_college(_college_id uuid)
RETURNS TABLE(id uuid, title text, summary text, display_order integer, is_free boolean, major_id uuid)
```

**2. صفحة الدروس — `src/pages/LessonsList.tsx`**
- تغيير شرط الحجب (سطر 278): من `!student?.major_id` إلى `!student?.college_id`
- تعديل رسالة الحجب لتقول "لم يتم اختيار كلية" بدل "تخصص"
- تعديل استعلام الدروس (سطر 110-117):
  - إذا `major_id` موجود → يستخدم `get_published_lessons_list` (السلوك الحالي)
  - إذا غير موجود → يستخدم `get_published_lessons_by_college` مع `college_id`
- تعديل `enabled` ليعمل بـ `collegeId` بدلاً من `majorId` فقط
- تعديل عنوان الصفحة ليعرض اسم الكلية عند عدم وجود تخصص

**3. لا تغيير على:**
- نموذج التسجيل (يبقى كما هو)
- صفحة الملف الشخصي (تبقى الحقول الإضافية اختيارية)
- صفحة `CompleteProfile` (هي بالفعل redirect فقط)

### النتيجة
الطالب بعد التسجيل يدخل مباشرة لصفحة الدروس ويرى دروس كليته بدون أي نموذج إضافي أو حاجز.

