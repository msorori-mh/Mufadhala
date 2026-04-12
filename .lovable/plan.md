

## مراجعة تطبيق الجوال وخطوات البناء

### نتائج المراجعة

تم فحص جميع الملفات الأساسية للتطبيق. **لا توجد مشاكل تمنع البناء:**

- **الهوية**: اسم التطبيق "مُفَاضَلَة" ومعرّف `com.mufadhala.app` محدّثان في `capacitor.config.ts` و `manifest.json` و `index.html`
- **الروابط**: تم استبدال جميع الروابط القديمة `uni-admission-coach.lovable.app` بـ `mufadhala.com` (لا يوجد أي أثر متبقي)
- **المصادقة**: نظام حفظ الجلسة عبر Capacitor Preferences يعمل بشكل صحيح (AuthContext + nativeSessionStorage)
- **الأداء**: الصفحات الأساسية (Dashboard, Lessons, Exam, Notifications) محمّلة مباشرة (Eager)، والثانوية (35+ صفحة) محمّلة كسولاً (Lazy)
- **السلوك الأصلي**: زر الرجوع، شريط الحالة، لوحة المفاتيح، شاشة البداية — كلها مهيّأة
- **التنقل**: شريط التنقل السفلي يظهر دائماً في البيئة الأصلية
- **ChatWidget**: مخفي في بيئة Native (صحيح)
- **الحزم**: Capacitor v8 مع جميع الملحقات متوافقة

### خطوات بناء APK

لا يوجد تعديلات برمجية مطلوبة. فقط اتبع هذه الأوامر على جهازك:

**1. تحديث الكود من GitHub:**
```bash
git pull origin main
```

**2. تثبيت التبعيات وبناء ملفات الويب:**
```bash
npm install
npm run build
```

**3. مزامنة مع Android:**
```bash
npx cap sync android
```

**4. فتح المشروع في Android Studio:**
```bash
npx cap open android
```

**5. بناء نسخة الإصدار (Release APK):**

من داخل مجلد `android`:
```bash
cd android
gradlew.bat assembleRelease
```
أو من Android Studio: **Build → Generate Signed Bundle / APK** واختر APK ثم استخدم ملف التوقيع `mufadhala-release.keystore`.

**6. موقع ملف APK الناتج:**
```
android/app/build/outputs/apk/release/app-release.apk
```

### ملاحظات مهمة
- تأكد من استخدام **Java JDK 17** و **Android SDK** مع targetSdkVersion 34
- إذا كان مجلد `android` غير موجود، أضفه أولاً: `npx cap add android` ثم انقل موارد الأيقونات وشاشة البداية المخصصة
- للمزيد من التفاصيل حول Capacitor مع Lovable: [دليل Capacitor](https://docs.lovable.dev/tips-tricks/native-mobile-apps)

