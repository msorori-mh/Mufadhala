

## الفهم
في `/admin/students` خانة البحث تعرض حالياً "بحث بالاسم أو رقم التنسيق..."، لكن البحث الفعلي يطابق على `name` و `coordination_number`. المطلوب تغييره ليكون البحث بالاسم أو رقم الهاتف.

## الحل
ملف واحد: `src/pages/admin/AdminStudents.tsx`

### 1) تحديث منطق الفلترة (السطر 126-129)
```ts
if (search) {
  const q = search.toLowerCase().trim();
  const name = getFullName(s).toLowerCase();
  return name.includes(q) || (s.phone || "").toLowerCase().includes(q);
}
```

### 2) تحديث نص الـ placeholder (السطر 292)
```tsx
<Input placeholder="بحث بالاسم أو رقم الهاتف..." ... />
```

### النطاق
- ملف واحد، تغييران سطريان.
- لا تغييرات DB، لا تغيير في التصدير أو نموذج التعديل (لا يزال `coordination_number` يظهر في تفاصيل الطالب وفي ملف Excel — وهذا منفصل عن البحث).

