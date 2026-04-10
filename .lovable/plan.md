

## إضافة دعم ملفات بوربوينت للدروس

### الفكرة
إضافة إمكانية رفع ملف بوربوينت (PPTX) لكل درس، مع عرض الشرائح تفاعلياً داخل صفحة الدرس + إمكانية تحميل الملف الأصلي.

### الخطوات

**1. تعديل قاعدة البيانات**
- إضافة عمود `presentation_url` (text, nullable) لجدول `lessons` لحفظ رابط ملف البوربوينت.

**2. إنشاء Storage Bucket**
- إنشاء bucket جديد باسم `lesson-presentations` (عام) لتخزين ملفات PPTX.
- إضافة سياسات RLS: الأدمن والمشرفون يرفعون ويحذفون، الجميع يقرأ.

**3. تعديل واجهة إدارة المحتوى (`AdminContent.tsx`)**
- إضافة حقل رفع ملف PPTX في نموذج إضافة/تعديل الدرس.
- عند الرفع: حفظ الملف في Storage وتخزين الرابط في `presentation_url`.
- إضافة عمود "رابط العرض" في قالب الاستيراد عبر Excel.

**4. تحويل PPTX إلى صور عبر Edge Function**
- إنشاء Edge Function (`convert-pptx`) تستقبل رابط ملف PPTX.
- تستخدم مكتبة لتحويل كل شريحة إلى صورة (PNG/JPG).
- ترفع الصور إلى Storage وتعيد قائمة بروابطها.
- **بديل أبسط**: استخدام خدمة خارجية مثل Google Docs Viewer أو Office Online لعرض الملف مباشرة بـ iframe بدون تحويل.

**5. عرض العرض التقديمي في صفحة الدرس (`LessonDetail.tsx`)**
- إضافة تبويب "العرض التقديمي" بجانب "المحتوى" و"الأسئلة".
- عرض الشرائح كصور مع أزرار التنقل (السابق/التالي).
- زر تحميل الملف الأصلي.

### نقطة قرار مهمة

تحويل PPTX إلى صور داخل Edge Function معقد تقنياً (يحتاج LibreOffice أو مكتبة ثقيلة غير متاحة في Deno). البديل الأسهل والأسرع:

**الخيار المُقترح**: عرض الملف عبر **Google Docs Viewer** بـ iframe:
```
https://docs.google.com/gview?url=FILE_URL&embedded=true
```
هذا لا يتطلب تحويل ولا Edge Function إضافية، ويعمل مباشرة مع أي ملف PPTX عام.

### التفاصيل التقنية
- **ملفات للتعديل**: `AdminContent.tsx`, `LessonDetail.tsx`, `LessonsList.tsx` (إضافة أيقونة تدل على وجود عرض)
- **Migration**: إضافة عمود `presentation_url` لجدول `lessons`
- **Storage**: bucket جديد `lesson-presentations`
- **لا حاجة لـ Edge Function** مع خيار Google Docs Viewer

