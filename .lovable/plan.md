
## المشكلة
في صفحة التسجيل (`src/pages/Register.tsx`)، حقل **التخصص** لا يظهر مع باقي الحقول عند فتح النموذج، بل يُحقن لاحقاً بعد اختيار الكلية. السبب في السطر 345:

```tsx
{majors.length > 0 && (
  <div>...حقل التخصص...</div>
)}
```

الشرط يخفي الحقل بالكامل عندما تكون قائمة التخصصات فارغة (وهي فارغة حتى يتم اختيار كلية)، فيظهر فجأة بعد اختيار الكلية ويسبب "قفزة" في التخطيط (Layout Shift).

## الحل
عرض حقل التخصص **دائماً** (متناسقاً مع باقي الحقول)، مع تعطيله (`disabled`) ما لم تكن الكلية مختارة وبها تخصصات فعلية. هذه نفس آلية حقل "الكلية" الموجودة (السطر 340: `disabled={!universityId}`).

### الملف الوحيد المعدَّل
`src/pages/Register.tsx` — السطور 345-354 فقط.

### الكود المقترح
```tsx
<div className="space-y-1.5">
  <Label>التخصص</Label>
  <NativeSelect
    value={majorId}
    onValueChange={(value) => setMajorId(value)}
    placeholder={
      !collegeId 
        ? "اختر الكلية أولاً" 
        : majors.length === 0 
          ? "لا توجد تخصصات لهذه الكلية" 
          : "اختر التخصص"
    }
    disabled={!collegeId || majors.length === 0}
    options={majors.map((m) => ({ value: m.id, label: m.name_ar }))}
  />
</div>
```

## ضمانات عدم تكرار الإشكاليات السابقة

بناءً على `mem://technical/registration-stability` و`mem://technical/form-hydration-stability`:

1. ✅ **حقل التخصص هو Select وليس Text Input** — قاعدة "Uncontrolled inputs" لا تنطبق عليه. Select inputs تبقى Controlled (كما هو مذكور صراحة في القاعدة: "Select inputs remain controlled (cascading fetch logic requires reactive state)").
2. ✅ **لن نُعدّل** أي text input (firstName, lastName, phone, GPA) — تبقى uncontrolled.
3. ✅ **لن نضيف** أي draft persistence أو localStorage.
4. ✅ **لن نُعدّل** منطق `useEffect` الخاص بجلب التخصصات (السطور 119-141) — يبقى كما هو.
5. ✅ **لن نُعدّل** دوال `handleUniversityChange` / `handleCollegeChange` — منطق إعادة التعيين المتسلسل يبقى كما هو.
6. ✅ **لن نُعدّل** `validateForm` أو `handleSubmit` — التخصص يبقى اختيارياً (`major_id: majorId || null`).

## ما لن يُمَس
- نموذج إضافة/تعديل الطالب في `AdminStudents.tsx` (لا يوجد فيه إضافة جديد، فقط تعديل، والتعديل يستخدم منطقاً مختلفاً مناسباً).
- آلية الفلترة المتسلسلة في `AdminStudents.tsx`.
- أي حقل نصي في صفحة التسجيل.
- منطق حفظ بيانات الطلاب.

## النتيجة المتوقعة
- جميع الحقول (الجامعة، الكلية، التخصص) تظهر معاً عند فتح النموذج.
- التخصص معطّل بصرياً مع رسالة إرشادية "اختر الكلية أولاً" حتى يتم اختيار الكلية.
- بعد اختيار الكلية: إذا وُجدت تخصصات يصبح الحقل مفعّلاً، وإلا تظهر رسالة "لا توجد تخصصات لهذه الكلية".
- لا توجد قفزة بصرية (Layout Shift) في التخطيط.
