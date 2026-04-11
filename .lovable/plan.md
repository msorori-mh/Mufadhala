

# خطة تحسين أداء التطبيق على Android APK

## ملخص
6 تحسينات لتسريع التطبيق داخل WebView على Android: تقليل حجم الـ bundle الأولي، إزالة التبعية على الإنترنت للخطوط، تسريع ظهور الشاشة الأولى، وتخفيف الحمل على GPU.

---

## المهام

### 1. Lazy Loading للصفحات (App.tsx)
- تحويل 35+ صفحة من `import` مباشر إلى `React.lazy()`
- الإبقاء على `Index` و `Login` فقط كـ eager imports
- إضافة `<Suspense>` مع skeleton loader بسيط حول `<Routes>`
- **التأثير**: تقليل حجم الـ initial bundle بنسبة 60-70%

### 2. Self-host خط Cairo (index.css + public/fonts/)
- تحميل ملفات Cairo WOFF2 (أوزان 400, 500, 600, 700) إلى `public/fonts/`
- استبدال سطر `@import url('https://fonts.googleapis.com/...')` بـ `@font-face` محلي مع `font-display: swap`
- **التأثير**: إلغاء طلب شبكة خارجي، ظهور النص فوراً

### 3. تحسين AuthContext (src/contexts/AuthContext.tsx)
- بعد `getSession()` ناجح: عمل `setUser(session.user)` فوراً ثم `fetchRoles` بشكل غير متزامن بدون انتظار
- تعيين `setLoading(false)` فور تعيين الـ user بدلاً من انتظار الـ roles
- **التأثير**: تقليل وقت ظهور الشاشة الأولى بـ 500-800ms

### 4. إخفاء ChatWidget على Native (App.tsx)
- لف `<ChatWidget />` بشرط `!isNativePlatform()` لعدم تحميله أو عرضه في APK
- **التأثير**: توفير ذاكرة وتقليل DOM nodes على الموبايل

### 5. إزالة framer-motion من Dashboard (src/pages/Dashboard.tsx)
- استبدال `<motion.div>` بـ `<div>` عادي مع CSS transitions بسيطة (opacity + transform عبر Tailwind `animate-`)
- إزالة `import { motion } from "framer-motion"` — إذا لم يُستخدم في مكان آخر، يمكن إزالة المكتبة من package.json
- **التأثير**: توفير ~100KB gzipped من الـ bundle

### 6. تعليمات AndroidManifest (للمستخدم)
- لا يوجد `AndroidManifest.xml` في المستودع — يُولَّد محلياً
- سأوفر التعليمات لإضافة `android:hardwareAccelerated="true"` و `android:largeHeap="true"` يدوياً بعد `npx cap add android`

---

## التفاصيل التقنية

**الملفات المتأثرة:**
- `src/App.tsx` — lazy imports + Suspense + إخفاء ChatWidget
- `src/index.css` — @font-face بدلاً من Google Fonts import
- `public/fonts/` — ملفات Cairo WOFF2 (يتم تحميلها)
- `src/contexts/AuthContext.tsx` — parallel auth flow
- `src/pages/Dashboard.tsx` — إزالة framer-motion
- `package.json` — إزالة framer-motion إذا لم يُستخدم في مكان آخر

**framer-motion**: يُستخدم فقط في `Dashboard.tsx` — سيتم إزالته من `package.json` بالكامل.

