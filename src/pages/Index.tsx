import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, ClipboardCheck, TrendingUp, Loader2, Brain, FileCheck, Shield, Focus, WifiOff, Users, CheckCircle, Bot, Clock, Headphones, HelpCircle } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { resolveAuthDestination } from "@/lib/authRouting";

function useCountUp(end: number, duration = 2000) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      let startTime: number;
      let raf: number;
      const step = (ts: number) => {
        if (!startTime) startTime = ts;
        const progress = Math.min((ts - startTime) / duration, 1);
        setValue(Math.floor(progress * end));
        if (progress < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    // Try IntersectionObserver, fallback to immediate start
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver(([e]) => {
        if (e.isIntersecting) { start(); obs.disconnect(); }
      }, { threshold: 0, rootMargin: "200px" });
      obs.observe(el);
      // Fallback: start after 1s regardless
      const timer = setTimeout(start, 1000);
      return () => { obs.disconnect(); clearTimeout(timer); };
    } else {
      start();
    }
  }, [end, duration]);
  return { value, ref };
}

const Index = React.forwardRef<HTMLDivElement>((_, fwdRef) => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const dest = await resolveAuthDestination(session.user.id);
        navigate(dest.path, { replace: true });
      } else {
        setChecking(false);
      }
    });
  }, [navigate]);

  const q = useCountUp(3000);
  const s = useCountUp(150);
  const m = useCountUp(100);

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
          <h1 className="text-2xl md:text-4xl font-bold text-primary-foreground mb-3 leading-tight">مُفَاضَلَة</h1>
          <p className="text-base md:text-lg text-primary-foreground/85 mb-5 leading-relaxed">مُفَاضَلَة... هندسة النجاح في اختبارات القبول.</p>
          <Button size="lg" onClick={() => navigate("/login")} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-bold px-8 py-5 rounded-xl shadow-lg">
            ابدأ الآن
          </Button>
        </div>
      </section>

      {/* Hero Hook */}
      <section className="bg-primary py-8 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-xl md:text-3xl font-extrabold text-primary-foreground leading-snug">
            لا تترك حلمك للصدفة..
            <br />
            <span className="text-secondary">هندس طريقك</span> للقبول في الجامعات اليمنية
          </h2>
        </div>
      </section>

      {/* AI Assistant "Qabool" */}
      <section className="bg-background py-6 px-4">
        <div className="max-w-3xl mx-auto animate-fade-in">
          <div className="relative rounded-xl border border-accent/30 bg-gradient-to-br from-accent/5 via-background to-primary/5 p-5 md:p-6 text-center shadow overflow-hidden">
            <div className="relative z-10 flex flex-col items-center gap-3">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-accent/15">
                <Bot className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-base md:text-lg font-extrabold text-foreground">
                🤖 المساعد الذكي "قبول"
              </h3>
              <p className="text-muted-foreground leading-relaxed text-sm max-w-xl mx-auto">
                رفيقك الذكي الذي يحلل أداءك ويرشدك لأفضل الطرق لاجتياز المفاضلة بنجاح.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Academic Core Pillars */}
      <section className="bg-muted py-8 px-4">
        <div className="max-w-5xl mx-auto grid gap-4 md:grid-cols-3">
          {[
            { icon: BookOpen, emoji: "📚", title: "شمولية المنهج الوزاري", desc: "تغطية دقيقة لكافة المقررات الدراسية المطلوبة في اختبارات المفاضلة." },
            { icon: Brain, emoji: "🧠", title: "تعزيز الفهم بالتعليل", desc: "شرح علمي مبسط لكل سؤال يوضح لماذا هذه الإجابة هي الأصح." },
            { icon: FileCheck, emoji: "⏱️", title: "محاكاة بيئة الاختبار", desc: "اختبارات تحاكي النمط الحقيقي من حيث الدرجات وإدارة الوقت." },
          ].map((f, i) => (
            <div key={i} className="bg-card rounded-xl border p-4 text-center animate-fade-in" style={{ animationDelay: `${i * 150}ms` }}>
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-accent/10 mb-3">
                <f.icon className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-bold text-foreground text-sm mb-2">{f.emoji} {f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Value Badges */}
      <section className="bg-background py-6 px-4">
        <div className="max-w-5xl mx-auto grid gap-3 md:grid-cols-3">
          {[
            { icon: Shield, label: "ثقة مطلقة", desc: "خبير بنمط الأسئلة قبل دخول القاعة." },
            { icon: Focus, label: "تركيز عالٍ", desc: "ملخصات ذكية تغنيك عن تشتت الملازم." },
            { icon: WifiOff, label: "أوفلاين دائماً", desc: "ذاكر بدون إنترنت مستمر." },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-3 bg-card rounded-lg border p-3 animate-fade-in" style={{ animationDelay: `${i * 120}ms` }}>
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
      <section className="bg-primary py-6 px-4">
        <div ref={q.ref} className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { value: q.value, suffix: "+", label: "سؤال تدريبي" },
            { value: s.value, suffix: "+", label: "ملخص ذكي" },
            { value: m.value, suffix: "%", label: "مطابقة جامعية" },
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
      <section className="bg-background py-6 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <CheckCircle className="w-7 h-7 text-accent mx-auto mb-2" />
          <p className="text-muted-foreground leading-relaxed text-sm">
            محتوى مراجع ومعتمد من خبراء وأكاديميين لضمان التوافق مع معايير المفاضلة.
          </p>
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-muted py-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Users className="w-7 h-7 text-primary mx-auto mb-3" />
          <p className="text-base md:text-lg font-bold text-foreground mb-4">
            انضم إلى أكثر من <span className="text-accent">1000</span> طالب نحو كليات القمة
            <span className="text-muted-foreground text-sm font-normal"> (الطب، الهندسة، الحاسوب)</span>
          </p>
          <Button size="lg" onClick={() => navigate("/register")} className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold px-8 py-5 rounded-xl shadow-lg">
            سجّل مجاناً الآن
          </Button>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-background py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-5">
            <HelpCircle className="w-6 h-6 text-primary" />
            <h2 className="text-lg md:text-xl font-extrabold text-foreground">الأسئلة الشائعة</h2>
          </div>
          <Accordion type="single" collapsible className="space-y-2">
            {[
              { q: "ما هي مُفَاضَلَة؟", a: "منصة تعليمية متخصصة تساعد طلاب الثانوية العامة في اليمن على التحضير لاختبارات القبول (المفاضلة) في الجامعات اليمنية من خلال بنك أسئلة شامل واختبارات محاكاة." },
              { q: "هل التطبيق مجاني؟", a: "يمكنك التسجيل مجاناً والوصول إلى محتوى تجريبي. للاستفادة الكاملة من جميع الأسئلة والملخصات والاختبارات، يمكنك الاشتراك بخطة مناسبة." },
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
        <div className="flex items-center justify-center gap-4">
          <a href="/privacy-policy" className="text-sm text-primary hover:underline">سياسة الخصوصية</a>
          <span className="text-muted-foreground">|</span>
          <a href="/terms-of-service" className="text-sm text-primary hover:underline">شروط الاستخدام</a>
        </div>
      </footer>
    </div>
  );
});

Index.displayName = "Index";
export default Index;
