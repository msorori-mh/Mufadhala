

## خطة التعديل: عرض اسم المسار الأكاديمي بدلاً من اسم الكلية أو التخصص

### المشكلة الحالية
الكود الحالي في `useStudentAccess.ts` (سطر 73-94) يعمل كالتالي:
- إذا كان الفلتر `major`: يجلب اسم التخصص من جدول `majors`
- إذا كان الفلتر `college`: يجلب اسم المسار من `admission_tracks` عبر الكلية، لكن يرجع لاسم الكلية إذا لم يوجد مسار

**المطلوب**: في كلتا الحالتين، يجب عرض اسم **المسار الأكاديمي** (مثل "المسار الطبي"، "المسار الهندسي/الحاسوب").

### التعديل المطلوب

**ملف واحد**: `src/hooks/useStudentAccess.ts` — تعديل استعلام `filterName` (سطر 73-94)

1. **حالة `major`**: بدلاً من جلب `majors.name_ar`، نجلب المسار عبر: `major_id → majors.college_id → colleges.admission_track_id → admission_tracks.name_ar`
2. **حالة `college`**: نفس المنطق الحالي لكن نضمن أولوية اسم المسار دائماً

المنطق الجديد:
- استخدام `student.college_id` مباشرة (متاح دائماً) لجلب اسم المسار
- استعلام واحد: `colleges → admission_tracks(name_ar)` باستخدام `college_id`
- الرجوع لاسم الكلية فقط كقيمة احتياطية إذا لم يوجد مسار مرتبط

### التفاصيل التقنية
```
// بدلاً من التفريع بين major و college
// نستخدم college_id مباشرة من بيانات الطالب
const collegeId = student?.college_id;

queryFn: fetch colleges.admission_tracks(name_ar) WHERE id = collegeId
return trackName || collegeName || ""
```

هذا يضمن أن العنوان يعكس المسار الأكاديمي (طبي، هندسي، إلخ) بغض النظر عن نوع الفلتر.

