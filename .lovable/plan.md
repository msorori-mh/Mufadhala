

## السبب الجذري

في `AdminPastExams.tsx` (السطور 149-156):

```js
if (isPublished && !editingModel.is_published) {
  const currentCount = questionCounts[editingModel.id] || 0;
  if (currentCount === 0) {
    toast({ variant: "destructive", title: "لا يمكن نشر نموذج فارغ", ... });
    setSaving(false);
    return; // ← يخرج صامتاً، لا يحفظ، يعتقد الأدمن أنه حُفظ
  }
}
```

عندما يحاول الأدمن نشر النموذج:
- إذا كانت قيمة `questionCounts[editingModel.id]` تساوي 0 (نموذج فارغ فعلياً، أو **بيانات cache قديمة** لم تتحدث بعد)، يتم منع الحفظ صامتاً.
- يُعرض toast "لا يمكن نشر نموذج فارغ" لكن قد يفوت الأدمن، فيظن أن التحديث تم بينما الواقع أن `is_published` لم يُحدّث.
- يبقى النموذج كمسودة، ويحتاج إعادة محاولة.

في حالات أخرى: `questionCounts` تُحسب من query منفصلة ذات key يعتمد على `models.map(m => m.id).join(",")`، وقد لا تكون متزامنة مع آخر تحديث (race condition بعد إضافة/استيراد أسئلة).

## الحل

### 1. التحقق المباشر من قاعدة البيانات وقت الحفظ
بدلاً من الاعتماد على `questionCounts` (cache)، إجراء `count` query مباشر داخل `handleSave` عند محاولة النشر.

```ts
if (isPublished && !editingModel.is_published) {
  const { count } = await supabase
    .from("past_exam_model_questions")
    .select("id", { count: "exact", head: true })
    .eq("model_id", editingModel.id);
  if ((count || 0) === 0) {
    toast(...);
    return;
  }
}
```

### 2. منع تفعيل Switch "منشور" أصلاً للنموذج الفارغ
في الفورم (السطر 327)، تعطيل Switch الـ "منشور" عندما يكون النموذج المُعدَّل فارغاً، مع نص توضيحي:

```tsx
<Switch
  checked={isPublished}
  onCheckedChange={setIsPublished}
  disabled={!!editingModel && (questionCounts[editingModel.id] || 0) === 0}
/>
<Label>منشور</Label>
{editingModel && (questionCounts[editingModel.id] || 0) === 0 && (
  <span className="text-[11px] text-destructive">أضف الأسئلة أولاً</span>
)}
```

### 3. إبطال cache الـ `questionCounts` بشكل أقوى
تغيير queryKey ليتضمّن timestamp يحدَّث عند فتح الفورم، بحيث نضمن جلب أحدث عدد للأسئلة قبل أي محاولة نشر:
- استدعاء `qc.invalidateQueries({ queryKey: ["admin-past-exam-question-counts"] })` داخل `openEdit` لضمان عدّ حديث.

### 4. تأكيد بصري بعد النشر الناجح
عند نجاح النشر، إضافة toast إيجابي يؤكد الحالة الجديدة بوضوح:
```ts
toast({ title: "تم تحديث النموذج", description: isPublished ? "✓ النموذج منشور للطلاب الآن" : "تم الحفظ كمسودة" });
```

## الملف المعدَّل

| الملف | التغيير |
|---|---|
| `src/pages/admin/AdminPastExams.tsx` | استبدال فحص cache بـ DB count مباشر + تعطيل Switch للنماذج الفارغة + invalidate counts عند فتح الفورم + رسالة تأكيد أوضح |

## النتيجة

- الأدمن يرى Switch "منشور" معطّلاً مع تنبيه واضح إذا كان النموذج فارغاً → يفهم لماذا لا يستطيع النشر.
- إذا كانت الأسئلة موجودة فعلاً، التحقق المباشر من DB يضمن نجاح النشر دون اعتماد على cache قديمة.
- toast واضح يؤكد حالة النشر بعد الحفظ.

