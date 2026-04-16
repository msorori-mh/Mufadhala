import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, ClipboardCheck, TrendingUp, Loader2, Brain, FileCheck, Shield, Focus, WifiOff, Users, CheckCircle, Bot, Clock, Headphones, HelpCircle } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useScrollReveal, useStaggerReveal } from "@/hooks/useScrollReveal";

function useCountUp(end: number, duration = 2000) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      let startTime: number;
      const step = (ts: number) => {
        if (!startTime) startTime = ts;
        const progress = Math.min((ts - startTime) / duration, 1);
        setValue(Math.floor(progress * end));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, 500);
    return () => clearTimeout(timer);
  }, [end, duration]);
  return value;
}

const Index = React.forwardRef<HTMLDivElement>((_, fwdRef) => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [showBubble, setShowBubble] = useState(false);

  // Show bubble only on first visit
  useEffect(() => {
    const seen = localStorage.getItem("landing_bubble_seen");
    if (!seen) {
      setShowBubble(true);
      localStorage.setItem("landing_bubble_seen", "true");
      const timer = setTimeout(() => setShowBubble(false), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard", { replace: true });
      } else {
        setChecking(false);
      }
    });
  }, [navigate]);

  const q = useCountUp(3000);
  const s = useCountUp(150);
  const m = useCountUp(100);

  const aiRef = useScrollReveal();
  const pillarsRef = useStaggerReveal(150);
  const badgesRef = useStaggerReveal(120);
  const statsRef = useScrollReveal();
  const trustRef = useScrollReveal();
  const socialRef = useScrollReveal();
  const faqRef = useScrollReveal();

  if (checking) {
    return (
      <div ref={fwdRef} className="min-h-screen gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div ref={fwdRef} className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="gradient-hero relative overflow-hidden flex items-center justify-center px-4 pt-[calc(env(safe-area-inset-top)+4rem)] pb-10 md:py-14 min-h-[45vh]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-48 h-48 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-5 animate-float rounded-full overflow-hidden bg-white/20 backdrop-blur-sm">
            <img src={logoImg} alt="شعار مُفَاضَلَة" className="w-full h-full object-cover drop-shadow-lg" />
          </div>
         <h1 className="text-[1.05rem] md:text-2xl lg:text-3xl font-bold text-primary-foreground mb-3 leading-snug">
            استعد لاختبار القبول بذكاء
          </h1>
          <p className="text-sm md:text-base text-primary-foreground/85 leading-relaxed mb-5">
            كل ما تحتاجه لاجتياز المفاضلة: تلخيص ذكي، تدريب فعّال ونماذج حقيقية
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mb-5">
            {[
              { emoji: "📘", text: "ملخصات ذكية" },
              { emoji: "🎯", text: "نماذج الأعوام السابقة" },
              { emoji: "🧠", text: "محاكي اختبار فعلي" },
              { emoji: "📊", text: "تحليل الأداء" },
            ].map((b) => (
              <span key={b.text} className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5 text-sm text-primary-foreground">
                <span>{b.emoji}</span>{b.text}
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={() => navigate("/register")} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-bold px-8 py-5 rounded-xl shadow-lg">
              ابدأ الآن
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/login")} className="border-white/40 text-primary-foreground hover:bg-transparent hover:text-primary-foreground text-sm px-6 py-4 rounded-xl bg-transparent">
              تسجيل الدخول
            </Button>
          </div>
        </div>
      </section>

      {/* Speech Bubble */}
      {showBubble && (
        <section className="gradient-hero py-3 md:py-5 px-4">
          <div className="max-w-3xl mx-auto flex justify-center">
            <button
              onClick={() => { setShowBubble(false); navigate("/exam-simulator"); }}
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-primary-foreground rounded-full px-5 py-2.5 text-sm font-bold shadow-lg animate-float cursor-pointer hover:bg-white/30 transition-colors"
            >
              جرّب مستواك الآن 🚀
            </button>
          </div>
        </section>
      )}

      {/* AI Assistant "Qabool" */}
      <section className="bg-background py-2.5 md:py-4 px-4">
        <div ref={aiRef} className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 rounded-lg border border-accent/20 bg-accent/5 px-4 py-3">
            <Bot className="w-5 h-5 text-accent shrink-0" />
            <div>
              <span className="font-bold text-foreground text-sm">المساعد الذكي "مُفاضِل"</span>
              <span className="text-muted-foreground text-xs mr-1">— مساعدك الشخصي بالذكاء الاصطناعي، يتابع تقدمك ويقترح خطة مذاكرة مخصصة لنقاط ضعفك.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Academic Core Pillars */}
      <section id="features-section" className="bg-muted py-5 md:py-8 px-4">
        <div ref={pillarsRef} className="max-w-5xl mx-auto grid gap-2.5 md:gap-4 md:grid-cols-3">
          {[
            { icon: BookOpen, emoji: "📚", title: "شمولية المنهج الوزاري", desc: "تغطية دقيقة لكافة المقررات الدراسية المطلوبة في اختبارات المفاضلة." },
            { icon: Brain, emoji: "🧠", title: "تعزيز الفهم بالتعليل", desc: "شرح علمي مبسط لكل سؤال يوضح لماذا هذه الإجابة هي الأصح." },
            { icon: FileCheck, emoji: "⏱️", title: "محاكاة بيئة الاختبار", desc: "اختبارات تحاكي النمط الحقيقي من حيث الدرجات وإدارة الوقت." },
          ].map((f, i) => (
            <div key={i} data-reveal className="bg-card rounded-xl border p-3 flex items-start gap-3 text-right md:block md:text-center" style={{ animationDelay: `${i * 150}ms` }}>
              <div className="inline-flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-lg bg-accent/10 shrink-0 md:mb-3">
                <f.icon className="w-4 h-4 md:w-5 md:h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm mb-1 md:mb-2">{f.emoji} {f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Value Badges */}
      <section className="bg-background py-4 md:py-6 px-4">
        <div ref={badgesRef} className="max-w-5xl mx-auto grid gap-2 md:gap-3 md:grid-cols-3">
          {[
            { icon: Shield, label: "ثقة مطلقة", desc: "خبير بنمط الأسئلة قبل دخول القاعة." },
            { icon: Focus, label: "تركيز عالٍ", desc: "ملخصات ذكية تغنيك عن تشتت الملازم." },
            { icon: WifiOff, label: "أوفلاين دائماً", desc: "ذاكر بدون إنترنت مستمر." },
          ].map((b, i) => (
            <div key={i} data-reveal className="flex items-center gap-3 bg-card rounded-lg border p-3">
              <div className="shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <b.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{b.label}</p>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-primary py-4 md:py-6 px-4">
        <div ref={statsRef} className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { value: q, suffix: "+", label: "سؤال تدريبي" },
            { value: s, suffix: "+", label: "ملخص ذكي" },
            { value: m, suffix: "%", label: "مطابقة جامعية" },
            { value: null, suffix: "", label: "دعم 24/7", icon: Headphones },
          ].map((st, i) => (
            <div key={i} className="py-1">
              {st.value !== null ? (
                <p className="text-2xl md:text-3xl font-extrabold text-secondary">{st.value}{st.suffix}</p>
              ) : (
                <div className="flex justify-center">
                  <Headphones className="w-7 h-7 md:w-8 md:h-8 text-secondary" />
                </div>
              )}
              <p className="text-xs md:text-sm text-primary-foreground/80 mt-1">{st.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Note */}
      <section className="bg-background py-4 md:py-6 px-4">
        <div ref={trustRef} className="max-w-3xl mx-auto text-center">
          <CheckCircle className="w-7 h-7 text-accent mx-auto mb-2" />
          <p className="text-foreground font-semibold leading-relaxed text-sm">
            محتوى مراجع ومعتمد من خبراء وأكاديميين لضمان التوافق مع معايير المفاضلة.
          </p>
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-muted py-5 md:py-8 px-4">
        <div ref={socialRef} className="max-w-2xl mx-auto text-center">
          <Users className="w-7 h-7 text-primary mx-auto mb-3" />
          <p className="text-base md:text-lg font-bold text-foreground mb-4">
            انضم إلى أكثر من <span className="text-accent">1000</span> طالب نحو كليات القمة
            <span className="text-muted-foreground text-sm font-normal"> (الطب، الهندسة، الحاسوب)</span>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={() => navigate("/register")} className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold px-8 py-5 rounded-xl shadow-lg">
              سجّل مجاناً الآن
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/login")} className="text-sm px-6 py-4 rounded-xl">
              تسجيل الدخول
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-background py-5 md:py-8 px-4">
        <div ref={faqRef} className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-5">
            <HelpCircle className="w-6 h-6 text-primary" />
            <h2 className="text-lg md:text-xl font-extrabold text-foreground">الأسئلة الشائعة</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-2">
            {[
              { q: "ما هي مُفَاضَلَة؟", a: "منصة تعليمية متخصصة تساعد طلاب الثانوية العامة في اليمن على التحضير لاختبارات القبول (المفاضلة) في الجامعات اليمنية من خلال بنك أسئلة شامل واختبارات محاكاة." },
              { q: "هل التطبيق مجاني؟", a: "يمكنك التسجيل مجاناً والوصول إلى ملخصات الدروس والدرس الأول من كل تخصص. للاستفادة الكاملة من جميع الأسئلة والاختبارات، يمكنك الاشتراك بخطة مناسبة." },
              { q: "كم تكلفة الاشتراك؟", a: "تختلف تكلفة الاشتراك حسب محافظتك. هناك منطقتان: المنطقة (أ) بسعر 7,000 ريال والمنطقة (ب) بسعر 3,000 ريال. يتم تحديد منطقتك تلقائياً بناءً على المحافظة المسجلة في ملفك الشخصي." },
              { q: "ما طرق الدفع المتاحة؟", a: "نوفر عدة طرق دفع تناسب الجميع، منها التحويل عبر الشبكة الموحدة والحسابات البنكية. يمكنك نسخ بيانات الدفع بضغطة واحدة أو مسح باركود الدفع مباشرة." },
              { q: "كيف أفعّل اشتراكي بعد الدفع؟", a: "بعد إتمام الدفع، ارفع صورة إيصال التحويل من داخل التطبيق. سيتم مراجعة طلبك وتفعيل اشتراكك في أقرب وقت." },
              { q: "هل يعمل التطبيق بدون إنترنت؟", a: "نعم، يمكنك تحميل الدروس والاختبارات ومراجعتها في أي وقت بدون اتصال بالإنترنت." },
              { q: "ما الجامعات التي يغطيها التطبيق؟", a: "نغطي اختبارات المفاضلة لمعظم الجامعات اليمنية الحكومية والأهلية، بما فيها تخصصات الطب والهندسة والحاسوب." },
              { q: "كيف أحذف حسابي؟", a: "يمكنك حذف حسابك نهائياً من صفحة الإعدادات > حذف الحساب. سيتم حذف جميع بياناتك بشكل فوري ودائم." },
            ].map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="bg-card border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-3">{item.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-3">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>


      <footer className="bg-card border-t py-6 px-4 text-center space-y-2">
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} مُفَاضَلَة | Mufadhala - جميع الحقوق محفوظة</p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a href="/privacy-policy" className="text-sm text-primary hover:underline">سياسة الخصوصية</a>
          <span className="text-muted-foreground">|</span>
          <a href="/terms-of-service" className="text-sm text-primary hover:underline">شروط الاستخدام</a>
          <span className="text-muted-foreground">|</span>
          <a href="/request-delete" className="text-sm text-primary hover:underline">حذف الحساب</a>
        </div>
      </footer>
    </div>
  );
});

Index.displayName = "Index";
export default Index;
