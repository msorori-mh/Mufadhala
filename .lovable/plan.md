

## الفهم
إضافة شارة برتقالية بجانب اسم المادة في مصفوفة `/admin/reports/content` عندما تكون المادة فارغة (لا دروس ولا أسئلة عبر كل الصفوف).

## الحل

في `src/pages/admin/AdminReportsContent.tsx`، داخل خلية اسم المادة في الجدول، أضف شارة `Badge` (variant مخصص برتقالي) عند تحقق:
```ts
row.totalLessons === 0 && row.totalQuestions === 0
```

### التغييرات
- ملف واحد: `src/pages/admin/AdminReportsContent.tsx`
- استيراد `Badge` من `@/components/ui/badge` وأيقونة `AlertCircle` من `lucide-react`
- تحديث خلية `<TableCell className="font-medium">{row.name_ar}</TableCell>`:
  ```tsx
  <TableCell className="font-medium">
    <div className="flex items-center gap-2">
      <span>{row.name_ar}</span>
      {row.totalLessons === 0 && row.totalQuestions === 0 && (
        <Badge className="bg-orange-500 hover:bg-orange-500 text-white text-[10px] gap-1">
          <AlertCircle className="w-3 h-3" />
          فارغة
        </Badge>
      )}
    </div>
  </TableCell>
  ```

### اختياري (بنفس المنطق)
نفس الشارة للجامعات الفارغة في مصفوفة الجامعات عند `row.models === 0 && row.questions === 0` بنص "بدون نماذج".

### النطاق
- ملف واحد فقط
- لا تغييرات DB
- لا استعلامات إضافية

