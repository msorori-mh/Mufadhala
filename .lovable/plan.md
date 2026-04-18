

## المشكلة

زر "دخول الموقع" في بروشور PDF يفتح رابط البيئة التطويرية `5f636eec-...lovableproject.com` بدلاً من `mufadhala.com/install`.

## السبب الجذري

في `src/lib/generateBrochurePDF.ts` يُستخدم `window.location.origin` لبناء رابط زر "دخول الموقع":

```ts
// السطر المعني داخل HTML البروشور
<a href="${window.location.origin}">دخول الموقع</a>
```

عند فتح البروشور من بيئة المعاينة (`*.lovableproject.com`)، يأخذ `window.location.origin` قيمة المعاينة ويُحقن في PDF — بينما QR نفسه يستخدم `https://mufadhala.com/install` (ثابت في `Install.tsx`) ولذلك يعمل بشكل صحيح.

البروشور يجب أن يكون **مستقلاً عن البيئة** لأنه ملف يُوزَّع للطلاب.

## الحل

تثبيت الرابط القانوني `https://mufadhala.com` في `generateBrochurePDF.ts` (نفس النهج المتبع لـ QR في `Install.tsx`).

### الملف المعدَّل

| الملف | التغيير |
|---|---|
| `src/lib/generateBrochurePDF.ts` | استبدال أي استخدام لـ `window.location.origin` بثابت `https://mufadhala.com` لروابط الزر، وضمان أن أي عرض نصي للرابط يطابق `mufadhala.com/install`. |

### النتيجة المتوقعة

- زر "دخول الموقع" في PDF يفتح `https://mufadhala.com`
- QR يفتح `https://mufadhala.com/install` (يعمل بالفعل)
- البروشور قابل للتوزيع من أي بيئة (معاينة / منشور / دومين مخصص) بنفس النتيجة

