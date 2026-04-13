import { useEffect, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStudentData } from "@/hooks/useStudentData";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, CreditCard, Upload, CheckCircle, Clock,
  Building, ArrowLeftRight, ChevronRight, GraduationCap, Smartphone, Globe,
  Star, Sparkles, Tag, Timer, Info, ChevronDown, ZoomIn, Download, Copy, Check
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const ZONE_A_GOVERNORATES = [
  "صنعاء", "أمانة العاصمة", "عمران", "ذمار", "إب", "الحديدة",
  "صعدة", "حجة", "المحويت", "ريمة",
];

const ZONE_B_GOVERNORATES = [
  "عدن", "تعز", "لحج", "أبين", "الضالع", "شبوة",
  "حضرموت", "المهرة", "مأرب", "الجوف", "البيضاء", "سقطرى",
];

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

const getZone = (gov: string | null): "a" | "b" | null => {
  if (!gov) return null;
  return ZONE_A_GOVERNORATES.some((g) => gov.includes(g)) ? "a" : "b";
};

const getPlanPrice = (plan: Plan, gov: string | null): number => {
  const zone = getZone(gov);
  if (zone === "a") return plan.price_zone_a;
  if (zone === "b") return plan.price_zone_b;
  return plan.price_default;
};

const Subscription = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: studentData, isLoading: studentLoading } = useStudentData(user?.id);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [subscription, setSubscription] = useState<SubRecord | null>(null);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<"plans" | "method" | "upload">("plans");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

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
      const [{ data: pl }, { data: m }, { data: sub }, { data: pr }, { data: student }] = await Promise.all([
        supabase.from("subscription_plans").select("*").eq("is_active", true).order("display_order"),
        supabase.from("payment_methods").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
        supabase.from("payment_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("students").select("governorate").eq("user_id", user.id).limit(1),
      ]);
      if (pl) setPlans(pl as any as Plan[]);
      if (m) setMethods(m as any as PaymentMethod[]);
      if (sub && sub.length > 0) setSubscription(sub[0] as any as SubRecord);
      if (pr) setPaymentRequests(pr as any as PaymentRequest[]);
      if (student && student.length > 0) setStudentGovernorate(student[0].governorate);
      setLoading(false);
    };
    fetchAll();
  }, [authLoading, user]);

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

    const ext = receiptFile.name.split(".").pop();
    const filePath = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("receipts").upload(filePath, receiptFile);
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

    const rawPrice = getPlanPrice(selectedPlan, studentGovernorate);
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
    };
    if (promoId) paymentPayload.promo_code_id = promoId;

    const { error: prErr } = await supabase.from("payment_requests").insert(paymentPayload);

    if (prErr) {
      const prMsg = prErr.message.includes("row-level security")
        ? "ليس لديك صلاحية إرسال طلب الدفع. يرجى تسجيل الدخول مرة أخرى."
        : `فشل إرسال طلب الدفع: ${prErr.message}`;
      toast({ variant: "destructive", title: "خطأ في طلب الدفع", description: prMsg });
    } else {
      toast({ title: "تم إرسال طلب الدفع بنجاح!" });
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

  const zoneName = studentGovernorate
    ? getZone(studentGovernorate) === "a" ? "المنطقة ب" : "المنطقة أ"
    : null;

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

      <div className="max-w-2xl mx-auto p-4 pb-20 md:pb-4 space-y-4">
        {/* Trial Banner */}
        {isTrial && subscription?.trial_ends_at && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
            <CardContent className="py-3 text-center">
              <div className="flex items-center justify-center gap-2">
                <Timer className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">فترة تجريبية مجانية</span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                تنتهي في: {new Date(subscription.trial_ends_at).toLocaleString("ar")}
              </p>
            </CardContent>
          </Card>
        )}

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
              <Clock className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-yellow-700 dark:text-yellow-400">طلبك قيد المراجعة</h2>
              <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">سيتم مراجعة طلب الدفع وتفعيل اشتراكك في أقرب وقت</p>
            </CardContent>
          </Card>
        )}

        {/* Single plan subscription */}
        {step === "plans" && !isActive && !isPending && (() => {
          const plan = plans[0];
          if (!plan) return <p className="text-center text-muted-foreground py-8">لا توجد خطط اشتراك متاحة حالياً</p>;
          
          if (!studentGovernorate) {
            return (
              <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900">
                <CardContent className="py-6 text-center space-y-3">
                  <GraduationCap className="w-10 h-10 text-yellow-600 mx-auto" />
                  <h2 className="text-lg font-bold text-yellow-700 dark:text-yellow-400">يرجى إكمال بياناتك الشخصية أولاً</h2>
                  <p className="text-sm text-yellow-600 dark:text-yellow-500">نحتاج لمعرفة محافظتك لتحديد سعر الاشتراك المناسب</p>
                  <Button onClick={() => navigate("/profile")} className="mt-2">إكمال البيانات الشخصية</Button>
                </CardContent>
              </Card>
            );
          }

          const price = getPlanPrice(plan, studentGovernorate);
          const finalPrice = promoDiscount > 0 ? Math.round(price * (1 - promoDiscount / 100)) : price;

          return (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-bold">الاشتراك في المنصة</h2>
                {zoneName && <p className="text-xs text-muted-foreground mt-1">{zoneName} — {studentGovernorate}</p>}
              </div>

              <Card className="border-primary ring-2 ring-primary/20">
                <CardContent className="py-5 px-4">
                  <div className="text-center space-y-3">
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <div>
                      {(() => {
                        const zone = getZone(studentGovernorate);
                        const zoneDiscount = zone === "a" ? plan.discount_zone_a : zone === "b" ? plan.discount_zone_b : 0;
                        return (
                          <>
                            {zoneDiscount > 0 && (
                              <div className="mb-1">
                                <Badge variant="outline" className="text-xs border-green-500 text-green-600">خصم {zoneDiscount}% لمنطقتك</Badge>
                              </div>
                            )}
                            {(zoneDiscount > 0 || promoDiscount > 0) && (
                              <span className="text-sm text-muted-foreground line-through ml-2">
                                {promoDiscount > 0 ? price.toLocaleString() : (zone === "a" ? plan.default_price_zone_a : plan.default_price_zone_b).toLocaleString()}
                              </span>
                            )}
                          </>
                        );
                      })()}
                      <span className="text-2xl font-bold text-primary">{finalPrice.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground mr-1">{plan.currency}</span>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 mt-2">
                      {(plan.features || []).map((f, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="w-3 h-3 text-primary" />{f}
                        </span>
                      ))}
                    </div>
                    <Button className="w-full mt-3" onClick={() => handleSelectPlan(plan)}>
                      <Sparkles className="w-4 h-4 ml-1" /> اشترك الآن
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Zone info */}
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground">
                    <Info className="w-4 h-4" />
                    <span>تعرف على تسعيرة المناطق</span>
                    <ChevronDown className="w-4 h-4 transition-transform [[data-state=open]_&]:rotate-180" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Card className="mt-2">
                    <CardContent className="py-4 px-4 space-y-4">
                      <div className={`rounded-lg p-3 border ${getZone(studentGovernorate) === "a" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm">المنطقة ب</span>
                          <div className="flex items-center gap-2">
                            {plan.discount_zone_a > 0 && (
                              <Badge variant="outline" className="text-xs border-green-500 text-green-600">خصم {plan.discount_zone_a}%</Badge>
                            )}
                            <Badge variant={getZone(studentGovernorate) === "a" ? "default" : "secondary"}>
                              {plan.price_zone_a.toLocaleString()} ريال
                            </Badge>
                          </div>
                        </div>
                        {plan.discount_zone_a > 0 && (
                          <p className="text-[10px] text-muted-foreground mb-1">
                            السعر الأصلي: <span className="line-through">{plan.default_price_zone_a.toLocaleString()}</span> ريال
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {ZONE_A_GOVERNORATES.join(" · ")}
                        </p>
                        {getZone(studentGovernorate) === "a" && <p className="text-xs text-primary font-medium mt-1">← منطقتك</p>}
                      </div>
                      <div className={`rounded-lg p-3 border ${getZone(studentGovernorate) === "b" ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm">المنطقة أ</span>
                          <div className="flex items-center gap-2">
                            {plan.discount_zone_b > 0 && (
                              <Badge variant="outline" className="text-xs border-green-500 text-green-600">خصم {plan.discount_zone_b}%</Badge>
                            )}
                            <Badge variant={getZone(studentGovernorate) === "b" ? "default" : "secondary"}>
                              {plan.price_zone_b.toLocaleString()} ريال
                            </Badge>
                          </div>
                        </div>
                        {plan.discount_zone_b > 0 && (
                          <p className="text-[10px] text-muted-foreground mb-1">
                            السعر الأصلي: <span className="line-through">{plan.default_price_zone_b.toLocaleString()}</span> ريال
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {ZONE_B_GOVERNORATES.join(" · ")}
                        </p>
                        {getZone(studentGovernorate) === "b" && <p className="text-xs text-primary font-medium mt-1">← منطقتك</p>}
                      </div>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>

              {/* Promo code */}
              <Card>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input
                      placeholder="كود الخصم"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      className="text-sm h-8"
                    />
                    <Button size="sm" variant="outline" onClick={applyPromo} disabled={promoLoading || !promoCode.trim()} className="shrink-0 h-8">
                      {promoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "تطبيق"}
                    </Button>
                  </div>
                  {promoDiscount > 0 && (
                    <p className="text-xs text-green-600 mt-1 mr-6">خصم {promoDiscount}% مُطبّق ✓</p>
                  )}
                </CardContent>
              </Card>
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
                  const raw = getPlanPrice(selectedPlan, studentGovernorate);
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

            {["bank", "exchange", "ewallet", "network_transfer"].map((type) => {
              const filtered = methods.filter((m) => m.type === type);
              if (filtered.length === 0) return null;
              const icon = type === "bank" ? <Building className="w-4 h-4" /> : type === "exchange" ? <ArrowLeftRight className="w-4 h-4" /> : type === "network_transfer" ? <Globe className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />;
              const label = type === "bank" ? "حسابات بنكية" : type === "exchange" ? "شركات صرافة" : type === "network_transfer" ? "تحويل عبر الشبكة الموحدة" : "محافظ إلكترونية";
              return (
                <div key={type}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">{icon} {label}</h3>
                  {filtered.map((m) => (
                    <Card key={m.id} className="cursor-pointer hover:border-primary transition-colors mb-2" onClick={() => handleSelectMethod(m)}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {m.logo_url && <img src={m.logo_url} alt={m.name} className="w-6 h-6 rounded object-contain" />}
                          <p className="font-semibold text-sm">{m.name}</p>
                        </div>
                        {m.account_name && <p className="text-xs text-muted-foreground">باسم: {m.account_name}</p>}
                        {m.account_number && <p className="text-xs text-muted-foreground">رقم: {m.account_number}</p>}
                        {m.details && <p className="text-xs text-muted-foreground">{m.details}</p>}
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
              const raw = getPlanPrice(selectedPlan, studentGovernorate);
              const final_ = promoDiscount > 0 ? Math.round(raw * (1 - promoDiscount / 100)) : raw;
              return (
                <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                  <div><span className="text-muted-foreground">الخطة:</span> <span className="font-semibold">{selectedPlan.name}</span></div>
                  <div><span className="text-muted-foreground">المبلغ:</span> <span className="font-semibold">{final_.toLocaleString()} {selectedPlan.currency}</span></div>
                  <div><span className="text-muted-foreground">طريقة الدفع:</span> <span className="font-semibold">{selectedMethod.name}</span></div>
                  {selectedMethod.account_name && (
                    <div
                      className="flex items-center gap-1 cursor-pointer group"
                      onClick={() => copyToClipboard(selectedMethod.account_name!, "اسم الحساب")}
                    >
                      <span className="text-muted-foreground">باسم:</span>
                      <span className="font-semibold">{selectedMethod.account_name}</span>
                      {copiedField === "اسم الحساب" ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  )}
                  {selectedMethod.account_number && (
                    <div
                      className="flex items-center gap-1 cursor-pointer group"
                      onClick={() => copyToClipboard(selectedMethod.account_number!, "رقم الحساب")}
                    >
                      <span className="text-muted-foreground">الحساب:</span>
                      <span className="font-semibold">{selectedMethod.account_number}</span>
                      {copiedField === "رقم الحساب" ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  )}
                  {promoDiscount > 0 && <div className="text-green-600">خصم {promoDiscount}% مُطبّق</div>}
                  {selectedMethod.barcode_url && (
                    <div className="mt-3 text-center">
                      <p className="text-sm font-medium text-muted-foreground mb-2">امسح الباركود للتحويل مباشرة</p>
                      <img
                        src={selectedMethod.barcode_url}
                        alt="باركود الدفع"
                        className="mx-auto max-w-[200px] rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setBarcodeZoom(selectedMethod.barcode_url)}
                      />
                      <div className="flex justify-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1"
                          onClick={() => setBarcodeZoom(selectedMethod.barcode_url)}
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                          تكبير
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1"
                          onClick={async () => {
                            try {
                              const res = await fetch(selectedMethod.barcode_url!);
                              const blob = await res.blob();
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `barcode-${selectedMethod.name}.jpg`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            } catch {
                              window.open(selectedMethod.barcode_url!, "_blank");
                            }
                          }}
                        >
                          <Download className="w-3.5 h-3.5" />
                          تحميل
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">رفع سند التحويل</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">قم بتحويل المبلغ إلى الحساب المحدد أعلاه، ثم ارفع صورة سند التحويل هنا</p>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <Label htmlFor="receipt" className="cursor-pointer text-primary text-sm font-medium">
                      {receiptFile ? receiptFile.name : "اضغط لاختيار الصورة"}
                    </Label>
                    <Input id="receipt" type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} />
                    {receiptFile && <p className="text-xs text-muted-foreground mt-1">{(receiptFile.size / 1024 / 1024).toFixed(2)} MB</p>}
                  </div>
                  <Button onClick={handleSubmit} disabled={!receiptFile || submitting} className="w-full">
                    {submitting ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري الإرسال...</> : <><CreditCard className="w-4 h-4 ml-1" /> إرسال طلب الدفع</>}
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
