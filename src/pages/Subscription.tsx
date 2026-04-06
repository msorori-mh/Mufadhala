import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, CreditCard, Upload, CheckCircle, Clock,
  Building, ArrowLeftRight, ChevronRight, GraduationCap, Smartphone,
  Star, Sparkles, Tag, Timer
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const ZONE_A_GOVERNORATES = [
  "صنعاء", "أمانة العاصمة", "عمران", "ذمار", "إب", "الحديدة",
  "صعدة", "حجة", "المحويت", "ريمة", "تعز",
];

interface Plan {
  id: string; name: string; slug: string; description: string;
  features: string[]; price_zone_a: number; price_zone_b: number;
  price_default: number; currency: string; is_free: boolean;
  display_order: number; allowed_major_ids: string[] | null;
}

interface PaymentMethod {
  id: string; type: string; name: string;
  account_name: string | null; account_number: string | null;
  details: string | null;
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [subscription, setSubscription] = useState<SubRecord | null>(null);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [studentGovernorate, setStudentGovernorate] = useState<string | null>(null);
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
    const { error } = await supabase.from("subscriptions").insert({
      user_id: user.id, status: "active", plan_id: plan.id,
    });
    if (error) {
      toast({ variant: "destructive", title: error.message });
    } else {
      toast({ title: "تم تفعيل الخطة المجانية!" });
      setSubscription({ id: "", status: "active", plan_id: plan.id, starts_at: null, expires_at: null, trial_ends_at: null });
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
      toast({ variant: "destructive", title: "فشل رفع السند: " + uploadErr.message });
      setSubmitting(false);
      return;
    }

    const rawPrice = getPlanPrice(selectedPlan, studentGovernorate);
    const finalPrice = promoDiscount > 0 ? Math.round(rawPrice * (1 - promoDiscount / 100)) : rawPrice;

    const { data: newSub, error: subErr } = await supabase.from("subscriptions").insert({
      user_id: user.id, status: "pending", plan_id: selectedPlan.id,
    }).select().single();

    if (subErr) {
      toast({ variant: "destructive", title: subErr.message });
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
      toast({ variant: "destructive", title: prErr.message });
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

  const zoneName = studentGovernorate
    ? getZone(studentGovernorate) === "a" ? "المنطقة أ" : "المنطقة ب"
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
              <h2 className="text-lg font-bold text-green-700 dark:text-green-400">اشتراكك فعال</h2>
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

        {/* Plans selection */}
        {step === "plans" && !isActive && !isPending && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold">اختر خطة الاشتراك</h2>
              {zoneName && <p className="text-xs text-muted-foreground mt-1">{zoneName} — {studentGovernorate}</p>}
            </div>

            <div className="grid gap-3">
              {plans.map((plan) => {
                const price = getPlanPrice(plan, studentGovernorate);
                const isVip = plan.slug === "vip";
                return (
                  <Card
                    key={plan.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${isVip ? "border-primary ring-2 ring-primary/20" : "hover:border-primary"}`}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    <CardContent className="py-4 px-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-sm">{plan.name}</h3>
                            {isVip && <Badge className="bg-primary text-primary-foreground text-[10px]"><Sparkles className="w-3 h-3 ml-1" />الأفضل</Badge>}
                            {plan.is_free && <Badge variant="secondary" className="text-[10px]">مجاني</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(plan.features || []).map((f, i) => (
                              <span key={i} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Star className="w-3 h-3 text-primary" />{f}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-left shrink-0">
                          {plan.is_free ? (
                            <span className="text-lg font-bold text-green-600">مجاني</span>
                          ) : (
                            <div>
                              <span className="text-lg font-bold text-primary">{price.toLocaleString()}</span>
                              <span className="text-xs text-muted-foreground block">{plan.currency}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

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
        )}

        {/* Payment method selection */}
        {step === "method" && selectedPlan && (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => { setStep("plans"); setSelectedPlan(null); }} className="mb-1">
              <ChevronRight className="w-4 h-4 ml-1" /> العودة للخطط
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

            {["bank", "exchange", "ewallet"].map((type) => {
              const filtered = methods.filter((m) => m.type === type);
              if (filtered.length === 0) return null;
              const icon = type === "bank" ? <Building className="w-4 h-4" /> : type === "exchange" ? <ArrowLeftRight className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />;
              const label = type === "bank" ? "حسابات بنكية" : type === "exchange" ? "شركات صرافة" : "محافظ إلكترونية";
              return (
                <div key={type}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">{icon} {label}</h3>
                  {filtered.map((m) => (
                    <Card key={m.id} className="cursor-pointer hover:border-primary transition-colors mb-2" onClick={() => handleSelectMethod(m)}>
                      <CardContent className="py-3 px-4">
                        <p className="font-semibold text-sm">{m.name}</p>
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
                  {selectedMethod.account_number && (
                    <div><span className="text-muted-foreground">الحساب:</span> <span className="font-semibold">{selectedMethod.account_number}</span></div>
                  )}
                  {promoDiscount > 0 && <div className="text-green-600">خصم {promoDiscount}% مُطبّق</div>}
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
    </div>
  );
};

export default Subscription;
