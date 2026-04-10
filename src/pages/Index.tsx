import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, ClipboardCheck, TrendingUp, Loader2, Brain, FileCheck, Shield, Focus, WifiOff, Users, CheckCircle } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { resolveAuthDestination } from "@/lib/authRouting";

function useCountUp(end: number, duration = 2000, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number;
    let raf: number;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      setValue(Math.floor(progress * end));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [end, duration, start]);
  return value;
}

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
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

  const statsRef = useInView();
  const featuresRef = useInView();
  const badgesRef = useInView();

  const q = useCountUp(3000, 2000, statsRef.inView);
  const s = useCountUp(150, 2000, statsRef.inView);
  const m = useCountUp(100, 2000, statsRef.inView);

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
      <section className="gradient-hero relative overflow-hidden flex-1 flex items-center justify-center px-4 pt-[calc(env(safe-area-inset-top)+6rem)] pb-16 md:py-16 min-h-[70vh]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-40 h-40 mb-10 me-4 animate-float rounded-full overflow-hidden bg-white/20 backdrop-blur-sm">
            <img src={logoImg} alt="شعار مُفَاضَلَة" className="w-full h-full object-cover drop-shadow-lg" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-6 leading-tight">مُفَاضَلَة</h1>
          <p className="text-lg md:text-xl text-primary-foreground/85 mb-8 leading-relaxed">مُفَاضَلَة... هندسة النجاح في اختبارات القبول.</p>
          <Button size="lg" onClick={() => navigate("/login")} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-bold px-8 py-6 rounded-xl shadow-lg">
            ابدأ الآن
          </Button>
        </div>
      </section>

      {/* Main Hook */}
      <section className="bg-primary py-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-4xl font-extrabold text-primary-foreground leading-snug">
            لا تترك حلمك للصدفة..
            <br />
            <span className="text-secondary">هندس طريقك</span> للقبول في الجامعات اليمنية
          </h2>
        </div>
      </section>

      {/* Core Features */}
      <section className="bg-background py-14 px-4">
        <div ref={featuresRef.ref} className="max-w-5xl mx-auto grid gap-6 md:grid-cols-3">
          {[
            { icon: Brain, title: "ذكاء اصطناعي يحلل فجواتك المعرفية", desc: "تطبيقنا لا يختبرك فقط، بل يكتشف نقاط ضعفك ويحدد الدروس التي تحتاج لتقويتها، ليوفر لك 50% من وقت المذاكرة." },
            { icon: BookOpen, title: "بنك الأسئلة الأضخم", desc: "آلاف الأسئلة المستمدة من أرشيف اختبارات القبول في الجامعات اليمنية مع شرح وتفنيد علمي لكل إجابة." },
            { icon: FileCheck, title: "نماذج المحاكاة الرسمية", desc: "اختبارات تحاكي النمط الحقيقي للجامعات من حيث توزيع الدرجات وإدارة الوقت، لكسر حاجز الرهبة وتدريبك على أجواء الامتحان الحقيقية." },
          ].map((f, i) => (
            <div key={i} className={`bg-card rounded-2xl border p-8 text-center transition-all duration-700 ${featuresRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`} style={{ transitionDelay: `${i * 150}ms` }}>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-accent/10 mb-5">
                <f.icon className="w-7 h-7 text-accent" />
              </div>
              <h3 className="font-bold text-foreground text-lg mb-3">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Value Badges */}
      <section className="bg-muted py-12 px-4">
        <div ref={badgesRef.ref} className="max-w-5xl mx-auto grid gap-4 md:grid-cols-3">
          {[
            { icon: Shield, label: "ثقة مطلقة", desc: "ستدخل قاعة الامتحان وأنت خبير بنمط الأسئلة." },
            { icon: Focus, label: "تركيز عالٍ", desc: "ملخصات ذكية تغنيك عن تشتت الملازم." },
            { icon: WifiOff, label: "مذاكرة بلا حدود", desc: "وضع الـ Offline يضمن لك الاستمرار في أي وقت." },
          ].map((b, i) => (
            <div key={i} className={`flex items-start gap-4 bg-card rounded-xl border p-5 transition-all duration-700 ${badgesRef.inView ? "opacity-100 translate-x-0" : "opacity-0 translate-x-6"}`} style={{ transitionDelay: `${i * 120}ms` }}>
              <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <b.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-bold text-foreground mb-1">{b.label}</p>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-primary py-12 px-4">
        <div ref={statsRef.ref} className="max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center">
          {[
            { value: q, suffix: "+", label: "سؤال تدريبي" },
            { value: s, suffix: "+", label: "ملخص ذكي" },
            { value: m, suffix: "%", label: "مطابقة للمعايير الوزارية" },
          ].map((st, i) => (
            <div key={i}>
              <p className="text-3xl md:text-5xl font-extrabold text-secondary">{st.value}{st.suffix}</p>
              <p className="text-sm md:text-base text-primary-foreground/80 mt-1">{st.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Note */}
      <section className="bg-background py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <CheckCircle className="w-10 h-10 text-accent mx-auto mb-4" />
          <p className="text-muted-foreground leading-relaxed text-base md:text-lg">
            محتوى مراجع ومعتمد من قبل خبراء وأكاديميين لضمان دقة المعلومات وتوافقها التام مع معايير المفاضلة الجامعية.
          </p>
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-muted py-14 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Users className="w-10 h-10 text-primary mx-auto mb-4" />
          <p className="text-lg md:text-xl font-bold text-foreground mb-6">
            انضم إلى أكثر من <span className="text-accent">1000</span> طالب بدأوا رحلتهم الآن نحو كليات القمة.
          </p>
          <Button size="lg" onClick={() => navigate("/register")} className="bg-accent text-accent-foreground hover:bg-accent/90 font-bold px-8 py-6 rounded-xl shadow-lg">
            سجّل مجاناً الآن
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-6 px-4 text-center space-y-2">
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} مُفَاضَلَة | Mufadhala - جميع الحقوق محفوظة</p>
        <a href="/privacy-policy" className="text-sm text-primary hover:underline">سياسة الخصوصية</a>
      </footer>
    </div>
  );
});

Index.displayName = "Index";
export default Index;
