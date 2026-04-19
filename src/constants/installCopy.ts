/**
 * Single source of truth for all install-related copy across the platform.
 * Any future change to install messaging must happen here ONLY.
 */
export const INSTALL_COPY = {
  android: {
    full: 'لأجهزة أندرويد: افتح الرابط باستخدام Google Chrome ثم اختر «تثبيت التطبيق». بعض المتصفحات الأخرى قد لا تعرض خيار التثبيت بشكل صحيح.',
    short: 'للتثبيت على أندرويد: افتح الرابط باستخدام Google Chrome ثم اضغط «تثبيت التطبيق».',
  },
  ios: {
    full: 'لأجهزة آيفون وآيباد: افتح الرابط باستخدام متصفح Safari ثم اضغط زر المشاركة واختر «إضافة إلى الشاشة الرئيسية».',
    short: 'للتثبيت على آيفون: افتح الرابط في Safari ثم اختر «إضافة إلى الشاشة الرئيسية».',
  },
} as const;
