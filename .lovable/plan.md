

## الخطة: إضافة خيار "المدة المقترحة" في إدارة نماذج الاختبارات السابقة

### الهدف
السماح للأدمن بتحديد **مدة مقترحة** (`suggested_duration_minutes`) بدلاً من **مدة إلزامية** (`duration_minutes`)، مع توضيح الفرق بصرياً في الواجهة.

### الفرق بين الحقلين (للعرض في الواجهة)
| الحقل | السلوك لدى الطالب |
|---|---|
| **المدة الإلزامية** (`duration_minutes`) | تظهر كقيمة افتراضية وتعتبر "موصى بها من الأدمن"، لكن الطالب يستطيع تعديلها (حسب القرار السابق) |
| **المدة المقترحة** (`suggested_duration_minutes`) | اقتراح بسيط يُعرض في حوار اختيار المدة فقط، لا يُفرض حتى كقيمة افتراضية |
| **بدون أي مدة** | يُحسب تلقائياً = عدد الأسئلة × 1 دقيقة (الحد الأدنى 5 دقائق) |

> ملاحظة: العمود `suggested_duration_minutes` موجود فعلياً في جدول `past_exam_models` (تم التحقق من الـ schema) — لا حاجة لـ migration.

### الملفات المتأثرة
1. **`src/pages/admin/AdminPastExams.tsx`** — إضافة الحقل في نموذج إنشاء/تعديل النموذج + شرح بصري للفرق
2. **`src/pages/past-exam/types.ts`** — التأكد من وجود `suggested_duration_minutes` في `PastExamModelInfo` (موجود بالفعل ✅)
3. **`src/pages/past-exam/ModeSelector.tsx`** — احتساب الأولوية الجديدة في القيمة الافتراضية:
   - 1) آخر مدة استخدمها الطالب (localStorage)
   - 2) `duration_minutes` (مدة الأدمن الإلزامية الافتراضية)
   - 3) `suggested_duration_minutes` (المقترح الجديد)
   - 4) عدد الأسئلة × 1 دقيقة
   - 5) fallback نهائي: 30 دقيقة
4. **`src/pages/PastExamPractice.tsx`** — التأكد من تمرير `suggested_duration_minutes` ضمن `PastExamModelInfo` عند جلب النموذج من DB

### تفاصيل تنفيذ واجهة الأدمن

#### في فورم الإنشاء/التعديل في `AdminPastExams.tsx`:
```text
┌─────────────────────────────────────────────────────────┐
│  ⏱️ إعدادات المدة الزمنية                                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  المدة الإلزامية (دقائق)        [____60____]            │
│  ℹ️ تُعرض كافتراضية لكل طالب، يستطيع تعديلها قبل البدء  │
│                                                          │
│  المدة المقترحة (دقائق)         [____45____]            │
│  ℹ️ اقتراح إرشادي فقط، يظهر داخل حوار اختيار المدة      │
│                                                          │
│  💡 ترك كلا الحقلين فارغين → يحسب الوقت تلقائياً         │
│      بمعدل دقيقة واحدة لكل سؤال (بحد أدنى 5 دقائق)      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### عناصر مكونات shadcn المستخدمة:
- `Card` + `CardHeader` + `CardContent` لتجميع إعدادات المدة
- `Label` + `Input` (type=number) لكل حقل
- `Alert` (variant="default") لشرح الفرق بـ Icon + نص قصير
- زر `X` صغير لمسح القيمة بسرعة (يعيدها لـ null)

### تفاصيل التغيير في `ModeSelector.tsx`
تحديث منطق الاختيار في `useState` الافتراضي:
```ts
const calculateDefaultDuration = () => {
  const stored = localStorage.getItem(`past_exam_duration_${model.id}`);
  if (stored) return parseInt(stored, 10);
  if (model.duration_minutes && model.duration_minutes > 0) return model.duration_minutes;
  if (model.suggested_duration_minutes && model.suggested_duration_minutes > 0) return model.suggested_duration_minutes;
  return Math.max(MIN_DURATION, totalQuestions);
};
```

وفي حوار اختيار المدة، عرض شارة "مقترحة من الإدارة" بجانب قيمة `suggested_duration_minutes` لو وُجدت.

### ملاحظات حقل قاعدة البيانات
- `suggested_duration_minutes` (integer, nullable) — موجود فعلياً
- `duration_minutes` (integer, nullable) — موجود فعلياً
- لا حاجة لأي migration SQL

### النتيجة المتوقعة
- الأدمن يحصل على مرونة كاملة: يحدد إلزامية، أو مقترحة، أو يترك القرار للنظام
- الطالب يفهم السياق: "مدة الأدمن (افتراضية قابلة للتعديل)" مقابل "اقتراح بسيط"
- لا تغيير في سلوك النماذج الحالية (backward compatible)

### تحديث الذاكرة
سأحدّث `mem://features/past-exam-models.md` لإضافة سطر:
> الأدمن يميز بين `duration_minutes` (افتراضية قابلة للتعديل) و `suggested_duration_minutes` (اقتراح إرشادي فقط)

