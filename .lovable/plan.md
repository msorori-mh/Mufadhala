

## ملخص المشاكل

هناك نوعان من المشاكل في سجل الكونسول:

### 1. خطأ "Function components cannot be given refs" (Error)
- يظهر لمكوّنَي `Index` و `MobileBottomNav`
- **السبب**: React Router v6 يحاول تمرير `ref` للمكوّنات المباشرة داخل `<Route element>` وكذلك المكوّنات الموضوعة مباشرة داخل `<BrowserRouter>`. هذه المكوّنات عادية (function components) ولا تدعم refs.
- **الحل**: ليس خطأً حقيقياً يؤثر على العمل، لكن يمكن إسكاته بلف المكوّنات بـ `React.forwardRef` إذا أردنا نظافة الكونسول.

### 2. تحذيرات React Router Future Flags (Warning)
- `v7_startTransition` و `v7_relativeSplatPath`
- **السبب**: React Router v6 يُحذّر من تغييرات قادمة في v7.
- **الحل**: إضافة `future` flags إلى `<BrowserRouter>` لإسكات التحذيرات.

---

## خطة الإصلاح

### الخطوة 1: إضافة Future Flags لـ BrowserRouter
في `src/App.tsx`، تعديل `<BrowserRouter>` ليصبح:
```tsx
<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
```

### الخطوة 2: لف المكوّنات بـ forwardRef
- **`src/pages/Index.tsx`**: لف المكوّن بـ `React.forwardRef`
- **`src/components/MobileBottomNav.tsx`**: لف المكوّن بـ `React.forwardRef`

هذه تغييرات بسيطة لا تؤثر على الوظائف، فقط تنظّف سجل الأخطاء.

