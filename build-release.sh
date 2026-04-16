#!/usr/bin/env bash
# ============================================================================
#  Mufadhala — Android Release Build Script
#  الاستخدام: ./build-release.sh [apk|aab]
#  apk  → يولّد APK موقّع (للاختبار/التوزيع المباشر)
#  aab  → يولّد Android App Bundle (للنشر على Google Play) — الافتراضي
# ============================================================================

set -e  # توقف فور حدوث أي خطأ
set -o pipefail

# ---------- الألوان ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ---------- الإعدادات ----------
BUILD_TYPE="${1:-aab}"    # aab افتراضياً
APP_NAME="مُفَاضَلَة"
EXPECTED_VERSION="5.1.0"
EXPECTED_VERSION_CODE="50100"

# ---------- دوال مساعدة ----------
log()    { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"; }
ok()     { echo -e "${GREEN}✓${NC} $1"; }
warn()   { echo -e "${YELLOW}⚠${NC}  $1"; }
err()    { echo -e "${RED}✗ $1${NC}"; exit 1; }
section(){ echo -e "\n${BLUE}════════════════════════════════════════════${NC}"; echo -e "${BLUE} $1${NC}"; echo -e "${BLUE}════════════════════════════════════════════${NC}"; }

# ============================================================================
section "🚀 بناء $APP_NAME — نوع الإخراج: $BUILD_TYPE"
# ============================================================================

# ---------- 0) فحوصات أولية ----------
section "0️⃣  فحوصات البيئة"

[ -f "package.json" ]        || err "package.json غير موجود — تأكد أنك في جذر المشروع"
[ -f "capacitor.config.ts" ] || err "capacitor.config.ts غير موجود"
[ -d "android" ]             || err "مجلد android غير موجود — شغّل: npx cap add android"

command -v node    >/dev/null || err "Node.js غير مثبّت"
command -v npm     >/dev/null || err "npm غير مثبّت"
command -v java    >/dev/null || err "Java JDK غير مثبّت"

# تحقق من JDK 17
JAVA_VER=$(java -version 2>&1 | head -1 | awk -F\" '{print $2}' | cut -d. -f1)
if [ "$JAVA_VER" != "17" ]; then
  warn "نسخة Java الحالية: $JAVA_VER — يُفضّل JDK 17"
else
  ok "Java 17 ✓"
fi

# تحقق من ANDROID_HOME
if [ -z "$ANDROID_HOME" ]; then
  warn "متغير ANDROID_HOME غير معرّف — قد تفشل عملية البناء"
else
  ok "ANDROID_HOME = $ANDROID_HOME"
fi

# ---------- 1) تحقق من إعداد الإنتاج ----------
section "1️⃣  فحص إعدادات الإنتاج"

if grep -q "url:" capacitor.config.ts 2>/dev/null && grep -A5 "server" capacitor.config.ts | grep -q "url:"; then
  err "❌ بلوك server موجود في capacitor.config.ts — احذفه قبل بناء الإنتاج!"
else
  ok "capacitor.config.ts نظيف من بلوك server (إنتاج)"
fi

# تحقق من versionCode
if [ -f "android/app/build.gradle" ]; then
  CURRENT_VC=$(grep "versionCode" android/app/build.gradle | head -1 | awk '{print $2}')
  CURRENT_VN=$(grep "versionName" android/app/build.gradle | head -1 | awk '{print $2}' | tr -d '"')
  log "الإصدار الحالي: $CURRENT_VN ($CURRENT_VC)"
  if [ "$CURRENT_VC" != "$EXPECTED_VERSION_CODE" ]; then
    warn "versionCode الحالي ($CURRENT_VC) ≠ المتوقع ($EXPECTED_VERSION_CODE)"
    read -p "هل تريد المتابعة؟ (y/N) " -n 1 -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]] || exit 1
  fi
fi

# ---------- 2) تنظيف ----------
section "2️⃣  تنظيف البناءات السابقة"
rm -rf dist/ android/app/build/ android/build/ 2>/dev/null || true
ok "تم تنظيف dist و android/build"

# ---------- 3) تثبيت التبعيات ----------
section "3️⃣  تثبيت تبعيات npm"
npm install
ok "تم تثبيت التبعيات"

# ---------- 4) بناء Web ----------
section "4️⃣  بناء نسخة Web الإنتاجية"
npm run build
[ -d "dist" ] || err "فشل بناء Web — مجلد dist غير موجود"
DIST_SIZE=$(du -sh dist | cut -f1)
ok "تم بناء Web بحجم: $DIST_SIZE"

# ---------- 5) مزامنة Capacitor ----------
section "5️⃣  مزامنة الملفات مع Android"
npx cap sync android
ok "تمت المزامنة"

# ---------- 6) بناء Android ----------
section "6️⃣  بناء $BUILD_TYPE الموقّع"
cd android

if [ "$BUILD_TYPE" = "apk" ]; then
  log "بناء APK..."
  ./gradlew assembleRelease
  OUTPUT_PATH="app/build/outputs/apk/release/app-release.apk"
  OUTPUT_NAME="Mufadhala-v${EXPECTED_VERSION}-release.apk"
elif [ "$BUILD_TYPE" = "aab" ]; then
  log "بناء AAB (Bundle for Play Store)..."
  ./gradlew bundleRelease
  OUTPUT_PATH="app/build/outputs/bundle/release/app-release.aab"
  OUTPUT_NAME="Mufadhala-v${EXPECTED_VERSION}-release.aab"
else
  err "نوع البناء غير صالح: $BUILD_TYPE (استخدم apk أو aab)"
fi

cd ..

# ---------- 7) التحقق من الإخراج ----------
section "7️⃣  التحقق من الإخراج"
if [ -f "android/$OUTPUT_PATH" ]; then
  SIZE=$(du -h "android/$OUTPUT_PATH" | cut -f1)
  mkdir -p releases
  cp "android/$OUTPUT_PATH" "releases/$OUTPUT_NAME"
  ok "تم بناء الملف بنجاح:"
  echo -e "   📦 ${GREEN}releases/$OUTPUT_NAME${NC} ($SIZE)"
else
  err "ملف الإخراج غير موجود: android/$OUTPUT_PATH"
fi

# ---------- 8) ملخص نهائي ----------
section "✅ اكتمل البناء بنجاح"
echo -e "  • التطبيق:       $APP_NAME"
echo -e "  • الإصدار:        v$EXPECTED_VERSION ($EXPECTED_VERSION_CODE)"
echo -e "  • نوع البناء:     $BUILD_TYPE"
echo -e "  • المسار:         releases/$OUTPUT_NAME"
echo -e "  • الحجم:          $SIZE"
echo ""
echo -e "${YELLOW}الخطوات التالية:${NC}"
if [ "$BUILD_TYPE" = "aab" ]; then
  echo -e "  1. ارفع الملف على Google Play Console → Internal Testing"
  echo -e "  2. تأكد من تحديث Release Notes بالعربية"
  echo -e "  3. تحقق من نموذج Data Safety (Mufadhala_DataSafety_Form.pdf)"
else
  echo -e "  1. ثبّت APK على هاتف اختبار: adb install releases/$OUTPUT_NAME"
  echo -e "  2. اختبر تدفق التسجيل والاشتراك والاختبارات"
fi
echo ""
