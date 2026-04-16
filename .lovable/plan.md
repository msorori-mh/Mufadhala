

## الهدف
عند الضغط على بطاقة "مولد الأسئلة الذكي" في لوحة التحكم، يتم الانتقال لصفحة مستقلة تعرض مكوّن المولّد بالكامل بدلاً من التمرير لأسفل الصفحة.

## التغييرات

### 1) إنشاء صفحة جديدة `src/pages/AIGenerator.tsx`
- صفحة مستقلة تعرض مكوّن `AIPracticeQuestions` داخل `PageShell` (أو التخطيط المعتاد).
- تمرر `hasSubscription` من `useSubscription`.

### 2) تعديل `src/App.tsx`
- إضافة مسار جديد `/ai-generator` يشير للصفحة الجديدة.

### 3) تعديل `src/pages/Dashboard.tsx`
- تغيير `path` بطاقة المولّد من `"#ai-generator"` إلى `"/ai-generator"`.
- إزالة مكوّن `AIPracticeQuestions` من أسفل الداشبورد (اختياري — أو إبقاؤه للوصول السريع).

