
## المشكلة

أي تحديث (محتوى، اشتراك، صلاحيات) لا يظهر للطالب إلا بعد تسجيل خروج/دخول. السبب: استعلامات React Query تستخدم `staleTime` طويل بدون آلية تحديث، والكاش لا يُبطل عند العودة للتطبيق.

## السبب الجذري

بفحص الكود:
- `useStudentData`: `staleTime: 2 دقيقة`
- `useStudentAccess` (collegeData): `staleTime: 10 دقائق`
- `useSubscription`: لا يوجد invalidation عند focus
- لا يوجد إعداد عام `refetchOnWindowFocus` أو `refetchOnReconnect` في `QueryClient`
- لا يوجد invalidation عند رجوع التطبيق من الخلفية (Capacitor `appStateChange`)

النتيجة: الطالب يفتح التطبيق ويرى بيانات قديمة مخزّنة في React Query، ولا تتحدث إلا عند إعادة تشغيل كاملة (وقتها AuthProvider يعيد التهيئة من الصفر).

## الحل

### 1. إعداد QueryClient عام (ملف `src/App.tsx` أو حيث يُنشأ)
- تفعيل `refetchOnWindowFocus: true`
- تفعيل `refetchOnReconnect: true`
- تقليل `staleTime` الافتراضي إلى **30 ثانية** (بدل ما هو الآن)
- `gcTime: 5 دقائق`

### 2. إضافة `useAppRefresh` hook جديد
- يستمع لحدث Capacitor `App.addListener('appStateChange')`
- عند `isActive: true` (التطبيق رجع للواجهة): استدعاء `queryClient.invalidateQueries()` لكل ما يخص الطالب
- يستمع أيضاً لحدث `visibilitychange` على الويب
- يُستدعى مرة واحدة في `App.tsx` داخل `AuthProvider`

### 3. تقليل `staleTime` في الـ hooks الحرجة
- `useStudentData`: من 2 دقيقة → **30 ثانية**
- `useStudentAccess` (college-track-data): من 10 دقائق → **2 دقيقة** (المسارات نادراً ما تتغير لكن نريد رؤية التغيير بسرعة)
- `useSubscription`: التأكد من polling 30s الموجود + invalidation عند focus

### 4. Invalidation موجّه عند تحديث الأدوار
- في `AuthContext` عند `TOKEN_REFRESHED`: استدعاء `queryClient.invalidateQueries({ queryKey: ['student'] })` و `['subscription']`

## الملفات المعدَّلة

| الملف | التغيير |
|---|---|
| `src/App.tsx` | إعداد `QueryClient` عام + استدعاء `useAppRefresh` |
| `src/hooks/useAppRefresh.ts` | **جديد** — يستمع لـ `appStateChange` و `visibilitychange` ويبطل الكاش |
| `src/hooks/useStudentData.ts` | `staleTime: 30s` |
| `src/hooks/useStudentAccess.ts` | `staleTime: 2min` للـ college-track-data |
| `src/contexts/AuthContext.tsx` | invalidation عند `TOKEN_REFRESHED` |

## النتيجة المتوقعة

- أي تحديث من الإدارة (اشتراك، صلاحيات، محتوى) يظهر للطالب خلال **30 ثانية** كحد أقصى
- عند فتح التطبيق من الخلفية: تحديث فوري لكل البيانات
- لا حاجة لتسجيل خروج/دخول لرؤية أي تحديث
- لا تأثير سلبي على الأداء (الكاش لا يزال يعمل، فقط أقصر)
