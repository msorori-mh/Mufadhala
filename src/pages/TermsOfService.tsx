import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText } from "lucide-react";

const TermsOfService = () => {
  const navigate = useNavigate();
  const lastUpdated = "2026-04-16";

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-primary-foreground/80 hover:text-primary-foreground mb-4">
            <ArrowRight className="w-4 h-4 me-1" /> رجوع
          </Button>
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-secondary" />
            <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground">شروط الاستخدام</h1>
          </div>
          <p className="text-primary-foreground/70 mt-2 text-sm">آخر تحديث: {lastUpdated}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {[
          {
            title: "مقدمة",
            content: "مرحباً بك في تطبيق مُفَاضَلَة (Mufadhala). باستخدامك لهذا التطبيق، فإنك توافق على الالتزام بشروط الاستخدام التالية. يرجى قراءتها بعناية قبل استخدام خدماتنا."
          },
          {
            title: "تعريفات",
            content: `• **التطبيق**: يشير إلى تطبيق مُفَاضَلَة (Mufadhala) بجميع منصاته (الويب، أندرويد، iOS).
• **المستخدم**: أي شخص يقوم بالتسجيل أو استخدام التطبيق.
• **المحتوى**: جميع الدروس، الأسئلة، الاختبارات، الملخصات، والمواد التعليمية المتوفرة في التطبيق.
• **الاشتراك**: الخطة المدفوعة التي تتيح الوصول الكامل لمحتوى التطبيق.`
          },
          {
            title: "شروط التسجيل",
            content: `• يجب أن يكون عمرك 13 عاماً على الأقل لاستخدام التطبيق.
• يجب تقديم معلومات صحيحة ودقيقة عند إنشاء الحساب.
• أنت مسؤول عن الحفاظ على سرية بيانات حسابك وكلمة المرور.
• يحق لنا تعليق أو إلغاء حسابك في حال مخالفة هذه الشروط.`
          },
          {
            title: "استخدام التطبيق",
            content: `يُسمح لك باستخدام التطبيق للأغراض التعليمية الشخصية فقط. يُحظر عليك:

• نسخ أو إعادة توزيع أو بيع أي محتوى من التطبيق دون إذن كتابي مسبق.
• مشاركة حسابك أو بيانات تسجيل الدخول مع أشخاص آخرين.
• استخدام التطبيق لأغراض غير قانونية أو مخالفة للآداب العامة.
• محاولة اختراق أو تعطيل أو التلاعب بأنظمة التطبيق.
• استخدام أدوات آلية (Bots) لاستخراج المحتوى أو البيانات.`
          },
          {
            title: "الملكية الفكرية",
            content: "جميع المحتويات المتوفرة في التطبيق، بما في ذلك النصوص والأسئلة والشروحات والتصاميم والشعارات، هي ملكية فكرية لتطبيق مُفَاضَلَة ومحمية بموجب قوانين حقوق النشر والملكية الفكرية. لا يجوز نسخها أو تعديلها أو توزيعها بأي شكل دون إذن كتابي صريح."
          },
          {
            title: "الاشتراكات والدفع",
            content: `• بعض المحتويات تتطلب اشتراكاً مدفوعاً للوصول إليها.
• يتم تفعيل الاشتراك بعد التحقق من إيصال الدفع من قبل فريق الإدارة.
• لا يمكن استرداد المبالغ المدفوعة بعد تفعيل الاشتراك إلا في حالات استثنائية يحددها فريق الدعم.
• يحق لنا تعديل أسعار الاشتراكات مع إشعار مسبق للمستخدمين.
• الاشتراك شخصي ولا يجوز نقله أو مشاركته مع مستخدمين آخرين.`
          },
          {
            title: "المحتوى التعليمي",
            content: `• نسعى لتقديم محتوى دقيق ومحدث، لكننا لا نضمن خلوه من الأخطاء بشكل مطلق.
• المحتوى المقدم هو للأغراض التعليمية والتدريبية ولا يُعتبر بديلاً عن المناهج الرسمية.
• نتائج الاختبارات التدريبية لا تعكس بالضرورة نتائج الامتحانات الفعلية.
• نحتفظ بحق تعديل أو حذف أو إضافة محتوى في أي وقت.`
          },
          {
            title: "إخلاء المسؤولية",
            content: `• التطبيق يُقدّم "كما هو" دون أي ضمانات صريحة أو ضمنية.
• لا نتحمل مسؤولية أي خسائر ناتجة عن استخدام التطبيق أو الاعتماد على محتواه.
• لا نضمن توفر التطبيق بشكل مستمر دون انقطاع أو أعطال تقنية.
• لا نتحمل مسؤولية نتائج القبول الجامعي للمستخدمين.`
          },
          {
            title: "الإنهاء",
            content: `يحق لنا إنهاء أو تعليق وصولك إلى التطبيق في أي وقت ودون إشعار مسبق إذا:

• انتهكت أياً من شروط الاستخدام هذه.
• قمت بمشاركة محتوى التطبيق بشكل غير مصرح به.
• استخدمت التطبيق بطريقة تضر بمصالحنا أو بمستخدمين آخرين.`
          },
          {
            title: "التعديلات على الشروط",
            content: "نحتفظ بحق تعديل هذه الشروط في أي وقت. سنقوم بإخطارك بالتغييرات الجوهرية عبر إشعار داخل التطبيق. استمرارك في استخدام التطبيق بعد نشر التعديلات يعني موافقتك على الشروط المعدّلة."
          },
          {
            title: "القانون المعمول به",
            content: "تخضع هذه الشروط وتُفسّر وفقاً للقوانين المعمول بها في الجمهورية اليمنية. أي نزاع ينشأ عن استخدام التطبيق يخضع للاختصاص القضائي للمحاكم المختصة."
          },
          {
            title: "الخصوصية وحماية البيانات",
            content: `نحن ملتزمون بحماية بياناتك الشخصية وفقاً لأعلى المعايير. للاطلاع على تفاصيل البيانات التي نجمعها وأغراض استخدامها وإجراءات الحماية المطبقة، يرجى مراجعة [سياسة الخصوصية](/privacy-policy) الخاصة بنا.

• تتطابق سياسة الخصوصية تماماً مع **نموذج أمان البيانات (Data Safety Form)** المُقدَّم لمتجر Google Play.
• يتم تشفير جميع البيانات أثناء النقل عبر **HTTPS / TLS 1.2+**.
• يمكنك طلب حذف حسابك وبياناتك في أي وقت من خلال صفحة [حذف الحساب](/delete-account) أو عبر البريد الإلكتروني.
• لا نبيع بياناتك الشخصية لأي طرف ثالث إطلاقاً.
• باستخدامك للتطبيق، فإنك توافق على ممارسات جمع ومعالجة البيانات الموضحة في سياسة الخصوصية ونموذج Data Safety.`
          },
          {
            title: "تواصل معنا",
            content: `إذا كانت لديك أي أسئلة حول شروط الاستخدام أو سياسة الخصوصية، يمكنك التواصل معنا عبر:

• **البريد الإلكتروني**: support@mufadhala.com
• **داخل التطبيق**: من خلال نظام المحادثة المباشرة.
• **سياسة الخصوصية**: [اضغط هنا للاطلاع](/privacy-policy)`
          },
        ].map((section, i) => (
          <div key={i}>
            <h2 className="text-xl font-bold text-foreground mb-3">{section.title}</h2>
            <div className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm md:text-base">
              {section.content.split("**").map((part, j) => {
                const renderWithLinks = (text: string, keyPrefix: string) => {
                  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                  const nodes: React.ReactNode[] = [];
                  let lastIdx = 0;
                  let match;
                  let k = 0;
                  while ((match = linkRegex.exec(text)) !== null) {
                    if (match.index > lastIdx) nodes.push(text.slice(lastIdx, match.index));
                    nodes.push(
                      <a
                        key={`${keyPrefix}-${k++}`}
                        href={match[2]}
                        onClick={(e) => { e.preventDefault(); navigate(match![2]); }}
                        className="text-primary underline hover:text-primary/80 font-medium"
                      >
                        {match[1]}
                      </a>
                    );
                    lastIdx = match.index + match[0].length;
                  }
                  if (lastIdx < text.length) nodes.push(text.slice(lastIdx));
                  return nodes;
                };
                return j % 2 === 1
                  ? <strong key={j} className="text-foreground">{renderWithLinks(part, `b-${j}`)}</strong>
                  : <React.Fragment key={j}>{renderWithLinks(part, `t-${j}`)}</React.Fragment>;
              })}
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

export default TermsOfService;
