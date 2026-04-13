

## تحليل المشكلة

المشكلة تحدث بسبب أن صفحة التسجيل (`Register`) يتم تحميلها بشكل **كسول** (lazy loading) وملفوفة داخل `Suspense` مع تفعيل خيار `v7_startTransition: true` في React Router. عند فتح قائمة Select (المحافظة أو الجامعة) على الجوال، يمكن أن يتسبب ذلك في إعادة تقييم حدود Suspense، مما يؤدي إلى **إزالة المكون وإعادة تركيبه** (unmount/remount) وبالتالي فقدان جميع البيانات المدخلة في الحقول.

## الحل

### التغيير 1: جعل صفحة التسجيل eager import (في `src/App.tsx`)
- نقل `Register` من التحميل الكسول إلى التحميل المباشر (مثل Login وDashboard)
- هذا يمنع أي تفاعل بين Suspense وحالة النموذج

```typescript
// من:
const Register = lazy(() => import("./pages/Register"));

// إلى:
import Register from "./pages/Register";
```

### التغيير 2: حماية إضافية للحالة في النموذج (في `src/pages/Register.tsx`)
- استخدام `useRef` لتخزين قيم الحقول كنسخة احتياطية
- إضافة `key` ثابت للعناصر لمنع إعادة الإنشاء

---

**ملف واحد يحتاج تعديل أساسي:** `src/App.tsx` — نقل Register من lazy إلى eager import.

