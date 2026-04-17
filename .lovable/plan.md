

## التشخيص

`useSubscription` يدمج `trial` مع `active` في حقل واحد `isActive = true`. كل المكوّنات تستخدمه:
- `useTrueExamEngine` → `freeAttemptUsed` لا يتفعّل أبداً للحساب التجريبي
- `AIPerformanceAnalysis` → التحليل يعمل بدون حدود
- `submit-exam` edge function → لا يفرض أي حد على عدد المحاولات (الحد فقط في الواجهة)

أي مستخدم جديد لديه trial تلقائي 24 ساعة → كل القيود المجانية تُتجاوز.

## الحل

### 1) `useSubscription` — كشف الاشتراك المدفوع منفصلاً
أضف حقلاً جديداً `isPaid: boolean` (= `status === 'active'` فقط، يستثني trial). أبقي `isActive` كما هو لتجنّب كسر باقي التطبيق.

### 2) محاكي الاختبارات — `useTrueExamEngine.ts`
- استبدل `hasActiveSubscription` بـ `isPaid` في حساب `freeAttemptUsed` و `canAccessFull`
- `const freeAttemptUsed = !isPaid && !isStaff && pastAttempts.filter(a => a.completed_at).length >= 1`

### 3) فرض الحد على السيرفر — `submit-exam/index.ts`
أضف فحصاً قبل insert:
- اقرأ الاشتراك المدفوع (status='active' و expires_at سليم)
- إذا غير مدفوع: عُدّ `exam_attempts` المكتملة اليوم (أو إجمالاً) للطالب → إذا ≥ 1 ارجع 403 مع `error: "free_limit_reached"`
- هذه طبقة أمان حقيقية بدلاً من الاعتماد على الواجهة فقط

السياسة: مجاني = محاولة واحدة كاملة (مكتملة) إجمالاً، ليس يومياً (مطابق للسلوك الحالي في الواجهة).

### 4) تحليل الأداء — `AIPerformanceAnalysis.tsx`
- استبدل `hasSubscription` المرسل من `ExamSimulator` ليصبح `isPaid` بدلاً من `hasActiveSubscription`
- في `ExamSimulator.tsx` غيّر السطر 425: `hasSubscription={engine.isPaid}`
- أضف فحصاً اختيارياً على السيرفر داخل `chat` function لاحقاً (خارج النطاق الحالي)

### 5) تحديث المذكرة
أضف ملاحظة في `mem://monetization/strategy-and-paywall.md`: **trial ≠ paid**، كل القيود المجانية تطبَّق على المستخدم التجريبي.

## ملفات متأثرة
- `src/hooks/useSubscription.ts` (إضافة `isPaid`)
- `src/features/exams/hooks/useTrueExamEngine.ts` (استخدام `isPaid`)
- `src/pages/ExamSimulator.tsx` (تمرير `isPaid` للتحليل)
- `supabase/functions/submit-exam/index.ts` (فرض حد المحاولة المجانية)
- `mem://monetization/strategy-and-paywall.md` (توثيق)

## ملاحظة أمنية
نقطة الضعف الحقيقية أن `submit-exam` لا يفرض أي حد. الواجهة وحدها يمكن الالتفاف عليها. الإصلاح في النقطة 3 هو الحاسم.

