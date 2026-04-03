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
import {
  Loader2, CreditCard, Upload, CheckCircle, Clock, XCircle,
  Building, ArrowLeftRight, ChevronRight, GraduationCap
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

interface Plan {
  id: string; name: string; description: string;
  duration_type: string; duration_months: number;
  price: number; currency: string;
}

interface PaymentMethod {
  id: string; type: string; name: string;
  account_name: string | null; account_number: string | null;
  details: string | null;
}

interface Subscription {
  id: string; plan_id: string | null; status: string;
  starts_at: string | null; expires_at: string | null;
}

interface PaymentRequest {
  id: string; status: string; amount: number;
  currency: string; created_at: string; admin_notes: string | null;
}

const Subscription = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Flow state
  const [step, setStep] = useState<"status" | "plan" | "method" | "upload">("status");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    const fetch = async () => {
      const [{ data: p }, { data: m }, { data: sub }, { data: pr }] = await Promise.all([
        supabase.from("subscription_plans").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("payment_methods").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
        supabase.from("payment_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      if (p) setPlans(p as Plan[]);
      if (m) setMethods(m as PaymentMethod[]);
      if (sub && sub.length > 0) setSubscription(sub[0] as Subscription);
      if (pr) setPaymentRequests(pr as PaymentRequest[]);

      // Determine initial step
      if (sub && sub.length > 0) {
        const s = sub[0] as Subscription;
        if (s.status === "active") setStep("status");
        else if (s.status === "pending") setStep("status");
        else setStep("plan");
      } else {
        setStep("plan");
      }
      setLoading(false);
    };
    fetch();
  }, [authLoading, user]);

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setStep("method");
  };

  const handleSelectMethod = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setStep("upload");
  };

  const handleSubmit = async () => {
    if (!user || !selectedPlan || !selectedMethod || !receiptFile) return;
    setSubmitting(true);

    // Upload receipt
    const ext = receiptFile.name.split(".").pop();
    const filePath = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("receipts").upload(filePath, receiptFile);
    if (uploadErr) {
      toast({ variant: "destructive", title: "فشل رفع السند: " + uploadErr.message });
      setSubmitting(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(filePath);
    const receiptUrl = urlData.publicUrl;

    // Create subscription
    const { data: newSub, error: subErr } = await supabase.from("subscriptions").insert({
      user_id: user.id, plan_id: selectedPlan.id, status: "pending",
    }).select().single();

    if (subErr) {
      toast({ variant: "destructive", title: subErr.message });
      setSubmitting(false);
      return;
    }

    // Create payment request
    const { error: prErr } = await supabase.from("payment_requests").insert({
      user_id: user.id,
      subscription_id: newSub.id,
      payment_method_id: selectedMethod.id,
      plan_id: selectedPlan.id,
      amount: selectedPlan.price,
      currency: selectedPlan.currency,
      receipt_url: receiptUrl,
      status: "pending",
    });

    if (prErr) {
      toast({ variant: "destructive", title: prErr.message });
    } else {
      toast({ title: "تم إرسال طلب الدفع بنجاح! سيتم مراجعته قريباً" });
      setSubscription(newSub as Subscription);
      setStep("status");
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

  const isActive = subscription?.status === "active";
  const isPending = subscription?.status === "pending";
  const hasPendingPayment = paymentRequests.some((pr) => pr.status === "pending");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-primary text-white px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            <span className="font-bold text-sm">الاشتراك</span>
          </div>
          <div className="flex gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="text-white hover:bg-white/20 hover:text-white">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">

        {/* Active Subscription Status */}
        {step === "status" && isActive && subscription && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
            <CardContent className="py-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-green-700 dark:text-green-400">اشتراكك فعال</h2>
              {subscription.expires_at && (
                <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                  ينتهي في: {new Date(subscription.expires_at).toLocaleDateString("ar")}
                </p>
              )}
              <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard")}>
                العودة للوحة التحكم
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pending Status */}
        {step === "status" && isPending && (
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900">
            <CardContent className="py-6 text-center">
              <Clock className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-yellow-700 dark:text-yellow-400">طلبك قيد المراجعة</h2>
              <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">
                سيتم مراجعة طلب الدفع وتفعيل اشتراكك في أقرب وقت
              </p>
            </CardContent>
          </Card>
        )}

        {/* Plan Selection */}
        {step === "plan" && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold">اختر خطة الاشتراك</h2>
            <p className="text-sm text-muted-foreground">اختر الخطة المناسبة لك للوصول إلى جميع المحتويات التعليمية</p>
            {plans.map((plan) => (
              <Card key={plan.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => handleSelectPlan(plan)}>
                <CardContent className="py-4 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold">{plan.name}</p>
                      {plan.description && <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{plan.duration_months} شهر</p>
                    </div>
                    <div className="text-left">
                      <p className="text-lg font-bold text-primary">{plan.price.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{plan.currency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {plans.length === 0 && (
              <p className="text-center text-muted-foreground py-8">لا توجد خطط اشتراك متاحة حالياً</p>
            )}
          </div>
        )}

        {/* Payment Method Selection */}
        {step === "method" && selectedPlan && (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => setStep("plan")} className="mb-2">
              <ChevronRight className="w-4 h-4 ml-1" /> العودة
            </Button>
            <div className="bg-muted rounded-lg p-3 text-sm">
              <span className="text-muted-foreground">الخطة:</span>{" "}
              <span className="font-semibold">{selectedPlan.name}</span> — {selectedPlan.price.toLocaleString()} {selectedPlan.currency}
            </div>
            <h2 className="text-lg font-bold">اختر طريقة الدفع</h2>
            <p className="text-sm text-muted-foreground">قم بالتحويل إلى أحد الحسابات التالية ثم ارفع سند التحويل</p>

            {methods.filter((m) => m.type === "bank").length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Building className="w-4 h-4" /> حسابات بنكية</h3>
                {methods.filter((m) => m.type === "bank").map((m) => (
                  <Card key={m.id} className="cursor-pointer hover:border-primary transition-colors mb-2" onClick={() => handleSelectMethod(m)}>
                    <CardContent className="py-3 px-4">
                      <p className="font-semibold text-sm">{m.name}</p>
                      {m.account_name && <p className="text-xs text-muted-foreground">باسم: {m.account_name}</p>}
                      {m.account_number && <p className="text-xs text-muted-foreground">رقم الحساب: {m.account_number}</p>}
                      {m.details && <p className="text-xs text-muted-foreground">{m.details}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {methods.filter((m) => m.type === "exchange").length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1"><ArrowLeftRight className="w-4 h-4" /> شركات صرافة</h3>
                {methods.filter((m) => m.type === "exchange").map((m) => (
                  <Card key={m.id} className="cursor-pointer hover:border-primary transition-colors mb-2" onClick={() => handleSelectMethod(m)}>
                    <CardContent className="py-3 px-4">
                      <p className="font-semibold text-sm">{m.name}</p>
                      {m.account_number && <p className="text-xs text-muted-foreground">رقم الهاتف: {m.account_number}</p>}
                      {m.details && <p className="text-xs text-muted-foreground">{m.details}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upload Receipt */}
        {step === "upload" && selectedPlan && selectedMethod && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setStep("method")} className="mb-2">
              <ChevronRight className="w-4 h-4 ml-1" /> العودة
            </Button>

            <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
              <div><span className="text-muted-foreground">الخطة:</span> <span className="font-semibold">{selectedPlan.name}</span></div>
              <div><span className="text-muted-foreground">المبلغ:</span> <span className="font-semibold">{selectedPlan.price.toLocaleString()} {selectedPlan.currency}</span></div>
              <div><span className="text-muted-foreground">طريقة الدفع:</span> <span className="font-semibold">{selectedMethod.name}</span></div>
              {selectedMethod.account_number && (
                <div><span className="text-muted-foreground">الحساب:</span> <span className="font-semibold">{selectedMethod.account_number}</span></div>
              )}
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">رفع سند التحويل</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    قم بتحويل المبلغ إلى الحساب المحدد أعلاه، ثم ارفع صورة سند التحويل هنا
                  </p>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <Label htmlFor="receipt" className="cursor-pointer text-primary text-sm font-medium">
                      {receiptFile ? receiptFile.name : "اضغط لاختيار الصورة"}
                    </Label>
                    <Input
                      id="receipt"
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    />
                    {receiptFile && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {(receiptFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={handleSubmit}
                    disabled={!receiptFile || submitting}
                    className="w-full"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري الإرسال...</>
                    ) : (
                      <><CreditCard className="w-4 h-4 ml-1" /> إرسال طلب الدفع</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Payment History */}
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
                    <Badge variant={
                      pr.status === "approved" ? "default" :
                      pr.status === "rejected" ? "destructive" : "outline"
                    }>
                      {pr.status === "approved" ? "مقبول" : pr.status === "rejected" ? "مرفوض" : "معلق"}
                    </Badge>
                  </div>
                  {pr.admin_notes && pr.status === "rejected" && (
                    <p className="text-xs text-destructive mt-1">السبب: {pr.admin_notes}</p>
                  )}
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
