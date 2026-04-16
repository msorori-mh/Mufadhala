

## الهدف
إضافة فلتر "حالة الاشتراك" قبل فلتر المحافظة في صفحة الطلاب بلوحة تحكم الأدمن، يفلتر بين: الكل / مشترك / غير مشترك. يعمل بالتوازي مع باقي الفلاتر.

## الملف المُعدَّل
`src/pages/admin/AdminStudents.tsx`

## التنفيذ

### 1) جلب بيانات الاشتراكات
داخل `fetchData`، أضف استعلاماً لجلب الاشتراكات النشطة (نفس منطق `has_active_subscription`):
```ts
supabase.from("subscriptions").select("user_id, status, expires_at, trial_ends_at")
```
ثم احسب مجموعة `activeSubUserIds: Set<string>` تضم المستخدمين الذين لديهم اشتراك إما:
- `status = 'active'` و(`expires_at` فارغ أو في المستقبل)، أو
- `status = 'trial'` و`trial_ends_at` في المستقبل.

### 2) state جديد للفلتر
```ts
const [filterSubscription, setFilterSubscription] = useState<"" | "subscribed" | "unsubscribed">("");
```

### 3) منطق الفلترة في `filtered`
أضف قبل فحص المحافظة:
```ts
if (filterSubscription === "subscribed" && !activeSubUserIds.has(s.user_id)) return false;
if (filterSubscription === "unsubscribed" && activeSubUserIds.has(s.user_id)) return false;
```

### 4) الواجهة
- في شبكة الفلاتر: تغيير `md:grid-cols-4` إلى `md:grid-cols-5`.
- إضافة `<select>` جديد **قبل** فلتر المحافظة بالخيارات: الكل / مشترك / غير مشترك.
- تحديث `hasActiveFilter` و`clearFilters` ليشملا `filterSubscription`.

### 5) تصدير Excel
إضافة عمود "حالة الاشتراك" (مشترك/غير مشترك) في صفوف التصدير ليعكس الحالة الحالية.

## ما لن يُمَس
- منطق RLS، جلب الطلاب، أدوار الموظفين، تعديل/حذف الطلاب.
- حدود مولّد الأسئلة، التسعير، أو أي شيء خارج صفحة الطلاب.

