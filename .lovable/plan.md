

## تحليل الطلب

المستخدم يريد تقليل نقاط ظهور رابط الاشتراك ليتماشى مع استراتيجية: **كل المحتوى التعليمي مجاني** (دروس + ملخصات + أسئلة). الاشتراك يظهر فقط في الميزات المتقدمة بعد استنفاذ الحد المجاني.

## نقاط الإزالة (Remove)

1. **`Dashboard.tsx`**: حذف بطاقة الاشتراك الدائمة + إخفاء `UpgradeCTABanner` تماماً (يظهر بعد إكمال درسين).
2. **`UpgradeCTABanner.tsx`**: حذف الملف بالكامل (لم يعد مستخدماً).

## نقاط الإبقاء (Keep — معتمدة)

| # | المكان | المُحفِّز |
|---|---|---|
| 1 | `ExamSimulator.tsx` (via `useTrueExamEngine` + `FreeLimitMessage`) | بعد المحاولة المجانية الأولى |
| 2 | `AIPracticeQuestions.tsx` (مولد مفاضل) | بعد تجاوز الحد اليومي |
| 3 | `PastExams.tsx` + `PastExamPractice.tsx` | كل النماذج عدا الأول لكل جامعة |
| 4 | `AIPerformanceAnalysis.tsx` | عند طلب التحليل بدون اشتراك |
| 5 | `ChatWidget.tsx` | بعد 10 محادثات يومية |

## التغييرات المطلوبة

### 1. `src/pages/Dashboard.tsx`
- إزالة `import UpgradeCTABanner`.
- إزالة استدعاء `<UpgradeCTABanner ... />` من JSX.
- إزالة بطاقة الاشتراك الدائمة (البطاقة الرابعة في "دليل البدء السريع" حسب memory `student-dashboard`) — تبقى فقط: المواد، AI Generator، الاختبارات، التقييم، إلخ.
- التأكد أن أي `<Link to="/subscription">` ثابت داخل الصفحة يُحذف.

### 2. `src/components/UpgradeCTABanner.tsx`
- حذف الملف.

### 3. `src/components/ChatWidget.tsx` (تحقق)
- التأكد من وجود حد 10 محادثات يومية. إن كان الحد مختلفاً، تعديله إلى 10.

### 4. تحديث Memory
- تحديث `mem://monetization/strategy-and-paywall` ليعكس:
  - كل الدروس/الملخصات/أسئلة الدروس → مجانية بالكامل.
  - نقاط الـ Paywall الخمس المعتمدة فقط (لا banner، لا بطاقة dashboard).
- تحديث `mem://features/student-dashboard` لإزالة ذكر بطاقة الاشتراك من ترتيب البطاقات.

## ما لن يتغيّر
- منطق الاشتراك في `useSubscription` و`useStudentAccess` يبقى كما هو.
- صفحة `/subscription` نفسها تبقى متاحة (يُفتح إليها الانتقال من نقاط Paywall الخمس).
- إشعارات تحديث حالة الدفع (pending → active) تبقى.

## الخطوات
1. حذف `UpgradeCTABanner` import و usage من `Dashboard.tsx`.
2. حذف بطاقة الاشتراك من شبكة بطاقات Dashboard.
3. حذف ملف `UpgradeCTABanner.tsx`.
4. التحقق من حد 10 في `ChatWidget.tsx` وتعديله عند الحاجة.
5. تحديث ملفّي memory.

