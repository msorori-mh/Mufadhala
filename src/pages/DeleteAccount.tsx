import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Trash2, AlertTriangle, Loader2, Phone, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Step = "phone" | "otp" | "confirm";

const DeleteAccount = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Load phone from student profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("students")
      .select("phone")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.phone) {
          const p = data.phone.startsWith("+967") ? data.phone.slice(4) : data.phone;
          setPhone(p);
        }
      });
  }, [user]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  const fullPhone = phone.startsWith("+") ? phone : `+967${phone.replace(/^0+/, "")}`;

  const handleSendOtp = async () => {
    if (!phone || phone.replace(/\D/g, "").length < 9) {
      toast.error("يرجى إدخال رقم هاتف صالح");
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-otp", {
        body: { phone: fullPhone },
      });
      if (error) throw error;
      toast.success("تم إرسال رمز التحقق إلى هاتفك");
      setStep("otp");
      setCooldown(60);
    } catch (err: any) {
      const msg = err?.message || "فشل إرسال رمز التحقق";
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("يرجى إدخال الرمز المكون من 6 أرقام");
      return;
    }
    setVerifying(true);
    try {
      const { error } = await supabase.functions.invoke("verify-otp", {
        body: { phone: fullPhone, code: otp },
      });
      if (error) throw error;
      toast.success("تم التحقق بنجاح");
      setStep("confirm");
    } catch {
      toast.error("رمز التحقق غير صحيح أو منتهي الصلاحية");
      setOtp("");
    } finally {
      setVerifying(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account", {
        body: { phone: fullPhone, code: otp },
      });
      if (error) throw error;

      await supabase.auth.signOut();
      toast.success("تم حذف حسابك وجميع بياناتك بنجاح.");
      navigate("/login", { replace: true });
    } catch {
      toast.error("حدث خطأ أثناء حذف الحساب. يرجى المحاولة مرة أخرى.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-destructive text-destructive-foreground p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">حذف الحساب</h1>
      </div>

      <div className="p-4 space-y-6 max-w-lg mx-auto">
        {/* Warning */}
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-lg mb-2">تحذير: هذا الإجراء لا يمكن التراجع عنه</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  عند حذف حسابك، سيتم إزالة جميع بياناتك بشكل نهائي وفوري من النظام. لا يمكن استعادة أي بيانات بعد الحذف.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What will be deleted */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold text-foreground mb-4">ما الذي سيتم حذفه؟</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[
                "الملف الشخصي وجميع المعلومات المسجلة (الاسم، رقم الجوال، المعدل)",
                "سجل الاختبارات وجميع النتائج والإنجازات",
                "تقدم الدروس والملخصات المحفوظة",
                "بيانات الاشتراك وسجل المدفوعات",
                "جميع الإشعارات والمحادثات",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Trash2 className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {(["phone", "otp", "confirm"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step === s ? "bg-destructive text-destructive-foreground" :
                (["phone", "otp", "confirm"].indexOf(step) > i ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground")
              }`}>
                {i + 1}
              </div>
              {i < 2 && <div className={`w-8 h-0.5 ${["phone", "otp", "confirm"].indexOf(step) > i ? "bg-destructive/40" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Phone */}
        {step === "phone" && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <Phone className="w-5 h-5 text-destructive" />
                <h3 className="font-bold text-foreground">التحقق من هويتك</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                أدخل رقم هاتفك المسجل لإرسال رمز تحقق
              </p>
              <div className="flex gap-2 items-center" dir="ltr">
                <span className="text-sm text-muted-foreground font-mono bg-muted px-2 py-2 rounded">+967</span>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="7XXXXXXXX"
                  className="text-left font-mono"
                  dir="ltr"
                  maxLength={9}
                />
              </div>
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={handleSendOtp}
                disabled={sending || phone.length < 9}
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                إرسال رمز التحقق
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: OTP */}
        {step === "otp" && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <ShieldCheck className="w-5 h-5 text-destructive" />
                <h3 className="font-bold text-foreground">إدخال رمز التحقق</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                تم إرسال رمز مكون من 6 أرقام إلى <span className="font-mono font-bold" dir="ltr">{fullPhone}</span>
              </p>

              <div className="flex justify-center" dir="ltr">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={handleVerifyOtp}
                disabled={verifying || otp.length !== 6}
              >
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                تحقق من الرمز
              </Button>

              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setStep("phone"); setOtp(""); }}
                >
                  تغيير الرقم
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSendOtp}
                  disabled={cooldown > 0 || sending}
                >
                  {cooldown > 0 ? `إعادة الإرسال (${cooldown}ث)` : "إعادة إرسال الرمز"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Final Confirm */}
        {step === "confirm" && (
          <Card className="border-destructive/30">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <Trash2 className="w-5 h-5 text-destructive" />
                <h3 className="font-bold text-foreground">تأكيد الحذف النهائي</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                تم التحقق من هويتك بنجاح. اضغط على الزر أدناه لحذف حسابك نهائياً.
              </p>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full gap-2"
                    disabled={deleting}
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    حذف حسابي نهائياً
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent dir="rtl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>تأكيد نهائي</AlertDialogTitle>
                    <AlertDialogDescription>
                      هل أنت متأكد تماماً؟ سيتم تسجيل خروجك فوراً وحذف جميع بياناتك نهائياً من النظام.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-row-reverse gap-2">
                    <AlertDialogCancel>تراجع</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      نعم، احذف حسابي
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}

        {/* Contact note */}
        <p className="text-xs text-center text-muted-foreground px-4">
          إذا كنت تواجه مشكلة وتريد المساعدة بدلاً من حذف حسابك، تواصل معنا عبر المساعد الذكي "مُفَاضَلَة" في التطبيق.
        </p>
      </div>
    </div>
  );
};

export default DeleteAccount;
