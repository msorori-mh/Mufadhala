---
name: Freemium Access Strategy
description: All educational content is free. Subscription prompted ONLY at 5 specific advanced-feature gates after free quota exhausted
type: feature
---
## Freemium Model (Final)

### كل المحتوى التعليمي مجاني بالكامل
- جميع الدروس + الملخصات + أسئلة الدروس → **مجاني**
- لا توجد paywall على المحتوى الأساسي
- تم حذف `UpgradeCTABanner` بالكامل من الـ Dashboard
- تم حذف بطاقة "الاشتراك" من شبكة بطاقات Dashboard (navCards)

### نقاط ظهور رابط الاشتراك (5 فقط — لا غيرها)
1. **محاكي الاختبارات** — بعد المحاولة المجانية الأولى (`useTrueExamEngine` + `FreeLimitMessage` + `PostExamUpgrade`)
2. **مولد الأسئلة الذكي (مفاضل)** — بعد تجاوز الحد اليومي المجاني (`AIPracticeQuestions`)
3. **النماذج السابقة** — أول نموذج لكل جامعة مجاني، البقية مدفوعة (`PastExams.tsx` + `PastExamPractice.tsx`)
4. **تحليل الأداء بالذكاء الاصطناعي** — عند الطلب بدون اشتراك (`AIPerformanceAnalysis`)
5. **ChatWidget** — بعد 10 محادثات يومية مجانية (`FREE_DAILY_LIMIT = 10`)

### قواعد صارمة
- لا banners ترقية على لوحة التحكم
- لا بطاقة "الاشتراك" دائمة في القوائم
- صفحة `/subscription` تبقى متاحة فقط عبر الروابط من النقاط الخمس أعلاه

### ⚠️ trial ≠ paid (قاعدة حاسمة)
كل مستخدم جديد يحصل على trial تلقائي 24 ساعة عبر `auto_create_trial_subscription`. هذا **لا يمنحه** حق تجاوز الحدود المجانية:
- `useSubscription` يكشف `isPaid` (= `status='active'` فقط) منفصلاً عن `isActive` (يشمل trial).
- **استخدم `isPaid` لكل القيود**: `useTrueExamEngine` (محاكي)، `AIPerformanceAnalysis`، `generate-questions`.
- `isActive` يُستخدم فقط لإخفاء CTA ترقية أثناء فترة trial النشطة (تجربة UX).

### طبقات الفرض على السيرفر (لا تعتمد على الواجهة فقط)
- `submit-exam` edge function: يفحص `subscriptions` (status='active' + expires_at سليم) وإذا غير مدفوع يرفض المحاولة الثانية بـ `403 free_limit_reached`.
- `generate-questions` edge function: يفحص `ai_generation_usage` ويرفض بعد تجاوز `FREE_DAILY_LIMIT`.
- `chat` edge function: للمستخدم غير المدفوع (status≠'active') يَعدّ رسائل اليوم في `chat_usage` ويرجع `403 free_limit_reached` عند تجاوز `FREE_DAILY_LIMIT=10`. trial يخضع للحد المجاني.
