

# إصلاح رسالة الخطأ عند التسجيل برقم مسجل مسبقاً

## المشكلة
عند التسجيل برقم موجود مسبقاً، تعيد وظيفة `register-student` استجابة بحالة **409** مع رسالة خطأ واضحة. لكن مكتبة `supabase.functions.invoke` تعامل أي استجابة غير 200 كخطأ — فتجعل `res.data = null` وتضع الخطأ في `res.error`. نتيجة لذلك يسقط الكود في الرسالة العامة "فشل في الاتصال بالخادم".

## الحل (خياران، سيتم تنفيذ الأول)

### الخيار المعتمد: تعديل Edge Function لإرجاع HTTP 200 دائماً
تغيير `register-student/index.ts` ليعيد `status: 200` مع حقل `error` في الجسم بدلاً من `status: 409`. هذا يضمن وصول `res.data.error` بشكل صحيح للعميل.

**الملفات المتأثرة:**
1. `supabase/functions/register-student/index.ts` — تغيير سطر واحد: إرجاع 200 بدلاً من 409 عند الرقم المكرر
2. `src/pages/Register.tsx` — إضافة معالجة احتياطية لقراءة رسالة الخطأ من `res.error` في حال وجود أخطاء HTTP أخرى

**التغيير في Edge Function (سطر واحد):**
```
// قبل:
}, 409);
// بعد:
}, 200);
```

**التغيير في Register.tsx (سطر 182):**
إضافة محاولة لاستخراج رسالة الخطأ من جسم الاستجابة حتى عند وجود `res.error`:
```typescript
let errorMsg = res.data?.error;
if (!errorMsg && res.error) {
  try {
    const ctx = res.error?.context;
    if (ctx instanceof Response) {
      const body = await ctx.json();
      errorMsg = body?.error;
    }
  } catch {}
  if (!errorMsg) errorMsg = "فشل في الاتصال بالخادم";
}
```

هذا يضمن عرض "هذا الرقم مسجل مسبقاً" بشكل صحيح مع زر "تسجيل الدخول".

