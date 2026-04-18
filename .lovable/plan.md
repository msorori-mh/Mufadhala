

## الخطة: تقرير المحتوى التفصيلي في الإدارة

### الفهم
إضافة تقرير جديد للأدمن يعرض إحصائيات شاملة لمحتوى المنصة:
- مصفوفة (المواد × الصفوف): دروس وأسئلة لكل مادة في كل صف + إجمالي كل مادة.
- إجماليات عامة لدروس وأسئلة المنصة.
- مصفوفة (الجامعات): عدد نماذج الاختبارات السابقة وعدد أسئلتها لكل جامعة.
- إجماليات عامة للنماذج السابقة وأسئلتها على مستوى المنصة.

### الحل

#### 1) صفحة جديدة: `src/pages/admin/AdminReportsContent.tsx`
- جلب: `subjects`, `lessons`, `questions`, `universities`, `past_exam_models`, `past_exam_model_questions` (مع `.limit(20000)` على الأسئلة).
- بطاقات إجمالية أعلى الصفحة:
  - إجمالي الدروس · إجمالي الأسئلة · إجمالي النماذج السابقة · إجمالي أسئلة النماذج السابقة.
- جدول 1: **محتوى المواد التعليمية**
  ```
  المادة | أول ثانوي (دروس/أسئلة) | ثاني ثانوي | ثالث ثانوي | الإجمالي
  ```
  + صف "الإجمالي العام" أسفل الجدول.
- جدول 2: **نماذج الاختبارات السابقة حسب الجامعة**
  ```
  الجامعة | عدد النماذج | عدد الأسئلة
  ```
  + صف "الإجمالي العام".
- يستخدم نفس مكونات `Table`، `Card`، و`AdminLayout` و`PermissionGate permission="reports"`.
- زر "تصدير Excel/PDF" عبر `ReportFilters` بدون فلاتر (showDate/University/Governorate=false) مع تمرير `exportData`.

#### 2) إضافة المسار في `src/App.tsx`
سطر جديد بعد سطر 181:
```tsx
<Route path="/admin/reports/content" element={<AdminReportsContent />} />
```

#### 3) إضافة الرابط في الشريط الجانبي `src/components/admin/AdminLayout.tsx`
في `reportSubItems` (بعد سطر 47):
```ts
{ path: "/admin/reports/content", label: "المحتوى التعليمي", icon: FileText },
```

### الحساب (محلي - صفر استعلامات إضافية)
```ts
// مصفوفة المواد
subjects.map(s => {
  const byGrade = [1,2,3].map(g => {
    const ls = lessons.filter(l => l.subject_id === s.id && l.grade_level === g);
    const lessonIds = new Set(ls.map(l => l.id));
    const qs = questions.filter(q => lessonIds.has(q.lesson_id)).length;
    return { lessons: ls.length, questions: qs };
  });
  // ...إجمالي المادة
});

// مصفوفة الجامعات
universities.map(u => {
  const ms = pastExamModels.filter(m => m.university_id === u.id);
  const modelIds = new Set(ms.map(m => m.id));
  const qs = pastExamQuestions.filter(q => modelIds.has(q.model_id)).length;
  return { models: ms.length, questions: qs };
});
```

### النطاق
- ملف جديد: `src/pages/admin/AdminReportsContent.tsx`
- تحديثان بسيطان: `src/App.tsx` (مسار) و`src/components/admin/AdminLayout.tsx` (رابط شريط جانبي).
- لا تغييرات في قاعدة البيانات.

### النتيجة
رابط جديد "المحتوى التعليمي" تحت قائمة "التقارير"، يعرض صورة شاملة وقابلة للتصدير لكل ما تم رفعه على المنصة من دروس وأسئلة ونماذج سابقة موزّعة بدقة حسب المادة/الصف وحسب الجامعة.

