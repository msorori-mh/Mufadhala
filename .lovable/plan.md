

## خطة: إيقاف عرض التخصص مؤقتاً للطالب

### الملخص
إخفاء حقل اختيار التخصص من واجهات الطالب (إكمال الملف الشخصي، الملف الشخصي، لوحة التحكم)، بحيث يختار الطالب فقط الجامعة والكلية. التخصص يبقى في قاعدة البيانات ويمكن تفعيله لاحقاً.

### التعديلات

**1. صفحة إكمال الملف الشخصي (`src/pages/CompleteProfile.tsx`):**
- إزالة حقل اختيار التخصص من الخطوة 2
- إزالة تحميل التخصصات (useEffect الخاص بالمجورز)
- تغيير شرط التفعيل من `!majorId` إلى `!collegeId` في زر الحفظ
- تغيير فحص اكتمال الملف من `student?.major_id` إلى `student?.college_id`
- إرسال `major_id: null` عند الحفظ

**2. صفحة الملف الشخصي (`src/pages/StudentProfile.tsx`):**
- إخفاء حقل اختيار التخصص
- تعديل الوصف من "الجامعة والكلية والتخصص" إلى "الجامعة والكلية"

**3. لوحة التحكم (`src/pages/Dashboard.tsx`):**
- تغيير تنبيه إكمال الملف من `!student.major_id` إلى `!student.college_id`
- تعديل استعلام الدروس ليعتمد على `college_id` بدلاً من `major_id`

**4. توجيه المصادقة (`src/lib/authRouting.ts`):**
- تغيير الفحص من `student?.major_id` إلى `student?.college_id`

### الملفات المتأثرة
- `src/pages/CompleteProfile.tsx`
- `src/pages/StudentProfile.tsx`
- `src/pages/Dashboard.tsx`
- `src/lib/authRouting.ts`

