import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Phone, ArrowRight, Loader2 } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { useToast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const useWebOTP = (active: boolean, onCodeReceived: (code: string) => void) => {
  useEffect(() => {
    if (!active || !("OTPCredential" in window)) return;
    const ac = new AbortController();
    (navigator.credentials as any)
      .get({ otp: { transport: ["sms"] }, signal: ac.signal })
      .then((c: any) => { if (c?.code) onCodeReceived(c.code); })
      .catch(() => {});
    return () => ac.abort();
  }, [active, onCodeReceived]);
};

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  const handleWebOTPCode = useCallback((code: string) => setOtpCode(code), []);
  useWebOTP(step === "otp", handleWebOTPCode);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard", { replace: true });
      } else {
        setCheckingSession(false);
      }
    });
  }, [navigate]);

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      toast({ variant: "destructive", title: "خطأ", description: "يرجى إدخال رقم جوال صحيح" });
      return;
    }
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("send-otp", { body: { phone: phoneNumber } });
      if (res.error || res.data?.error) {
        toast({ variant: "destructive", title: "خطأ", description: res.data?.error || "فشل في إرسال رمز التحقق" });
      } else {
        toast({ title: "تم الإرسال", description: "تم إرسال رمز التحقق إلى جوالك" });
        setStep("otp");
        setResendCountdown(60);
      }
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ غير متوقع" });
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) return;
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("verify-otp", {
        body: { phone: phoneNumber, code: otpCode },
      });
      if (res.error || res.data?.error) {
        toast({ variant: "destructive", title: "خطأ", description: res.data?.error || "فشل في التحقق من الرمز" });
        setLoading(false);
        return;
      }
      const { access_token, refresh_token } = res.data.session;
      await supabase.auth.setSession({ access_token, refresh_token });
      toast({ title: "تم تسجيل الدخول بنجاح" });
      navigate("/dashboard", { replace: true });
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ غير متوقع" });
    }
    setLoading(false);
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-3">
            <div className="w-20 h-20 flex items-center justify-center animate-scale-in rounded-full overflow-hidden bg-white/20 backdrop-blur-sm">
              <img src={logoImg} alt="شعار مُفَاضَلَة" className="w-full h-full object-cover drop-shadow-lg" />
            </div>
            <span className="text-2xl font-bold text-white">مُفَاضَلَة</span>
          </Link>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">تسجيل الدخول</CardTitle>
            <CardDescription>أدخل رقم جوالك للمتابعة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === "phone" && (
              <div className="space-y-4">
                <div className="flex gap-2" dir="ltr">
                  <div className="flex items-center px-3 border rounded-md bg-muted text-sm font-mono">+967</div>
                  <Input
                    type="tel"
                    placeholder="7XXXXXXXX"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 9))}
                    className="text-left font-mono"
                    dir="ltr"
                    maxLength={9}
                  />
                </div>
                <Button
                  onClick={handleSendOtp}
                  disabled={loading || phoneNumber.length < 9}
                  className="w-full py-5 text-base font-bold gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                  {loading ? "جاري الإرسال..." : "إرسال رمز التحقق"}
                </Button>
              </div>
            )}

            {step === "otp" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => { setStep("phone"); setOtpCode(""); }} className="text-muted-foreground hover:text-foreground">
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <span className="font-semibold">أدخل رمز التحقق</span>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  تم إرسال رمز مكون من 6 أرقام إلى +967{phoneNumber}
                </p>
                <div className="flex justify-center" dir="ltr">
                  <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoComplete="one-time-code">
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button
                  onClick={handleVerifyOtp}
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-5 text-base font-bold"
                >
                  {loading ? "جاري التحقق..." : "تسجيل الدخول"}
                </Button>
                <button
                  type="button"
                  onClick={() => { setOtpCode(""); handleSendOtp(); }}
                  disabled={loading || resendCountdown > 0}
                  className="w-full text-sm text-center text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                >
                  {resendCountdown > 0 ? `إعادة الإرسال بعد ${resendCountdown} ثانية` : "إعادة إرسال الرمز"}
                </button>
              </div>
            )}

            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">ليس لديك حساب؟</span>{" "}
              <Link to="/register" className="text-primary font-semibold hover:underline">سجّل الآن</Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-white/50 mt-4">
          <Link to="/privacy-policy" className="hover:underline hover:text-white/80">سياسة الخصوصية</Link>
          {" | "}
          <Link to="/terms-of-service" className="hover:underline hover:text-white/80">شروط الاستخدام</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
