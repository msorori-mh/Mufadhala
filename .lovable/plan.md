

## تشخيص: لماذا لم يتم تحديث `build.gradle` تلقائياً؟

السكربت `scripts/sync-android-version.mjs` موجود لكنه **لا يعمل تلقائياً** — يجب تشغيله يدوياً كخطوة منفصلة. وهذا ما حدث: تم تخطّي السكربت بالكامل أثناء البناء، فبقي الملف على القيم الافتراضية `versionCode 1` و `versionName "1.0"`.

## الحل: ربط السكربت تلقائياً بسير عمل البناء

سأضيف ربطاً مزدوجاً يضمن استحالة نسيان الخطوة:

### 1) إضافة scripts في `package.json`
```json
"sync:android": "node scripts/sync-android-version.mjs",
"build:android": "npm run build && npx cap sync android && npm run sync:android"
```
بهذا يصبح أمر واحد يبني ويزامن الإصدار:
```bash
npm run build:android
cd android && ./gradlew assembleRelease
```

### 2) ربط Gradle ليشغّل السكربت قبل كل بناء (الحل الأقوى)
إضافة hook في `android/app/build.gradle`:
```gradle
task syncVersionFromTs(type: Exec) {
    workingDir "$rootDir/.."
    commandLine 'node', 'scripts/sync-android-version.mjs'
}
preBuild.dependsOn syncVersionFromTs
```
بهذا حتى لو شغّل المستخدم `./gradlew assembleRelease` مباشرة، سيقوم Gradle نفسه بتشغيل السكربت قبل البناء.

### 3) إصلاح فوري للحالة الحالية
سأعرض على المستخدم الأمر اليدوي السريع لتحديث الملف الآن قبل إعادة البناء:
```bash
node scripts/sync-android-version.mjs
cd android && ./gradlew clean assembleRelease
```

## الملفات المتوقع تعديلها
- `package.json` (إضافة scripts مساعدة)
- `android/app/build.gradle` (إضافة `syncVersionFromTs` task + `preBuild.dependsOn`)

## ملاحظة مهمة
- مجلد `android/` يُولَّد محلياً عبر `npx cap add android` ولا يُرفَع إلى GitHub، لذا تعديل `build.gradle` من Lovable لن ينعكس على جهازك. لكن إضافة الـ task في `build.gradle` سأوثّقها كتعليمات لتُضيفها مرة واحدة محلياً، ثم تبقى دائماً.
- الحل الأنظف هو **خيار 1** (script في `package.json`) لأنه يبقى في المستودع ويُسحب عبر `git pull`.

## الخطوات بعد الموافقة
1. أعدّل `package.json` لإضافة `sync:android` و `build:android`.
2. أُعطيك الأمر اليدوي الفوري لتحديث `build.gradle` الحالي.
3. أوثّق سير العمل الجديد المختصر.

