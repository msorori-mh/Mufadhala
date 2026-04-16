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
- منطق `useSubscription` و `useStudentAccess` لم يتغيّر
