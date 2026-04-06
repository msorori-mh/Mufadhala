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
  Building, ArrowLeftRight, ChevronRight, GraduationCap, Smartphone
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

// Zone A governorates (Ansar Allah areas)
const ZONE_A_GOVERNORATES = [
  "صنعاء", "أمانة العاصمة", "عمران", "ذمار", "إب", "الحديدة",
  "صعدة", "حجة", "المحويت", "ريمة", "تعز",
];

interface FullSettings {
  price: number; price_zone_a: number; price_zone_b: number;
  currency: string; description: string | null;
}

interface PaymentMethod {
  id: string; type: string; name: string;
  account_name: string | null; account_number: string | null;
  details: string | null;
}

interface SubRecord {
  id: string; status: string;
  starts_at: string | null; expires_at: string | null;
}

interface PaymentRequest {
  id: string; status: string; amount: number;
  currency: string; created_at: string; admin_notes: string | null;
}

const getStudentPrice = (settings: FullSettings, governorate: string | null): number => {
  if (!governorate) return settings.price;
  if (ZONE_A_GOVERNORATES.some((g) => governorate.includes(g))) return settings.price_zone_a;
  return settings.price_zone_b;
};

const Subscription = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [settings, setSettings] = useState<FullSettings | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [subscription, setSubscription] = useState<SubRecord | null>(null);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [studentGovernorate, setStudentGovernorate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<"status" | "method" | "upload">("status");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    const fetchAll = async () => {
      const [{ data: st }, { data: m }, { data: sub }, { data: pr }, { data: student }] = await Promise.all([
        supabase.from("subscription_settings" as any).select("*").limit(1),
        supabase.from("payment_methods").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
        supabase.from("payment_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("students").select("governorate").eq("user_id", user.id).limit(1),
      ]);
      if (st && (st as any[]).length > 0) setSettings((st as any[])[0] as FullSettings);
      if (m) setMethods(m as any as PaymentMethod[]);
      if (sub && sub.length > 0) setSubscription(sub[0] as any as SubRecord);
      if (pr) setPaymentRequests(pr as any as PaymentRequest[]);
      if (student && student.length > 0) setStudentGovernorate(student[0].governorate);

      if (sub && sub.length > 0) {
        const s = sub[0];
        if (s.status === "active" || s.status === "pending") setStep("status");
        else setStep("method");
      } else {
        setStep("method");
      }
      setLoading(false);
    };
    fetchAll();
  }, [authLoading, user]);

  const studentPrice = settings ? getStudentPrice(settings, studentGovernorate) : 0;

  const handleSelectMethod = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setStep("upload");
  };

  const handleSubmit = async () => {
    if (!user || !selectedMethod || !receiptFile || !settings) return;
    setSubmitting(true);

    const ext = receiptFile.name.split(".").pop();
    const filePath = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("receipts").upload(filePath, receiptFile);
    if (uploadErr) {
      toast({ variant: "destructive", title: "فشل رفع السند: " + uploadErr.message });
      setSubmitting(false);
      return;
    }

    // Store the file path (bucket is now private — use signed URLs to view)

    const { data: newSub, error: subErr } = await supabase.from("subscriptions").insert({
      user_id: user.id, status: "pending",
    }).select().single();

    if (subErr) {
      toast({ variant: "destructive", title: subErr.message });
      setSubmitting(false);
      return;
    }

    const { error: prErr } = await supabase.from("payment_requests").insert({
      user_id: user.id,
      subscription_id: newSub.id,
      payment_method_id: selectedMethod.id,
      amount: studentPrice,
      currency: settings.currency,
      receipt_url: filePath,
      status: "pending",
    });

    if (prErr) {
      toast({ variant: "destructive", title: prErr.message });
    } else {
      toast({ title: "تم إرسال طلب الدفع بنجاح! سيتم مراجعته قريباً" });
      setSubscription({ id: newSub.id, status: "pending", starts_at: null, expires_at: null });
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
  const zoneName = studentGovernorate
    ? ZONE_A_GOVERNORATES.some((g) => studentGovernorate.includes(g)) ? "المنطقة أ" : "المنطقة ب"
    : null;

  return (
    <div className="min-h-screen bg-background">
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

      <div className="max-w-lg mx-auto p-4 pb-20 md:pb-4 space-y-4">
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
              <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard")}>العودة للوحة التحكم</Button>
            </CardContent>
          </Card>
        )}

        {step === "status" && isPending && (
          <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900">
            <CardContent className="py-6 text-center">
              <Clock className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-yellow-700 dark:text-yellow-400">طلبك قيد المراجعة</h2>
              <p className="text-sm text-yellow-600 dark:text-yellow-500 mt-1">سيتم مراجعة طلب الدفع وتفعيل اشتراكك في أقرب وقت</p>
            </CardContent>
          </Card>
        )}

        {step === "method" && settings && (
          <div className="space-y-3">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-4 text-center">
                <p className="text-2xl font-bold text-primary">{studentPrice.toLocaleString()} {settings.currency}</p>
                {zoneName && <p className="text-xs text-muted-foreground mt-1">{zoneName} — {studentGovernorate}</p>}
                {settings.description && <p className="text-sm text-muted-foreground mt-1">{settings.description}</p>}
                
              </CardContent>
            </Card>

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

            {methods.filter((m) => m.type === "ewallet").length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Smartphone className="w-4 h-4" /> محافظ إلكترونية</h3>
                {methods.filter((m) => m.type === "ewallet").map((m) => (
                  <Card key={m.id} className="cursor-pointer hover:border-primary transition-colors mb-2" onClick={() => handleSelectMethod(m)}>
                    <CardContent className="py-3 px-4">
                      <p className="font-semibold text-sm">{m.name}</p>
                      {m.account_number && <p className="text-xs text-muted-foreground">رقم المحفظة: {m.account_number}</p>}
                      {m.details && <p className="text-xs text-muted-foreground">{m.details}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {methods.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد طرق دفع متاحة حالياً</p>}
          </div>
        )}

        {step === "upload" && settings && selectedMethod && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setStep("method")} className="mb-2">
              <ChevronRight className="w-4 h-4 ml-1" /> العودة
            </Button>
            <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
              <div><span className="text-muted-foreground">المبلغ:</span> <span className="font-semibold">{studentPrice.toLocaleString()} {settings.currency}</span></div>
              <div><span className="text-muted-foreground">طريقة الدفع:</span> <span className="font-semibold">{selectedMethod.name}</span></div>
              {selectedMethod.account_number && (
                <div><span className="text-muted-foreground">الحساب:</span> <span className="font-semibold">{selectedMethod.account_number}</span></div>
              )}
            </div>
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
