import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield } from "lucide-react";

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const lastUpdated = "2025-01-10";

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-primary-foreground/80 hover:text-primary-foreground mb-4">
            <ArrowRight className="w-4 h-4 me-1" /> رجوع
          </Button>
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-secondary" />
            <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground">سياسة الخصوصية</h1>
          </div>
          <p className="text-primary-foreground/70 mt-2 text-sm">آخر تحديث: {lastUpdated}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {[
          {
            title: "مقدمة",
            content: "مرحباً بك في تطبيق مُفَاضَلَة (Mufadhala). نحن نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية. توضح هذه السياسة كيفية جمع واستخدام وحماية معلوماتك عند استخدام تطبيقنا."
          },
          {
            title: "البيانات التي نجمعها",
            content: `نقوم بجمع الأنواع التالية من البيانات:

• **بيانات الحساب**: الاسم الرباعي، رقم الهاتف، البريد الإلكتروني، الجامعة، الكلية، التخصص، المعدل التراكمي، المحافظة.
• **بيانات الاستخدام**: نتائج الاختبارات، تقدم الدروس، الإنجازات، سجل البحث داخل التطبيق.
• **بيانات الجهاز**: نوع الجهاز، نظام التشغيل، معرّف الجهاز لأغراض تقنية فقط.
• **بيانات الدفع**: معلومات إيصالات الدفع التي ترفعها لتفعيل الاشتراك.`
          },
          {
            title: "كيف نستخدم بياناتك",
            content: `نستخدم بياناتك للأغراض التالية:

• تقديم خدمات التطبيق وتحسين تجربة التعلم.
• تحليل أدائك الأكاديمي وتقديم توصيات مخصصة.
• إدارة حسابك واشتراكك.
• إرسال إشعارات تتعلق بتحديثات التطبيق والمحتوى الجديد.
• تحسين وتطوير خدماتنا بشكل مستمر.`
          },
          {
            title: "مشاركة البيانات",
            content: `نحن لا نبيع بياناتك الشخصية لأي طرف ثالث. قد نشارك بياناتك فقط في الحالات التالية:

• مع مقدمي الخدمات التقنية الذين يساعدوننا في تشغيل التطبيق (مثل خدمات الاستضافة وقواعد البيانات).
• عند الطلب القانوني من الجهات المختصة.
• لحماية حقوقنا القانونية أو سلامة المستخدمين.`
          },
          {
            title: "حماية البيانات",
            content: "نتخذ إجراءات أمنية مناسبة لحماية بياناتك من الوصول غير المصرح به أو التعديل أو الإفصاح أو الإتلاف. تشمل هذه الإجراءات تشفير البيانات أثناء النقل، والتحكم في الوصول، والمراجعات الأمنية الدورية."
          },
          {
            title: "حقوقك",
            content: `لديك الحقوق التالية فيما يتعلق ببياناتك:

• **الوصول**: يمكنك طلب نسخة من بياناتك الشخصية.
• **التصحيح**: يمكنك تحديث أو تصحيح بياناتك عبر إعدادات الملف الشخصي.
• **الحذف**: يمكنك طلب حذف حسابك وبياناتك بالكامل.
• **الانسحاب**: يمكنك إلغاء اشتراكك والتوقف عن استخدام التطبيق في أي وقت.`
          },
          {
            title: "ملفات تعريف الارتباط والتخزين المحلي",
            content: "يستخدم التطبيق التخزين المحلي (Local Storage) لحفظ تفضيلاتك وبيانات الجلسة. كما قد يتم تخزين بعض البيانات مؤقتاً على جهازك لدعم وضع العمل بدون اتصال (Offline Mode)."
          },
          {
            title: "خصوصية الأطفال",
            content: "تطبيقنا موجه لطلاب الجامعات والمرحلة ما بعد الثانوية. لا نجمع بيانات من أطفال دون سن 13 عاماً عن علم. إذا اكتشفنا أن طفلاً دون هذا السن قد أنشأ حساباً، سنقوم بحذفه فوراً."
          },
          {
            title: "التعديلات على هذه السياسة",
            content: "قد نقوم بتحديث هذه السياسة من وقت لآخر. سنُخطرك بأي تغييرات جوهرية عبر إشعار داخل التطبيق. استمرارك في استخدام التطبيق بعد التعديلات يعني موافقتك عليها."
          },
          {
            title: "تواصل معنا",
            content: `إذا كانت لديك أي أسئلة أو استفسارات حول سياسة الخصوصية، يمكنك التواصل معنا عبر:

• **البريد الإلكتروني**: support@mufadhala.com
• **داخل التطبيق**: من خلال نظام المحادثة المباشرة.`
          },
        ].map((section, i) => (
          <div key={i}>
            <h2 className="text-xl font-bold text-foreground mb-3">{section.title}</h2>
            <div className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm md:text-base">
              {section.content.split("**").map((part, j) =>
                j % 2 === 1 ? <strong key={j} className="text-foreground">{part}</strong> : part
              )}
            </div>
          </div>
        ))}
      </main>

      <footer className="bg-card border-t py-6 px-4 text-center">
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} مُفَاضَلَة | Mufadhala - جميع الحقوق محفوظة</p>
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
