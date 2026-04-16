## خطة: اعتماد الشعار المتحرك من الصفحة الرئيسية في جميع شاشات الدخول

### الوضع الحالي

- **الصفحة الرئيسية (Index.tsx)**: تعرض الشعار داخل دائرة متحركة بتأثير `animate-float` مع خلفية شفافة:
  ```html
  <div class="inline-flex items-center justify-center w-24 h-24 mb-5 animate-float rounded-full overflow-hidden bg-white/20 backdrop-blur-sm">
    <img src={logoImg} class="w-full h-full object-cover drop-shadow-lg" />
  </div>
  ```
- **Login.tsx**: شعار ثابت صغير `w-16 h-16` بدون حركة
- **Register.tsx**: شعار ثابت صغير `w-16 h-16` بدون حركة (يستخدم `logo-new.jpg`)
- **AdminLogin.tsx**: لا يوجد شعار — يستخدم أيقونة Shield فقط

### التعديلات المطلوبة

**1. Login.tsx** — استبدال الشعار الثابت بالشعار المتحرك:

- تغيير `<img>` إلى نفس wrapper الدائرة المتحركة من Index.tsx

**2. Register.tsx** — نفس التعديل:

- تغيير import من `logo-new.jpg` إلى `logo.png`
- استبدال الشعار بالنسخة المتحركة

**3. AdminLogin.tsx** — استبدال أيقونة Shield بالشعار المتحرك:

- إضافة import للشعار
- استبدال div أيقونة Shield بالشعار المتحرك

**4. Welcome.tsx** — التأكد من نفس الشكل المتحرك

### الشكل الموحد للشعار في جميع الشاشات

```html
<div class="inline-flex items-center justify-center w-24 h-24 mb-5 animate-float rounded-full overflow-hidden bg-white/20 backdrop-blur-sm">
  <img src={logoImg} alt="مُفَاضَلَة" class="w-full h-full object-cover drop-shadow-lg" />
</div>
```

> ملاحظة: سيتم تعديل لون الخلفية حسب سياق كل شاشة (مثلاً `bg-primary/10` في AdminLogin بدل `bg-white/20`).
>
> ملاحظة اضافة: هل بالإمكان تحريك الدائرة شمالا حركة واحدة، مع ابقاء ماداخلها كما هو 