

## التعبئة التلقائية لرمز التحقق (OTP Auto-fill)

### الفكرة
تفعيل ميزة **WebOTP API** و **autocomplete="one-time-code"** لجعل المتصفح (خاصة على الهواتف) يتعرف تلقائياً على رمز التحقق من الرسالة النصية ويعبّئه مباشرة.

### المتطلبات

هناك جزءان:

**1. الواجهة الأمامية — `src/pages/Login.tsx`**
- إضافة خاصية `autoComplete="one-time-code"` لمكوّن `InputOTP` (مدعوم من مكتبة `input-otp`)
- إضافة استدعاء **WebOTP API** (`navigator.credentials.get({ otp: { transport: ["sms"] } })`) عند الانتقال لشاشة OTP، بحيث:
  - يطلب من المتصفح الاستماع للرسائل الواردة
  - عند استلام الرمز، يعبّئ `otpCode` تلقائياً ويستدعي `handleVerifyOtp` فوراً
  - يُلغي الطلب عند مغادرة الشاشة أو إدخال الرمز يدوياً

**2. تنسيق الرسالة النصية — `supabase/functions/send-otp/index.ts`**
- تعديل نص الرسالة ليتوافق مع معيار WebOTP بإضافة سطر أخير:
  ```
  @uni-admission-coach.lovable.app #CODE
  ```
  هذا السطر يُمكّن المتصفح من ربط الرسالة بالتطبيق تلقائياً.

### التغييرات

| الملف | التغيير |
|-------|---------|
| `src/pages/Login.tsx` | إضافة `useEffect` للـ WebOTP API عند `phoneStep === "otp"` + إضافة `autoComplete` للحقل |
| `supabase/functions/send-otp/index.ts` | تعديل نص Body ليشمل origin line للتوافق مع WebOTP |

### ملاحظات
- WebOTP API مدعوم في Chrome/Edge على Android وSafari على iOS (مع `autocomplete="one-time-code"`)
- على المتصفحات غير المدعومة، لا يحدث شيء — يبقى الإدخال اليدوي متاحاً كالمعتاد
- لا يحتاج أي تغيير في قاعدة البيانات

