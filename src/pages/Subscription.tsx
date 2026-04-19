import { useEffect, useState, useRef } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, CreditCard, Upload, CheckCircle, Clock,
  Building, ArrowLeftRight, ChevronRight, GraduationCap, Smartphone, Globe, Banknote, Monitor,
  Star, Sparkles, Tag, Timer, Info, ChevronDown, ZoomIn, Download, Copy, Check,
  Crown, Zap, Brain, BarChart3, BookOpen, ClipboardCheck, Lock, Bot, AlertTriangle
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

import { getZone, getPlanPrice, getZoneFromUniversity, getPlanPriceByZone, PriceZone } from "@/domain/pricing";
import { trackFunnelEvent } from "@/lib/funnelTracking";
import { isPaymentUIEnabled } from "@/lib/platformGate";

interface Plan {
  id: string; name: string; slug: string; description: string;
  features: string[]; price_zone_a: number; price_zone_b: number;
  price_default: number; currency: string; is_free: boolean;
  display_order: number; allowed_major_ids: string[] | null;
  discount_zone_a: number; discount_zone_b: number;
  default_price_zone_a: number; default_price_zone_b: number;
}

interface PaymentMethod {
  id: string; type: string; name: string;
  account_name: string | null; account_number: string | null;
  details: string | null; barcode_url: string | null;
  logo_url: string | null;
}

interface SubRecord {
  id: string; status: string; plan_id: string | null;
  starts_at: string | null; expires_at: string | null;
  trial_ends_at: string | null;
}

interface PaymentRequest {
  id: string; status: string; amount: number;
  currency: string; created_at: string; admin_notes: string | null;
}

const Subscription = () => {
  const { user, student: studentData, loading: accessLoading, canSubscribe } = useStudentAccess();
  const authLoading = accessLoading;
  const navigate = useNavigate();

  // Native APK guard — payment surfaces are web-only. Redirect immediately.
  useEffect(() => {
    if (!isPaymentUIEnabled()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [subscription, setSubscription] = useState<SubRecord | null>(null);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const studentGovernorate = studentData?.governorate ?? null;

  // University-based pricing zone (trusted source)
  const [universityPricingZone, setUniversityPricingZone] = useState<PriceZone>(null);
  const [universityName, setUniversityName] = useState<string | null>(null);

  const [step, setStep] = useState<"plans" | "method" | "upload">("plans");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoId, setPromoId] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [barcodeZoom, setBarcodeZoom] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      toast({ title: "تم النسخ", description: `تم نسخ ${field} بنجاح` });
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  useEffect(() => {
    if (authLoading || !user) return;
    const fetchAll = async () => {
      const [{ data: pl }, { data: m }, { data: sub }, { data: pr }] = await Promise.all([
        supabase.from("subscription_plans").select("*").eq("is_active", true).order("display_order"),
        supabase.from("payment_methods").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
        supabase.from("payment_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      if (pl) setPlans(pl as any as Plan[]);
      if (m) setMethods(m as any as PaymentMethod[]);
      if (sub && sub.length > 0) setSubscription(sub[0] as any as SubRecord);
      if (pr) setPaymentRequests(pr as any as PaymentRequest[]);
      setLoading(false);
    };
    fetchAll();
  }, [authLoading, user]);

  // Fetch university pricing zone (trusted source for pricing)
  useEffect(() => {
    if (!studentData?.university_id) return;
    supabase
      .from("universities")
      .select("pricing_zone, name_ar")
      .eq("id", studentData.university_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setUniversityPricingZone(getZoneFromUniversity((data as any).pricing_zone));
          setUniversityName(data.name_ar);
        }
      });
  }, [studentData?.university_id]);


  const prevSubStatusRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user || !subscription || subscription.status !== "pending") return;
    prevSubStatusRef.current = subscription.status;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const latest = data[0] as any as SubRecord;
        if (latest.status !== prevSubStatusRef.current) {
          setSubscription(latest);
          prevSubStatusRef.current = latest.status;

          if (latest.status === "active") {
            toast({ title: "🎉 تم قبول الدفع وتفعيل اشتراكك بنجاح!" });
          } else if (latest.status === "rejected") {
            toast({ variant: "destructive", title: "تم رفض طلب الدفع", description: "يرجى المحاولة مرة أخرى" });
          }

          // Also refresh payment requests
          const { data: pr } = await supabase
            .from("payment_requests")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
          if (pr) setPaymentRequests(pr as any as PaymentRequest[]);
        }
      }
    }, 20_000);

    return () => clearInterval(interval);
  }, [user, subscription?.status]);

  const isActive = subscription?.status === "active";
  const isPending = subscription?.status === "pending";
  const isTrial = subscription?.status === "trial" && subscription?.trial_ends_at && new Date(subscription.trial_ends_at) > new Date();

  const [showActivationSplash, setShowActivationSplash] = useState(false);

  const isTrialActive = Boolean(isTrial);
  useEffect(() => {
    if (isActive && !isTrialActive && !sessionStorage.getItem("subscription_splash_shown")) {
      setShowActivationSplash(true);
      const timer = setTimeout(() => {
        setShowActivationSplash(false);
        sessionStorage.setItem("subscription_splash_shown", "1");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isActive, isTrialActive]);

  const dismissSplash = () => {
    setShowActivationSplash(false);
    sessionStorage.setItem("subscription_splash_shown", "1");
  };

  const activePlanName = subscription?.plan_id
    ? plans.find((p) => p.id === subscription.plan_id)?.name ?? ""
    : "";

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    const { data } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("code", promoCode.trim().toUpperCase())
      .eq("is_active", true)
      .limit(1);

    if (data && data.length > 0) {
      const pc = data[0];
      if (pc.max_uses && pc.used_count >= pc.max_uses) {
        toast({ variant: "destructive", title: "كود الخصم استُنفد" });
      } else {
        setPromoDiscount(pc.discount_percent);
        setPromoId(pc.id);
        toast({ title: `تم تطبيق خصم ${pc.discount_percent}%` });
      }
    } else {
      toast({ variant: "destructive", title: "كود الخصم غير صالح" });
      setPromoDiscount(0);
      setPromoId(null);
    }
    setPromoLoading(false);
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    if (plan.is_free) {
      handleFreePlan(plan);
    } else {
      setStep("method");
    }
  };

  const handleFreePlan = async (plan: Plan) => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("activate-free-plan", {
        body: { plan_id: plan.id },
      });
      if (error) {
        toast({ variant: "destructive", title: "خطأ في الاشتراك", description: "فشل تفعيل الخطة المجانية. يرجى المحاولة لاحقاً." });
      } else if (data?.error) {
        const msg = data.error.includes("already have")
          ? "لديك اشتراك مفعّل بالفعل."
          : data.error.includes("not a free plan")
          ? "هذه الخطة ليست مجانية."
          : `فشل تفعيل الخطة: ${data.error}`;
        toast({ variant: "destructive", title: "خطأ في الاشتراك", description: msg });
      } else {
        toast({ title: "تم تفعيل الخطة المجانية!" });
        const sub = data?.subscription;
        setSubscription({
          id: sub?.id ?? "", status: "active", plan_id: plan.id,
          starts_at: sub?.starts_at ?? null, expires_at: sub?.expires_at ?? null,
          trial_ends_at: sub?.trial_ends_at ?? null,
        });
      }
    } catch {
      toast({ variant: "destructive", title: "خطأ في الاشتراك", description: "حدث خطأ غير متوقع." });
    }
    setSubmitting(false);
  };

  const handleSelectMethod = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setStep("upload");
  };

  const handleSubmit = async () => {
    if (!user || !selectedMethod || !receiptFile || !selectedPlan) return;
    setSubmitting(true);

    // Rate limit check: max 3 per day
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayRequests = paymentRequests.filter(
      (pr) => new Date(pr.created_at) >= todayStart
    );
    if (todayRequests.length >= 3) {
      toast({ variant: "destructive", title: "تجاوزت الحد اليومي", description: "الحد الأقصى 3 طلبات دفع يومياً. حاول غداً." });
      setSubmitting(false);
      return;
    }

    const { safeFileExtension, validateUploadFile, FILE_PRESETS } = await import("@/lib/storageKey");
    const v = validateUploadFile(receiptFile, FILE_PRESETS.receipt);
    if (!v.ok) {
      toast({ variant: "destructive", title: "ملف غير صالح", description: v.error });
      setSubmitting(false);
      return;
    }
    const ext = safeFileExtension(receiptFile.name);
    const filePath = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("receipts").upload(filePath, receiptFile, {
      contentType: receiptFile.type || undefined,
    });
    if (uploadErr) {
      const uploadMsg = uploadErr.message.includes("Payload too large")
        ? "حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت."
        : uploadErr.message.includes("mime")
        ? "نوع الملف غير مدعوم. يرجى رفع صورة (JPG, PNG) أو PDF."
        : uploadErr.message.includes("row-level security") || uploadErr.message.includes("security")
        ? "ليس لديك صلاحية رفع الملف. يرجى تسجيل الدخول مرة أخرى."
        : `فشل رفع السند: ${uploadErr.message}`;
      toast({ variant: "destructive", title: "خطأ في رفع السند", description: uploadMsg });
      setSubmitting(false);
      return;
    }

    // PRICING: Use university zone (trusted), NOT governorate
    const pricingZone = universityPricingZone;
    const rawPrice = getPlanPriceByZone(selectedPlan, pricingZone);
    const finalPrice = promoDiscount > 0 ? Math.round(rawPrice * (1 - promoDiscount / 100)) : rawPrice;

    const { data: newSub, error: subErr } = await supabase.from("subscriptions").insert({
      user_id: user.id, status: "pending", plan_id: selectedPlan.id,
    }).select().single();

    if (subErr) {
      const subMsg = subErr.message.includes("row-level security")
        ? "ليس لديك صلاحية إنشاء اشتراك. يرجى تسجيل الدخول مرة أخرى."
        : `فشل إنشاء الاشتراك: ${subErr.message}`;
      toast({ variant: "destructive", title: "خطأ في الاشتراك", description: subMsg });
      setSubmitting(false);
      return;
    }

    const paymentPayload: any = {
      user_id: user.id,
      subscription_id: newSub.id,
      payment_method_id: selectedMethod.id,
      amount: finalPrice,
      currency: selectedPlan.currency,
      receipt_url: filePath,
      status: "pending",
      // Pricing snapshot — immutable record for validation
      pricing_zone: pricingZone,
      expected_amount: finalPrice,
      pricing_source: "university",
      university_id: studentData?.university_id ?? null,
    };
    if (promoId) paymentPayload.promo_code_id = promoId;

    const { data: prData, error: prErr } = await supabase.from("payment_requests").insert(paymentPayload).select().single();

    if (prErr) {
      const prMsg = prErr.message.includes("row-level security")
        ? "ليس لديك صلاحية إرسال طلب الدفع. يرجى تسجيل الدخول مرة أخرى."
        : `فشل إرسال طلب الدفع: ${prErr.message}`;
      toast({ variant: "destructive", title: "خطأ في طلب الدفع", description: prMsg });
    } else {
      // Trigger fraud check in background (non-blocking)
      supabase.functions.invoke("check-receipt-fraud", {
        body: { receipt_path: filePath, payment_request_id: prData.id },
      }).then(({ data: fraudData }) => {
        if (fraudData?.fraud_status === "suspicious") {
          toast({
            variant: "destructive",
            title: "⚠️ تنبيه",
            description: "تم اكتشاف أن هذا السند قد يكون مستخدماً مسبقاً وسيتم مراجعته",
          });
        }
      }).catch(() => { /* non-critical */ });

      toast({ title: "✅ تم إرسال السند بنجاح", description: "طلبك قيد المراجعة — سيتم تفعيل اشتراكك في أقرب وقت" });
      setReceiptFile(null);
      if (receiptPreview) { URL.revokeObjectURL(receiptPreview); setReceiptPreview(null); }
      setSubscription({ id: newSub.id, status: "pending", plan_id: selectedPlan.id, starts_at: null, expires_at: null, trial_ends_at: null });
      setStep("plans");
    }
    setSubmitting(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showActivationSplash) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-600 to-green-800 dark:from-green-800 dark:to-green-950 flex items-center justify-center p-6" dir="rtl">
        <div className="text-center space-y-6 max-w-sm">
          <CheckCircle className="w-20 h-20 text-white mx-auto animate-bounce" />
          <h1 className="text-2xl font-bold text-white">تم قبول طلب الدفع وتفعيل اشتراكك!</h1>
          <div className="bg-white/15 backdrop-blur rounded-xl p-4 space-y-2">
            {activePlanName && (
              <p className="text-white text-lg font-semibold">الخطة: {activePlanName}</p>
            )}
            {subscription?.expires_at && (
              <p className="text-white/80 text-sm">ينتهي في: {new Date(subscription.expires_at).toLocaleDateString("ar")}</p>
            )}
          </div>
          <Button onClick={dismissSplash} className="bg-white text-green-700 hover:bg-white/90 font-bold px-8">
            متابعة
          </Button>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-primary text-white px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            <span className="font-bold text-sm">خطط الاشتراك</span>
          </div>
          <div className="flex gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-white hover:bg-white/20 hover:text-white">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 md:pb-4 space-y-4">
        {/* Active status */}
        {isActive && !isTrial && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
            <CardContent className="py-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-green-700 dark:text-green-400">تم قبول الدفع وتفعيل اشتراكك بنجاح</h2>
              {subscription?.expires_at && (
                <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                  ينتهي في: {new Date(subscription.expires_at).toLocaleDateString("ar")}
                </p>
              )}
              <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard")}>العودة للوحة التحكم</Button>
            </CardContent>
          </Card>
        )}

        {/* Pending status */}
        {isPending && (
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900">
            <CardContent className="py-6 text-center">
              <Clock className="w-12 h-12 text-yellow-600 mx-auto mb-3 animate-pulse" />
              <h2 className="text-lg font-bold text-yellow-700 dark:text-yellow-400">طلبك قيد المراجعة</h2>
              <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">سيتم مراجعة طلب الدفع وتفعيل اشتراكك في أقرب وقت</p>
              <p className="text-xs text-yellow-500 dark:text-yellow-600 mt-3 flex items-center justify-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                يتم التحقق تلقائياً كل 20 ثانية
              </p>
            </CardContent>
          </Card>
        )}

        {/* Multi-tier pricing */}
        {step === "plans" && !isActive && !isPending && (() => {
          if (plans.length === 0) return <p className="text-center text-muted-foreground py-8">لا توجد خطط اشتراك متاحة حالياً</p>;
          
          if (!studentData?.university_id || !universityPricingZone) {
            return (
              <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900">
                <CardContent className="py-6 text-center space-y-3">
                  <GraduationCap className="w-10 h-10 text-yellow-600 mx-auto" />
                  <h2 className="text-lg font-bold text-yellow-700 dark:text-yellow-400">يرجى اختيار جامعتك أولاً</h2>
                  <p className="text-sm text-yellow-600 dark:text-yellow-500">نحتاج لمعرفة جامعتك لتحديد سعر الاشتراك المناسب</p>
                  <Button onClick={() => navigate("/profile")} className="mt-2">إكمال البيانات الشخصية</Button>
                </CardContent>
              </Card>
            );
          }

          // Determine popular plan (slug-based or middle plan by display_order)
          const paidPlans = plans.filter(p => !p.is_free);
          const popularSlug = "preparation";
          const popularPlan = paidPlans.find(p => p.slug === popularSlug) || (paidPlans.length >= 2 ? paidPlans[Math.floor(paidPlans.length / 2)] : paidPlans[0]);


          // Hero plan = popular paid plan (or first available)
          const heroPlan = popularPlan || plans[0];
          const otherPlans = plans.filter((p) => p.id !== heroPlan?.id);
          const heroPrice = heroPlan ? getPlanPriceByZone(heroPlan, universityPricingZone) : 0;
          const heroFinalPrice = promoDiscount > 0 ? Math.round(heroPrice * (1 - promoDiscount / 100)) : heroPrice;
          const heroZone = universityPricingZone;
          const heroZoneDiscount = heroPlan
            ? heroZone === "a" ? heroPlan.discount_zone_a : heroZone === "b" ? heroPlan.discount_zone_b : 0
            : 0;
          const heroOriginalPrice = heroPlan
            ? heroZone === "a" ? heroPlan.default_price_zone_a : heroPlan.default_price_zone_b
            : 0;
          const showHeroOriginal = heroPlan && !heroPlan.is_free && (heroZoneDiscount > 0 || promoDiscount > 0);

          return (
            <div className="space-y-6">
              {/* 1+2. Title & Subtitle */}
              <div className="text-center space-y-2 pt-2">
                <h1 className="text-2xl font-extrabold text-foreground leading-tight">
                  استعد للمفاضلة بثقة 🚀
                </h1>
                <p className="text-sm text-muted-foreground">
                  كل أدوات التدريب + الذكاء الاصطناعي في مكان واحد
                </p>
              </div>

              {/* Main subscription card: features + price + CTA */}
              {heroPlan && (
                <Card className="border-primary/30 shadow-md overflow-hidden">
                  <CardContent className="p-5 space-y-5">
                    {/* 3. Features grouped into 2 sections */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          📚 <span>التدريب الحقيقي</span>
                        </h3>
                        <ul className="space-y-1.5">
                          {[
                            "الوصول الكامل لجميع نماذج الأعوام السابقة في جميع الجامعات",
                            "وصول غير محدود للتدرب على محاكي الاختبار الحقيقي",
                            "التركيز أثناء التدريب على الأسئلة الأكثر تكراراً والأقرب لاختبارات القبول",
                          ].map((t, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-foreground/90 leading-relaxed">
                              <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                              <span>{t}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          🤖 <span>الذكاء الاصطناعي</span>
                        </h3>
                        <ul className="space-y-1.5">
                          {[
                            "وصول غير محدود لاستخدام مولد الأسئلة الذكي",
                            "استخدام غير محدود لمساعد مفاضلة الذكي (مفاضل)",
                            "الاستفادة الكاملة من قوة الذكاء الاصطناعي داخل التطبيق",
                          ].map((t, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-foreground/90 leading-relaxed">
                              <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                              <span>{t}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* 4. Value statement */}
                    <p className="text-center text-sm font-semibold text-foreground border-t border-border pt-4">
                      كل ما تحتاجه لتدخل المفاضلة وأنت جاهز 100%
                    </p>

                    {/* 5. Price section */}
                    {!heroPlan.is_free && (
                      <div className="text-center space-y-1.5">
                        {showHeroOriginal && (
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-sm text-muted-foreground line-through">
                              {(promoDiscount > 0 ? heroPrice : heroOriginalPrice).toLocaleString()} {heroPlan.currency}
                            </span>
                            {heroZoneDiscount > 0 && (
                              <Badge variant="outline" className="text-[10px] border-green-500 text-green-600 py-0 h-4">
                                خصم {heroZoneDiscount}%
                              </Badge>
                            )}
                          </div>
                        )}
                        <div className="flex items-baseline justify-center gap-2">
                          <span className="text-4xl font-black text-primary">
                            {heroFinalPrice.toLocaleString()}
                          </span>
                          <span className="text-sm font-semibold text-muted-foreground">{heroPlan.currency}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">وصول كامل وغير محدود</p>
                      </div>
                    )}

                    {/* 6. Single primary CTA */}
                    <Button
                      size="lg"
                      className="w-full h-14 text-base font-bold"
                      onClick={() => {
                        trackFunnelEvent("subscribe_clicked", { plan: heroPlan.slug });
                        handleSelectPlan(heroPlan);
                      }}
                    >
                      {heroPlan.is_free ? "تفعيل الخطة" : "اشترك الآن"}
                    </Button>

                    {/* 7. Trust line */}
                    <p className="text-center text-xs text-muted-foreground">
                      🔒 دفع آمن — تفعيل فوري
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Other plans (compact, optional) */}
              {otherPlans.length > 0 && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground">
                      <span>عرض الخطط الأخرى</span>
                      <ChevronDown className="w-4 h-4 transition-transform [[data-state=open]_&]:rotate-180" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 mt-2">
                    {otherPlans.map((plan) => {
                      const price = getPlanPriceByZone(plan, universityPricingZone);
                      const finalPrice = promoDiscount > 0 ? Math.round(price * (1 - promoDiscount / 100)) : price;
                      return (
                        <Card key={plan.id} className="border-border">
                          <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-foreground truncate">{plan.name}</p>
                              {!plan.is_free ? (
                                <p className="text-xs text-muted-foreground">
                                  {finalPrice.toLocaleString()} {plan.currency}
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground">مجاني</p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0"
                              onClick={() => {
                                trackFunnelEvent("subscribe_clicked", { plan: plan.slug });
                                handleSelectPlan(plan);
                              }}
                            >
                              {plan.is_free ? "تفعيل" : "اختيار"}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* 8. Payment methods preview */}
              {methods.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground text-center">طرق الدفع المتاحة</h3>
                  <Card className="border-border">
                    <CardContent className="py-3 px-4">
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        {methods.slice(0, 8).map((m) => (
                          <div key={m.id} className="flex items-center gap-1.5" title={m.name}>
                            {m.logo_url ? (
                              <img src={m.logo_url} alt={m.name} className="w-7 h-7 rounded object-contain border bg-background p-0.5" />
                            ) : (
                              <div className="w-7 h-7 rounded bg-muted flex items-center justify-center">
                                <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                              </div>
                            )}
                            <span className="text-[11px] text-muted-foreground">{m.name}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* 9. Coupon section */}
              <Card className="border-border">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input
                      placeholder="كود الخصم"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      className="text-sm h-9"
                    />
                    <Button size="sm" variant="outline" onClick={applyPromo} disabled={promoLoading || !promoCode.trim()} className="shrink-0 h-9">
                      {promoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "تطبيق"}
                    </Button>
                  </div>
                  {promoDiscount > 0 && (
                    <p className="text-xs text-green-600 mt-2 mr-6">خصم {promoDiscount}% مُطبّق ✓</p>
                  )}
                </CardContent>
              </Card>

              {universityName && (
                <p className="text-center text-[11px] text-muted-foreground">{universityName}</p>
              )}
            </div>
          );
        })()}

        {/* Payment method selection */}
        {step === "method" && selectedPlan && (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => { setStep("plans"); setSelectedPlan(null); }} className="mb-1">
              <ChevronRight className="w-4 h-4 ml-1" /> العودة
            </Button>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-3 text-center">
                <p className="text-sm font-semibold">{selectedPlan.name}</p>
                {(() => {
                  const raw = getPlanPriceByZone(selectedPlan, universityPricingZone);
                  const final_ = promoDiscount > 0 ? Math.round(raw * (1 - promoDiscount / 100)) : raw;
                  return (
                    <div className="mt-1">
                      {promoDiscount > 0 && <span className="text-sm text-muted-foreground line-through ml-2">{raw.toLocaleString()}</span>}
                      <span className="text-xl font-bold text-primary">{final_.toLocaleString()} {selectedPlan.currency}</span>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            <h2 className="text-lg font-bold">اختر طريقة الدفع</h2>
            <p className="text-sm text-muted-foreground">قم بالتحويل إلى أحد الحسابات التالية ثم ارفع سند التحويل</p>

            {["bank", "exchange", "ewallet", "network_transfer", "kuraimi_transfer", "hasib_point"].map((type) => {
              const filtered = methods.filter((m) => m.type === type);
              if (filtered.length === 0) return null;
              const icon = type === "bank" ? <Building className="w-4 h-4" /> : type === "exchange" ? <ArrowLeftRight className="w-4 h-4" /> : type === "network_transfer" ? <Globe className="w-4 h-4" /> : type === "kuraimi_transfer" ? <Banknote className="w-4 h-4" /> : type === "hasib_point" ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />;
              const label = type === "bank" ? "حسابات بنكية" : type === "exchange" ? "شركات صرافة" : type === "network_transfer" ? "تحويل عبر الشبكة الموحدة" : type === "kuraimi_transfer" ? "تحويل عبر الكريمي" : type === "hasib_point" ? "نقطة حاسب" : "محافظ إلكترونية";
              return (
                <div key={type}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">{icon} {label}</h3>
                  {filtered.map((m) => (
                    <Card key={m.id} className="cursor-pointer hover:border-primary hover:shadow-md transition-all mb-2" onClick={() => handleSelectMethod(m)}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            {m.logo_url && <img src={m.logo_url} alt={m.name} className="w-8 h-8 rounded-lg object-contain border bg-background p-0.5" />}
                            <div>
                              <p className="font-bold text-sm text-foreground">{m.name}</p>
                              {m.account_number && (
                                <p className="text-xs text-muted-foreground mt-0.5 font-mono" dir="ltr">{m.account_number}</p>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground rotate-180" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })}
            {methods.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد طرق دفع متاحة حالياً</p>}
          </div>
        )}

        {/* Upload receipt */}
        {step === "upload" && selectedPlan && selectedMethod && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setStep("method")} className="mb-2">
              <ChevronRight className="w-4 h-4 ml-1" /> العودة
            </Button>
            {(() => {
              const raw = getPlanPriceByZone(selectedPlan, universityPricingZone);
              const final_ = promoDiscount > 0 ? Math.round(raw * (1 - promoDiscount / 100)) : raw;
              return (
                <div className="space-y-3">
                  {/* Plan & amount summary */}
                  <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                    <div><span className="text-muted-foreground">الخطة:</span> <span className="font-semibold">{selectedPlan.name}</span></div>
                    <div><span className="text-muted-foreground">المبلغ:</span> <span className="font-semibold text-primary">{final_.toLocaleString()} {selectedPlan.currency}</span></div>
                    {promoDiscount > 0 && <div className="text-green-600 text-xs">خصم {promoDiscount}% مُطبّق ✓</div>}
                  </div>

                  {/* Transfer details card — emphasized */}
                  <Card className="border-primary/30 bg-primary/5 shadow-sm">
                    <CardContent className="py-4 px-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-sm text-foreground">بيانات التحويل</h3>
                        {selectedMethod.logo_url && <img src={selectedMethod.logo_url} alt={selectedMethod.name} className="w-6 h-6 rounded object-contain mr-auto" />}
                      </div>

                      <div className="bg-background rounded-lg border p-3 space-y-2.5">
                        {/* Payment method name */}
                        <div className="text-xs text-muted-foreground">{selectedMethod.name}</div>

                        {/* Account number — large and copyable */}
                        {selectedMethod.account_number && (
                          <div>
                            <p className="text-[11px] text-muted-foreground mb-1">رقم الحساب:</p>
                            <div
                              className="flex items-center justify-between bg-muted/60 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-muted transition-colors group"
                              onClick={() => copyToClipboard(selectedMethod.account_number!, "رقم الحساب")}
                            >
                              <span className="font-bold text-base text-foreground font-mono tracking-wide" dir="ltr">{selectedMethod.account_number}</span>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 shrink-0">
                                {copiedField === "رقم الحساب" ? (
                                  <><Check className="w-3.5 h-3.5 text-green-500" /> <span className="text-green-600">تم النسخ</span></>
                                ) : (
                                  <><Copy className="w-3.5 h-3.5" /> نسخ</>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Account holder name — copyable */}
                        {selectedMethod.account_name && (
                          <div>
                            <p className="text-[11px] text-muted-foreground mb-1">اسم صاحب الحساب:</p>
                            <div
                              className="flex items-center justify-between bg-muted/60 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted transition-colors group"
                              onClick={() => copyToClipboard(selectedMethod.account_name!, "اسم الحساب")}
                            >
                              <span className="font-semibold text-sm text-foreground">{selectedMethod.account_name}</span>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 shrink-0">
                                {copiedField === "اسم الحساب" ? (
                                  <><Check className="w-3.5 h-3.5 text-green-500" /> <span className="text-green-600">تم</span></>
                                ) : (
                                  <><Copy className="w-3.5 h-3.5" /> نسخ</>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Extra details */}
                        {selectedMethod.details && (
                          <p className="text-xs text-muted-foreground border-t pt-2">{selectedMethod.details}</p>
                        )}
                      </div>

                      {/* Helper text */}
                      <p className="text-[11px] text-muted-foreground text-center">يرجى تحويل المبلغ إلى رقم الحساب الموضح أعلاه ثم رفع سند التحويل</p>
                    </CardContent>
                  </Card>

                  {/* Barcode section */}
                  {selectedMethod.barcode_url && (
                    <Card className="border-border">
                      <CardContent className="py-4 text-center space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">أو امسح الباركود للتحويل مباشرة</p>
                        <img
                          src={selectedMethod.barcode_url}
                          alt="باركود الدفع"
                          className="mx-auto max-w-[200px] rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setBarcodeZoom(selectedMethod.barcode_url)}
                        />
                        <div className="flex justify-center gap-2 mt-2">
                          <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setBarcodeZoom(selectedMethod.barcode_url)}>
                            <ZoomIn className="w-3.5 h-3.5" /> تكبير
                          </Button>
                          <Button variant="outline" size="sm" className="text-xs gap-1" onClick={async () => {
                            try {
                              const res = await fetch(selectedMethod.barcode_url!);
                              const blob = await res.blob();
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url; a.download = `barcode-${selectedMethod.name}.jpg`;
                              document.body.appendChild(a); a.click(); document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            } catch { window.open(selectedMethod.barcode_url!, "_blank"); }
                          }}>
                            <Download className="w-3.5 h-3.5" /> تحميل
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* CTA: scroll to upload */}
                  <div className="text-center space-y-2 pt-1">
                    <p className="text-xs text-muted-foreground">بعد إتمام التحويل، انتقل لرفع السند</p>
                    <Button
                      className="w-full sm:w-auto px-8 h-12 text-base font-bold gap-2"
                      onClick={() => {
                        const el = document.getElementById("receipt-upload-section");
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                    >
                      <Upload className="w-5 h-5" />
                      تم التحويل، ارفع السند
                    </Button>
                  </div>
                </div>
              );
            })()}
            <Card id="receipt-upload-section">
              <CardHeader className="pb-2"><CardTitle className="text-base">رفع سند التحويل</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>⚠️ تنبيه: سيتم رفض أي سند مكرر أو مستخدم من قبل أكثر من حساب. النظام يتحقق تلقائياً.</span>
                  </div>

                  {!receiptFile ? (
                    <>
                      <p className="text-sm text-muted-foreground">ارفع صورة واضحة لسند التحويل ليتم مراجعتها</p>
                      <div
                        className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                        onClick={() => document.getElementById("receipt")?.click()}
                      >
                        <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-primary text-sm font-medium">اضغط لاختيار صورة السند</p>
                        <p className="text-xs text-muted-foreground mt-1">JPG, PNG أو PDF — حد أقصى 5 ميجابايت</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm text-green-700 dark:text-green-400">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        <span>تم اختيار السند بنجاح</span>
                      </div>

                      {/* Image preview */}
                      {receiptPreview && (
                        <div className="relative border rounded-lg overflow-hidden bg-muted">
                          <img
                            src={receiptPreview}
                            alt="معاينة السند"
                            className="w-full max-h-[200px] sm:max-h-[240px] object-contain"
                          />
                        </div>
                      )}

                      {/* File info */}
                      <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <CreditCard className="w-4 h-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{receiptFile.name}</p>
                            <p className="text-xs text-muted-foreground">{(receiptFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive shrink-0"
                          onClick={() => {
                            setReceiptFile(null);
                            setReceiptPreview(null);
                            const input = document.getElementById("receipt") as HTMLInputElement;
                            if (input) input.value = "";
                          }}
                        >
                          تغيير الصورة
                        </Button>
                      </div>
                    </>
                  )}

                  <Input
                    id="receipt"
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setReceiptFile(file);
                      if (file && file.type.startsWith("image/")) {
                        const url = URL.createObjectURL(file);
                        setReceiptPreview(url);
                      } else {
                        setReceiptPreview(null);
                      }
                    }}
                  />

                  <p className="text-xs text-muted-foreground text-center">سيتم مراجعة السند خلال وقت قصير بعد الإرسال</p>

                  {!receiptFile && (
                    <p className="text-xs text-center text-destructive">يرجى اختيار صورة السند أولاً</p>
                  )}

                  <Button onClick={handleSubmit} disabled={!receiptFile || submitting} className="w-full">
                    {submitting ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري رفع السند...</> : <><CreditCard className="w-4 h-4 ml-1" /> إرسال طلب الدفع</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Payment history */}
        {paymentRequests.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">سجل الطلبات</h3>
            {paymentRequests.map((pr) => (
              <Card key={pr.id}>
                <CardContent className="py-2 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{pr.amount.toLocaleString()} {pr.currency}</p>
                      <p className="text-xs text-muted-foreground">{new Date(pr.created_at).toLocaleDateString("ar")}</p>
                    </div>
                    <Badge variant={pr.status === "approved" ? "default" : pr.status === "rejected" ? "destructive" : "outline"}>
                      {pr.status === "approved" ? "مقبول" : pr.status === "rejected" ? "مرفوض" : "معلق"}
                    </Badge>
                  </div>
                  {pr.admin_notes && pr.status === "rejected" && <p className="text-xs text-destructive mt-1">السبب: {pr.admin_notes}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Barcode Zoom Overlay */}
      {barcodeZoom && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setBarcodeZoom(null)}
        >
          <img
            src={barcodeZoom}
            alt="باركود الدفع"
            className="max-w-full max-h-[85vh] rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default Subscription;
