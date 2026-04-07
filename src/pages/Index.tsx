import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, ClipboardCheck, TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveAuthDestination } from "@/lib/authRouting";

const Index = React.forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  // Auto-redirect authenticated users
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

  const features = [
    {
      icon: BookOpen,
      title: "محتوى تعليمي شامل",
      description: "ملخصات ودروس مُعدّة بعناية لجميع مواد اختبار القبول",
    },
    {
      icon: ClipboardCheck,
      title: "نماذج اختبارات سابقة",
      description: "تدرّب على أسئلة حقيقية من اختبارات القبول السابقة",
    },
    {
      icon: TrendingUp,
      title: "محاكي الاختبار",
      description: "اختبارات محاكاة بتوقيت حقيقي لقياس جاهزيتك",
    },
  ];

  if (checking) {
    return (
      <div ref={ref} className="min-h-screen gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div ref={ref} className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="gradient-hero relative overflow-hidden flex-1 flex items-center justify-center px-4 py-16 min-h-[70vh]">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-10 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm mb-6">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
            قَبُول
          </h1>
          <p className="text-lg md:text-xl text-white/85 mb-8 leading-relaxed">
            قَبُول.. خطوتك الأولى نحو كليات القمة.
          </p>
          
          <Button
            size="lg"
            onClick={() => navigate("/login")}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-bold px-8 py-6 rounded-xl shadow-lg"
          >
            ابدأ الآن
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-background py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">
            كل ما تحتاجه للنجاح
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-card rounded-xl border p-6 text-center hover:shadow-md transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-6 px-4 text-center">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} قَبُول | Qubool - جميع الحقوق محفوظة
        </p>
      </footer>
    </div>
  );
});

Index.displayName = "Index";

export default Index;
