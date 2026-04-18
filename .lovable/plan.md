
## الخطة

### 1. تتبع التنزيلات
- إعادة استخدام جدول `conversion_events` الموجود مع `source = 'install_share'` ولكن نحتاج source جديد للتنزيل
- **مشكلة**: `validate_conversion_event` trigger يقصر sources على قائمة محددة. نحتاج إضافة `'brochure_download'` للقائمة عبر migration
- في `Install.tsx`: عند الضغط على زر "تنزيل البروشور" → استدعاء `trackConversionEvent('brochure_download', 'click')`

### 2. عرض في الإدارة
- في `/admin/conversion-funnel` أو إنشاء بطاقة منفصلة بسيطة في AdminDashboard
- الأسهل: إضافة المصدر الجديد لتقرير `AdminConversionFunnel` الموجود (يستخدم `get_conversion_funnel_stats` RPC)
- المصدر سيظهر تلقائياً في القائمة بدون تعديل في RPC

### الملفات
| الملف | التغيير |
|---|---|
| migration | تحديث `validate_conversion_event` لإضافة `brochure_download` |
| `src/pages/Install.tsx` | استدعاء tracking عند الضغط على زر التنزيل |
| `src/pages/admin/AdminConversionFunnel.tsx` | إضافة label عربي للمصدر الجديد (إن وجدت خريطة labels) |

### النتيجة
كل تنزيل بروشور يُسجَّل في `conversion_events` ويظهر في تقرير قمع التحويل مع باقي المصادر.
