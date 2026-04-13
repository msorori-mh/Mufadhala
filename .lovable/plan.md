

## المشكلة الحقيقية — سباق بيانات (Race Condition) وتكرار غير منطقي

### ما يحدث حالياً:

```text
1. الطالب يسجل ← register-student Edge Function
2. createUser() ← ينشئ الحساب مع metadata فيها college_id
3. trigger handle_new_user ← يقرأ metadata ويُنشئ سجل student مع college_id ✅
4. update students ← يعيد كتابة نفس البيانات مرة ثانية (تكرار)
   لكن أحياناً يصل الـ update قبل اكتمال الـ trigger = لا يجد سجل = 0 rows updated ❌
5. الواجهة تقرأ students ← تجد college_id = null ← تعرض "لا توجد بيانات"
```

### المشكلة المحورية:
- الـ `trigger` (`handle_new_user`) **يكتب بالفعل كل البيانات الصحيحة** من metadata
- لكن الـ `update` في Edge Function يأتي بعده مباشرة وأحياناً **يفشل صامتاً** (لا يتحقق من `error` أو عدد الصفوف المحدثة)
- صفحة الملف الشخصي تكرر **نفس الحقول** الموجودة في التسجيل بلا فائدة

### الحل — 3 تغييرات:

**1. Edge Function (`register-student/index.ts`) — إضافة تأخير + إعادة محاولة**
- بعد `createUser()` وقبل الـ `update`: إضافة `await` مع delay صغير (200ms) للسماح للـ trigger بالاكتمال
- إضافة التحقق من نتيجة الـ update (عدد الصفوف): إذا = 0، يعني الـ trigger لم يُنشئ السجل بعد → إعادة محاولة بعد ثانية
- أو الأفضل: استخدام `upsert` بدلاً من `update` لضمان إنشاء/تحديث السجل في كل الأحوال

**2. صفحة الدروس (`LessonsList.tsx`) — إضافة refetch تلقائي**
- عندما يكون `student` موجود لكن `college_id = null`: بدلاً من عرض رسالة خطأ فوراً، عمل `refetch` بعد 2 ثانية (مرة واحدة) لأن البيانات ربما لم تصل بعد من الـ trigger
- هذا يحل مشكلة الكاش القديم (`staleTime: 5 min`) الذي يُبقي البيانات الفارغة

**3. صفحة الملف الشخصي (`StudentProfile.tsx`) — منع التكرار المربك**
- إضافة رسالة توضيحية: "هذه الصفحة لتعديل بياناتك. البيانات الأساسية تم حفظها عند التسجيل"
- إزالة حقل رقم التنسيق (coordination_number) وأي حقول لا علاقة لها بالتدفق الأساسي

### الملفات المتأثرة:
- `supabase/functions/register-student/index.ts` — إصلاح سباق البيانات
- `src/pages/LessonsList.tsx` — refetch تلقائي عند college_id فارغ
- `src/hooks/useStudentData.ts` — تقليل staleTime أو إضافة retry logic

### النتيجة:
- التسجيل → الدروس تظهر فوراً بدون أي شاشة وسيطة
- لا تكرار في إدخال البيانات
- لا رسالة "لا توجد بيانات" للطلاب المسجلين حديثاً

