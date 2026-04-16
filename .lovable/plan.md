

## تحليل الطلب

إنشاء صفحة `/admin/conversion-funnel` تعرض إحصائيات النقرات على رابط الاشتراك من كل نقطة تماس (Touchpoint) لقياس فعالية كل نقطة في تحويل الطلاب من المستخدم المجاني إلى المشترك.

## نقاط التماس الخمس (Touchpoints) المعتمدة

1. `exam_simulator` — محاكي الاختبارات (بعد المحاولة المجانية)
2. `ai_generator` — مولد أسئلة مفاضل (بعد الحد اليومي)
3. `past_exams` — النماذج السابقة (نماذج مدفوعة)
4. `ai_performance` — تحليل الأداء بالذكاء الاصطناعي
5. `chat_widget` — المساعد الذكي (بعد 10 رسائل)

## التصميم التقني

### 1. جدول قاعدة البيانات الجديد
```sql
CREATE TABLE public.conversion_events (
  id uuid PK,
  user_id uuid NULL,
  source text NOT NULL,        -- e.g. 'exam_simulator'
  event_type text NOT NULL,    -- 'view' | 'click'
  metadata jsonb,
  created_at timestamptz
);
```
- RLS: Admins SELECT all, Authenticated INSERT (own event), no UPDATE/DELETE except admin.
- Index على `(source, event_type, created_at)`.

### 2. Helper Function للتتبع
ملف جديد: `src/lib/conversionTracking.ts`
- دالة `trackConversionEvent(source, eventType, metadata?)` — تستدعي insert على جدول `conversion_events`.
- دالة `trackSubscriptionClick(source)` — اختصار لتتبع النقر على رابط الاشتراك.

### 3. تتبع النقرات في النقاط الخمس
في كل من المكونات/الصفحات التالية، أضف استدعاء `trackSubscriptionClick(source)` عند النقر على زر/رابط `/subscription`:
- `FreeLimitMessage.tsx` (يستخدم في `ExamSimulator`, `AIPracticeQuestions`, `AIPerformanceAnalysis`) → استقبال prop `source`
- `PostExamUpgrade.tsx` → source = `exam_simulator`
- `PastExams.tsx` + `PastExamPractice.tsx` → source = `past_exams`
- `ChatWidget.tsx` → source = `chat_widget`

### 4. صفحة الأدمن
ملف جديد: `src/pages/admin/AdminConversionFunnel.tsx`
- Query: تجميع `conversion_events` حسب `source` لآخر 30 يوماً (قابل للتغيير).
- لكل touchpoint:
  - عدد النقرات الكلي
  - عدد المستخدمين الفريدين
  - النسبة من إجمالي النقرات (Bar visualization)
  - عدد الاشتراكات الفعلية المُنشأة بعد النقر (إن أمكن — نسبة تحويل تقديرية)
- جدول رئيسي + رسم بياني عمودي بسيط (recharts BarChart موجود).
- فلتر فترة زمنية (7/30/90 يوم).
- زر تحديث.

### 5. التسجيل في الراوتر
- في `src/App.tsx` ضمن قسم admin routes، أضف `<Route path="/admin/conversion-funnel" element={<AdminConversionFunnel />} />`.
- في `AdminLayout` sidebar، أضف رابط "قمع التحويل" تحت قسم التقارير (مع `PermissionGate` لـ `view_reports` أو admin).

### 6. تحديث الذاكرة
- إضافة memory جديدة: `mem://features/conversion-funnel-tracking` تشرح:
  - أسماء المصادر الخمسة المعتمدة (للحفاظ على التناسق)
  - مكان جدول `conversion_events`
  - دالة `trackSubscriptionClick` كنقطة دخول وحيدة
- تحديث `mem://index.md` لإضافة المرجع.

## ما لن يتغيّر
- منطق الاشتراك ولا حدود الـ Free Tier.
- رسائل الترقية الحالية تبقى كما هي.

## الخطوات
1. Migration: إنشاء جدول `conversion_events` + RLS + index.
2. إنشاء `src/lib/conversionTracking.ts`.
3. تعديل `FreeLimitMessage` لاستقبال prop `source` واستدعاء التتبع عند النقر.
4. تحديث المستدعيات الخمسة لتمرير `source` المناسبة + إضافة التتبع في `ChatWidget`, `PastExams`, `PastExamPractice`, `PostExamUpgrade` مباشرة.
5. إنشاء صفحة `AdminConversionFunnel.tsx`.
6. تسجيل الرابط في `App.tsx` + إضافة عنصر القائمة في `AdminLayout`.
7. تحديث ملفّي الذاكرة.

