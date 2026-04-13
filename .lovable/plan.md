

## التشخيص

المشكلة واضحة في الكود: `loadDraft()` غير متزامنة (async) وتستخدم `Capacitor Preferences` على الموبايل. عندما يبدأ المستخدم بالكتابة في حقل الاسم الأول، ثم تصل نتيجة `loadDraft()` متأخرة، يتم استدعاء `setForm(draft)` الذي يستبدل النموذج بالكامل بالمسودة القديمة (الفارغة غالباً)، فتختفي البيانات المكتوبة.

بالإضافة لذلك، بما أن `capacitor.config.ts` لا يحتوي `server.url`، فتطبيق الجوال يعمل من ملفات `dist` المضمنة في APK. إذا لم تقم بـ `git pull` + `npm run build` + `npx cap sync android` + إعادة بناء APK بعد آخر تعديل، فالتطبيق يعمل بكود قديم.

## خطة الإصلاح

### 1. إصلاح سباق `loadDraft` في `Register.tsx`
- إضافة متغير `formTouched` ref لتتبع إذا بدأ المستخدم بالكتابة
- عند `updateField`: تعيين `formTouched = true`
- عند وصول نتيجة `loadDraft()`: إذا كان `formTouched` = true، دمج فقط الحقول الفارغة بدلاً من استبدال النموذج بالكامل
- هذا يمنع حذف البيانات المكتوبة نهائياً

### 2. إضافة علامة نسخة مرئية
- إضافة رقم نسخة بسيط (مثل `v2.1`) يظهر في أسفل صفحة التسجيل
- بهذا يمكنك التحقق فوراً هل APK المثبت يحتوي آخر كود أم نسخة قديمة

### 3. بعد التطبيق - خطوات مطلوبة منك
لتحديث تطبيق الجوال بعد الإصلاح:
```text
git pull
npm install
npm run build
npx cap sync android
gradlew.bat assembleRelease
```
ثم تثبيت APK الجديد على الجهاز.

---

**تفصيل تقني:**
```text
الوضع الحالي (المشكلة):
  mount → user types "أحمد" → loadDraft() resolves → setForm(emptyDraft) → "أحمد" يختفي

بعد الإصلاح:
  mount → user types "أحمد" → formTouched=true → loadDraft() resolves → 
    firstName not empty? skip → keeps "أحمد"
```

