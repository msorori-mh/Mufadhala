
المستخدم يريد تحويل أزرار الهيدر في Dashboard (الإعدادات، تسجيل الخروج) إلى قائمة منسدلة (DropdownMenu) تظهر تحت أيقونة/اسم المستخدم وتحتوي على:
- الملف الشخصي → `/profile`
- الإعدادات → `/settings`
- تسجيل الخروج → handleLogout

### الملف المُعدَّل
`src/pages/Dashboard.tsx`

### التنفيذ
1. استيراد `DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel` من `@/components/ui/dropdown-menu`.
2. استبدال زرَّي "الإعدادات" و"تسجيل الخروج" في الهيدر بزر واحد (أيقونة UserCircle) يفتح قائمة منسدلة فيها 3 عناصر.
3. زر "الإدارة" (لـ staff) يبقى كما هو منفصلاً.
4. زر `ThemeToggle` يبقى منفصلاً.
5. الأيقونة فقط بدون اسم لتوفير المساحة على الموبايل (الاسم اختياري في الديسكتوب لاحقاً).

### ما لن يُمَس
- زر الإدارة (staff فقط).
- ThemeToggle.
- handleLogout logic.
- باقي الصفحة.
