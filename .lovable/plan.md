

# استخدام المواد المرتبطة بالكلية (`college_subjects`) في صفحة الدروس والاختبارات

## ملخص
حالياً، صفحة الدروس تجلب المواد من جدول `major_subjects` (المواد المرتبطة بالتخصص). المطلوب هو إضافة استعلام لجلب المواد من `college_subjects` (المرتبطة بالكلية) واستخدامها كمصدر أساسي أو بديل عند عدم وجود مواد مرتبطة بالتخصص.

## التغييرات

### 1. تحديث `src/pages/LessonsList.tsx`
- تعديل استعلام جلب المواد ليجلب أولاً من `college_subjects` باستخدام `college_id` الخاص بالطالب
- إذا لم يتوفر `college_id`، يرجع للاستعلام الحالي من `major_subjects`
- تحديث `queryKey` ليشمل `college_id`

### 2. تحديث `src/pages/ExamSimulator.tsx`
- إضافة نفس المنطق لجلب المواد المرتبطة بكلية الطالب
- استخدامها لتصنيف الأسئلة حسب المادة في واجهة الاختبار

### 3. تحديث `src/hooks/useStudentData.ts`
- التأكد من أن `college_id` يُجلب مع بيانات الطالب (موجود بالفعل في جدول `students`)

## المنطق
```text
if student.college_id exists:
  → fetch from college_subjects WHERE college_id = student.college_id
  → join with subjects table to get name_ar, code
else if student.major_id exists:
  → fallback to major_subjects (السلوك الحالي)
```

## الملفات المعدّلة
1. **`src/pages/LessonsList.tsx`** — تعديل استعلام المواد
2. **`src/pages/ExamSimulator.tsx`** — إضافة تصنيف المواد حسب الكلية

## ملاحظات
- لا تغييرات في قاعدة البيانات (جدول `college_subjects` وسياسات RLS موجودة بالفعل)
- الأولوية لـ `college_subjects` ثم `major_subjects` كبديل

