
المستخدم يريد ترتيب أسئلة الدرس بحيث تظهر أسئلة الصح/الخطأ أولاً ثم أسئلة الاختيار من متعدد.

دعني أفحص الكود المسؤول عن عرض أسئلة الدرس.
<lov-tool-use id="toolu_vrtx_01MHhftarssNqUt7jJoGxLx8" name="code--search_files" integration-id="code" data="{\"query\": \"question_type|true_false|tf\", \"include_patterns\": \"src/pages/LessonDetail.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01N7sy8swYPVXECcLAMXeiwP" name="code--search_files" integration-id="code" data="{\"query\": \"questions.*from.*supabase|fetchQuestions\", \"include_patterns\": \"src/pages/LessonDetail.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01TD4JCgHEd8DBzsmrKRQpH2" name="code--search_files" integration-id="code" data="{\"query\": \"question_type|true_false\", \"include_patterns\": \"src/pages/LessonDetail.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01F66DoMoZbPQBWkCkmAVxxp" name="code--search_files" integration-id="code" data="{\"include_patterns\": \"src/pages/LessonDetail.tsx\", \"query\": \"order|sort|questions\"}">
</lov-tool-use>
I have enough context. The fix is simple: sort the questions array so true/false comes first, then multiple choice. The fetch happens at line 100, ordered by `display_order`. I'll sort after fetch (and after cache load).

<lov-plan>

## الخطة: عرض أسئلة الصح/الخطأ قبل أسئلة الاختيارات

### المشكلة
حالياً تُعرض الأسئلة في `LessonDetail.tsx` مرتبة فقط حسب `display_order` بدون فصل بين الأنواع.

### الحل
ترتيب الأسئلة بحيث تظهر أسئلة `true_false` أولاً، ثم أسئلة الاختيار من متعدد (`multiple_choice` أو غير محدد)، مع الحفاظ على `display_order` داخل كل مجموعة.

### التعديل
**ملف واحد فقط**: `src/pages/LessonDetail.tsx`
- إضافة دالة مساعدة `sortQuestionsByType(questions)` تُرجع الأسئلة مفروزة:
  - أولاً: `question_type === "true_false"` (مرتبة حسب `display_order`)
  - ثانياً: باقي الأنواع (مرتبة حسب `display_order`)
- تطبيقها في موضعين:
  1. عند `setQuestions(q as Question[])` بعد الجلب من Supabase (سطر 104)
  2. عند `setQuestions(cached.questions as Question[])` من الكاش الأوفلاين (سطر 90)
- لا حاجة لتعديل قاعدة البيانات أو محرك الاستيراد.

### النتيجة
الطالب يبدأ بأسئلة الصح/الخطأ الأبسط لبناء الثقة، ثم ينتقل للاختيارات الأطول.

