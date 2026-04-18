
## الفهم
في صفحة `/install`، زر "دخول الموقع" يستخدم `<Link to="/">` من react-router-dom، مما يُبقي المستخدم على نفس الـ origin الحالي (مثلاً preview أو lovable.app)، بدلاً من توجيهه للدومين الرسمي `mufadhala.com`.

## الحل
في `src/pages/Install.tsx`، استبدل `Link` الداخلي بوسم `<a>` خارجي يشير صراحةً إلى `https://mufadhala.com`.

### التغيير (سطر 117-122)
```tsx
<Button asChild variant="ghost" className="gap-2">
  <a href="https://mufadhala.com">
    <ArrowLeft className="w-4 h-4" />
    دخول الموقع
  </a>
</Button>
```

### النطاق
- ملف واحد: `src/pages/Install.tsx`
- تغيير سطرين فقط (استبدال `Link to="/"` بـ `<a href="https://mufadhala.com">`)
- إزالة استيراد `Link` إذا لم يعد مستخدماً
