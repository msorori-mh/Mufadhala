

## التحضير لبناء APK نهائي مع تأكيد رقم الإصدار

### المطلوب
1. التأكد من مزامنة كل التغييرات الأخيرة على GitHub.
2. ضمان ظهور رقم الإصدار بوضوح داخل التطبيق.

### حالة المزامنة
- جميع التعديلات الأخيرة (ضغط بطاقات `/past-exams`، تمييز الفائز في جدول المقارنة، الفواصل بين السنوات) تتم مزامنتها تلقائياً بين Lovable و GitHub عبر التكامل ثنائي الاتجاه. لا حاجة لإجراء يدوي — فقط `git pull` على جهازك المحلي قبل البناء.

### فحص رقم الإصدار الحالي
سأتحقق من 3 مصادر رئيسية:
1. `android/app/build.gradle` → `versionName` و `versionCode`
2. `capacitor.config.ts` → التأكد من حذف قسم `server` (بناء إنتاجي)
3. `src/pages/Settings.tsx` و `DebugPanel` → عرض الإصدار للمستخدم

### الخطة

#### 1. تحديث رقم الإصدار (إن لزم)
- ترقية `versionName` (مثلاً `v5.1.0-stable`) و `versionCode` (مثلاً `50100`) في `android/app/build.gradle`.
- تحديث ملف `VERSIONS.md` بسجل التغييرات الأخيرة (ضغط النماذج، تمييز الفائز، الفواصل).

#### 2. إضافة/تأكيد ظهور رقم الإصدار في الواجهة
- ضمان وجود ثابت `APP_VERSION` في `src/domain/constants.ts`.
- عرضه بوضوح في:
  - أسفل صفحة `/settings` (مرئي للمستخدم العادي).
  - داخل `DebugPanel` (للتشخيص).
  - شاشة "حول التطبيق" إن وُجدت.

#### 3. تأكيد إعدادات Capacitor للإنتاج
- التحقق من حذف `server.url` من `capacitor.config.ts` لمنع التحميل من Lovable preview.
- التأكد من `webContentsDebuggingEnabled: false`.

#### 4. خطوات البناء المحلية (تذكير للمستخدم)
```bash
git pull
npm install
npm run build
npx cap sync android
cd android && ./gradlew assembleRelease
```

### الملفات المتوقع تعديلها
- `android/app/build.gradle` (رفع الإصدار)
- `src/domain/constants.ts` (تحديث `APP_VERSION`)
- `VERSIONS.md` (سجل التغييرات)
- `src/pages/Settings.tsx` (تأكيد ظهور الرقم)

### قبل البدء أحتاج تأكيداً
سأقوم بفحص الملفات أولاً لمعرفة الإصدار الحالي ثم اقتراح الإصدار الجديد المناسب (مثلاً `v5.1.0` للإضافات الجديدة على وضع النماذج السابقة).

