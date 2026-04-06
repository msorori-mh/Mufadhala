

## خطة: نظام صلاحيات تفصيلية للمشرفين

### المشكلة الحالية
المشرف حالياً لديه **نطاق** (جامعة/كلية/تخصص) فقط، لكن جميع المشرفين يرون نفس الصفحات ولديهم نفس الإمكانيات. لا توجد طريقة لتقييد مشرف بإدارة المحتوى فقط أو الدفع فقط.

### الحل
إضافة جدول `moderator_permissions` يحدد **ما يمكن للمشرف فعله** (بجانب النطاق الموجود الذي يحدد **أين**).

### الصلاحيات المقترحة

| الصلاحية | الوصف |
|-----------|--------|
| `content` | إدارة المحتوى التعليمي (دروس، أسئلة) |
| `students` | عرض وإدارة بيانات الطلاب |
| `payments` | إدارة طلبات الدفع (مراجعة، قبول، رفض) |
| `payment_methods` | إدارة طرق الدفع |
| `subscriptions` | إدارة إعدادات الاشتراك |
| `reports` | الوصول إلى التقارير |
| `universities` | إدارة الجامعات والكليات والتخصصات |

**ملاحظة:** الأدمن لديه كل الصلاحيات تلقائياً دون الحاجة لإدخالها.

### خطوات التنفيذ

#### 1. إنشاء جدول `moderator_permissions` (Migration)
```sql
CREATE TABLE public.moderator_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  permission text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);
ALTER TABLE public.moderator_permissions ENABLE ROW LEVEL SECURITY;
-- سياسات: الأدمن يدير، المشرف يرى صلاحياته فقط
```

#### 2. إنشاء دالة `has_permission` (Migration)
دالة `SECURITY DEFINER` للتحقق من الصلاحيات بأمان:
```sql
CREATE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean ...
-- تُرجع true إذا كان المستخدم admin أو لديه الصلاحية المحددة
```

#### 3. تحديث صفحة إدارة المستخدمين (`AdminUsers.tsx`)
- إضافة قسم "الصلاحيات" بجانب قسم "النطاق" الموجود للمشرفين
- عرض الصلاحيات الحالية كـ badges مع إمكانية الإضافة والحذف
- Checkbox list لاختيار الصلاحيات عند إضافتها

#### 4. إنشاء hook جديد `useModeratorPermissions`
- يجلب صلاحيات المستخدم الحالي
- يوفر دالة `hasPermission(permission)` للتحقق السريع
- الأدمن يُرجع `true` دائماً

#### 5. تحديث `AdminLayout.tsx`
- إخفاء عناصر القائمة الجانبية التي لا يملك المشرف صلاحية الوصول إليها
- مثال: مشرف بصلاحية `content` فقط يرى "المحتوى" فقط في القائمة

#### 6. تحديث صفحات الأدمن الفرعية
- كل صفحة تتحقق من الصلاحية المناسبة عند التحميل
- إعادة التوجيه إلى `/admin` إذا لم يكن لديه الصلاحية

### الملفات المتأثرة
- **جديد:** `src/hooks/useModeratorPermissions.ts`
- **تعديل:** `src/pages/admin/AdminUsers.tsx` - إضافة إدارة الصلاحيات
- **تعديل:** `src/components/admin/AdminLayout.tsx` - إخفاء العناصر بحسب الصلاحيات
- **تعديل:** صفحات الأدمن الفرعية - التحقق من الصلاحية
- **Migration:** إنشاء الجدول والدالة

