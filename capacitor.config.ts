import type { CapacitorConfig } from '@capacitor/cli';

/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║          نظام ترقيم إصدارات تطبيق مُفَاضَلَة APK               ║
 * ║              Mufadhala Android Version History                ║
 * ╚═══════════════════════════════════════════════════════════════╝
 *
 * صيغة الترقيم: semantic-versioning + build-number
 * versionName: "v{major}.{minor}.{patch}-{codename}"
 * versionCode: {major}{minor}{patch}{build} (رقم صحيح للمتجر)
 *
 * تاريخ الإصدارات:
 * ═══════════════════════════════════════════════════════════════
 * v1.0.0-initial        (100000) - الإصدار الأولي الأساسي
 * v2.0.0-form-fix       (200000) - إصلاح أولي لحقول الإدخال
 * v3.0.0-debug-trace    (300000) - إضافة نظام تتبع الأخطاء
 * v4.0.0-kb-trace       (400000) - تتبع أحداث لوحة المفاتيح
 * v5.0.0-field-guard    (500000) - حماية الحقول من المسح التلقائي
 * v5.0.1-stable         (500001) - النسخة المستقرة الحالية
 * v6.0.0-lastName       (600000) - إعادة هيكلة نموذج الأسماء (fourthName → lastName)
 * ═══════════════════════════════════════════════════════════════
 */

const VERSION_NAME = 'v6.0.0-lastName';
const VERSION_CODE = 600000; // 6 = major, 0 = minor, 0 = patch, 00 = build

const config: CapacitorConfig = {
  appId: 'com.mufadhala.app',
  appName: 'مُفَاضَلَة',
  webDir: 'dist',
  versionName: VERSION_NAME,
  android: {
    backgroundColor: '#1A237E',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    versionName: VERSION_NAME,
    versionCode: VERSION_CODE,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1A237E',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
      style: 'dark',
    },
  },
};

export default config;
export { VERSION_NAME, VERSION_CODE };
