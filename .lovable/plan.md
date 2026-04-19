

## السياق
الاختبار الصارم (StrictMode) في `src/pages/past-exam/StrictMode.tsx` يعرض حالياً شاشة نتيجة بها: النسبة، عدد الصحيح/الخطأ/الفارغ، الوقت المستغرق، ومراجعة الأسئلة. لا يوجد تحليل ذكي للأداء.

في المقابل، يوجد بالفعل مكون جاهز `src/components/AIPerformanceAnalysis.tsx` يستخدمه `ExamSimulator` لتوليد تحليل ذكي عبر Lovable AI (Gemini) — مع دعم streaming وعرض Markdown وحماية للمشتركين فقط.

## الجدوى
**ممكن جداً وسريع** — المكون موجود ويعمل، فقط نحتاج تكييف بسيط.

## الخطة

### الملف
`src/pages/past-exam/StrictMode.tsx` — في شاشة النتائج النهائية (`strict_finished`).

### الخطوات
1. **استيراد** `AIPerformanceAnalysis` و `useAuth` و `useSubscription` (إن لم تكن موجودة).
2. **تحويل بنية الأسئلة** لتطابق واجهة المكون:
   - المكون يتوقع: `{ id, question_text, subject?, correct_option }`
   - أسئلة الماضي عندنا: `{ id, q_text, q_correct, ... }` بدون `subject`
   - نعمل `map` يحوّل: `question_text = q_text`, `correct_option = q_correct`, `subject = model.title` (لإعطاء سياق المادة في التحليل، أو نتركه `undefined` ليصبح "general")
3. **تمرير الإجابات** بنفس الصيغة `Record<string, string>` (المفتاح = id السؤال).
4. **إضافة المكون** أسفل بطاقة النتيجة وقبل قائمة المراجعة، بشرط `isPaid` فقط (ليتطابق مع باقي التطبيق).

### نقاط دقيقة
- `answers` في StrictMode حالياً مفهرس بـ `order_index` (رقم) وليس `id` السؤال. سنحتاج بناء خريطة جديدة `answersByQuestionId` للتمرير للمكون.
- نمرر `hasSubscription` من `useSubscription` كما هو معمول به في `ExamSimulator`.
- التحليل يستخدم Lovable AI (مجاني عبر edge function `chat`) — لا حاجة لمفاتيح إضافية.

### ما لا يتغير
- منطق الاختبار، التايمر، الحفظ في `past_exam_attempts`، أو المراجعة.
- وضع التدريب (Training) — يبقى كما هو دون تحليل (لأنه بدون سياق نتيجة موحدة).

### النتيجة المتوقعة
بعد إنهاء الاختبار الصارم، يظهر للطالب المشترك زر "تحليل أدائي" يفتح ملخصاً ذكياً بنقاط القوة/الضعف وتوصيات عملية باللغة العربية.

