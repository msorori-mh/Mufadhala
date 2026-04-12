

# تغيير اسم العمود `acceptance_rate` إلى `capacity`

## ملخص
إعادة تسمية العمود `acceptance_rate` في جدول `colleges` إلى `capacity` في قاعدة البيانات، وتحديث جميع الملفات التي تشير إليه.

## التغييرات

### 1. Migration لقاعدة البيانات
```sql
ALTER TABLE public.colleges RENAME COLUMN acceptance_rate TO capacity;
```

### 2. تحديث الملفات البرمجية
- **`src/pages/admin/AdminColleges.tsx`** — تغيير كل إشارة إلى `acceptance_rate` → `capacity` (في openEdit، handleSave payload، getAdmissionCompleteness، وعرض البطاقات)
- **`src/pages/CollegeGuide.tsx`** — تغيير `c.acceptance_rate` → `c.capacity` في تصدير PDF وعرض البطاقات

ملاحظة: ملف `types.ts` سيتحدث تلقائياً بعد تطبيق الـ Migration.

