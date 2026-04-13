

## فصل الطلاب عن مستخدمي الإدارة

### المشكلة
دالة `handle_new_user()` تُنشئ سجلاً في جدول `students` لكل مستخدم جديد (بما فيهم المدراء والمشرفون). لذلك يظهر مستخدمو الإدارة في صفحة الطلاب وفي التقارير.

### الحل
استبعاد المستخدمين الذين لديهم دور `admin` أو `moderator` من صفحة الطلاب ومن جميع التقارير، وذلك بجلب أدوار المستخدمين ثم تصفية القوائم.

### التغييرات المطلوبة

**1. `src/pages/admin/AdminStudents.tsx`**
- جلب بيانات `user_roles` ضمن `fetchData`
- بناء مجموعة `staffUserIds` تحتوي على `user_id` لكل من لديه دور `admin` أو `moderator`
- تصفية قائمة الطلاب لاستبعاد أي طالب `user_id` موجود في `staffUserIds`

**2. `src/pages/admin/AdminReportsStudents.tsx`**
- نفس المنطق: جلب `user_roles` واستبعاد الطاقم الإداري من إحصائيات الطلاب

**3. `src/pages/admin/AdminReportsExams.tsx`**
- استبعاد محاولات الاختبار التي تخص طلاب هم في الحقيقة مدراء/مشرفون

**4. `src/pages/admin/AdminReportsSubscriptions.tsx`**
- استبعاد اشتراكات المدراء/المشرفين من تقارير الاشتراكات

**5. `src/pages/admin/AdminReportsPayments.tsx`**
- استبعاد مدفوعات المدراء/المشرفين من تقارير الدفع

**6. `src/pages/admin/AdminReportsComparison.tsx`**
- استبعاد الطاقم الإداري من إحصائيات مقارنة الفترات

### المنطق المشترك
```typescript
// جلب أدوار المستخدمين
const { data: roles } = await supabase.from("user_roles").select("user_id, role");
const staffIds = new Set(
  (roles || [])
    .filter(r => r.role === 'admin' || r.role === 'moderator')
    .map(r => r.user_id)
);

// تصفية الطلاب
const realStudents = students.filter(s => !staffIds.has(s.user_id));
```

### النتيجة
- صفحة **المستخدمين**: تعرض فقط المدراء والمشرفين (موجود حالياً)
- صفحة **الطلاب**: تعرض فقط الطلاب الحقيقيين المسجلين من الموقع
- **التقارير**: تحتسب فقط بيانات الطلاب الحقيقيين

