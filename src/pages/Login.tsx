import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Phone, ArrowRight, Loader2 } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { lovable } from "@/integrations/lovable/index";
import { useToast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { resolveAuthDestination } from "@/lib/authRouting";

const useWebOTP = (
  active: boolean,
  onCodeReceived: (code: string) => void
) => {
  useEffect(() => {
    if (!active) return;
    if (!("OTPCredential" in window)) return;

    const ac = new AbortController();

    (navigator.credentials as any)
      .get({ otp: { transport: ["sms"] }, signal: ac.signal })
      .then((otpCredential: any) => {
        if (otpCredential?.code) {
          onCodeReceived(otpCredential.code);
        }
      })
      .catch(() => {
        // User dismissed or unsupported — ignore
      });

    return () => ac.abort();
  }, [active, onCodeReceived]);
};

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [phoneStep, setPhoneStep] = useState<"idle" | "phone" | "otp">("idle");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resendCountdown, setResendCountdown] = useState(() => {
    const saved = sessionStorage.getItem("otp_cooldown");
    if (saved) {
      const { expiry } = JSON.parse(saved);
      const remaining = Math.ceil((expiry - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return 0;
  });

  // Auto-fill OTP from SMS via WebOTP API
  const handleWebOTPCode = useCallback((code: string) => {
    setOtpCode(code);
  }, []);

  useWebOTP(phoneStep === "otp", handleWebOTPCode);

  // Countdown timer for resend — persist to sessionStorage
  useEffect(() => {
    if (resendCountdown <= 0) {
      sessionStorage.removeItem("otp_cooldown");
      return;
    }
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  // On mount: if session exists, redirect immediately
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const dest = await resolveAuthDestination(session.user.id);
        navigate(dest.path, { replace: true });
      } else {
        setCheckingSession(false);
      }
    });
  }, [navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/login",
      });

      if (result.error) {
        toast({
          variant: "destructive",
          title: "خطأ في تسجيل الدخول",
          description: "حدث خطأ أثناء تسجيل الدخول بحساب Google",
        });
        setLoading(false);
        return;
      }

      if (result.redirected) {
        // Browser will redirect to Google — just return
        return;
      }

      // Session was set by lovable SDK (non-redirect flow)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const dest = await resolveAuthDestination(session.user.id);
        toast({ title: "تم تسجيل الدخول بنجاح" });
        navigate(dest.path, { replace: true });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
      });
    }
    setLoading(false);
  };

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      toast({
        variant: "destructive",
        title: "خطأ",
        description: "يرجى إدخال رقم جوال صحيح",
      });
      return;
    }
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("send-otp", {
        body: { phone: phoneNumber },
      });
      if (res.error || res.data?.error) {
        toast({
          variant: "destructive",
          title: "خطأ",
          description: res.data?.error || "فشل في إرسال رمز التحقق",
        });
      } else {
        toast({ title: "تم الإرسال", description: "تم إرسال رمز التحقق إلى جوالك" });
        setPhoneStep("otp");
        setResendCountdown(60);
        sessionStorage.setItem("otp_cooldown", JSON.stringify({ phone: phoneNumber, expiry: Date.now() + 60000 }));
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
        toast({
          variant: "destructive",
          title: "خطأ",
          description: res.data?.error || "فشل في التحقق من الرمز",
        });
        setLoading(false);
        return;
      }
      // Set session from returned tokens
      const { access_token, refresh_token } = res.data.session;
      await supabase.auth.setSession({ access_token, refresh_token });

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const dest = await resolveAuthDestination(session.user.id);
        toast({ title: "تم تسجيل الدخول بنجاح" });
        navigate(dest.path, { replace: true });
      }
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ غير متوقع" });
    }
    setLoading(false);
  };

  // Show loading while checking existing session
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
        {/* Logo */}
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
            <CardTitle className="text-xl">أهلاً بك في مُفَاضَلَة</CardTitle>
            <CardDescription>سجّل دخولك أو أنشئ حساباً جديداً</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {phoneStep === "idle" && (
              <>
                <Button
                  onClick={() => setPhoneStep("phone")}
                  disabled={loading}
                  className="w-full py-6 text-base font-semibold gap-3"
                >
                  <Phone className="w-5 h-5" />
                  متابعة برقم الجوال
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">أو</span>
                  </div>
                </div>

                <Button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  variant="outline"
                  className="w-full py-6 text-base font-semibold gap-3 border-2 hover:bg-accent"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                   متابعة بحساب Google
                </Button>
              </>
            )}

            {phoneStep === "phone" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => setPhoneStep("idle")}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <span className="font-semibold">أدخل رقم جوالك</span>
                </div>
                <div className="flex gap-2" dir="ltr">
                  <div className="flex items-center px-3 border rounded-md bg-muted text-sm font-mono">
                    +967
                  </div>
                  <Input
                    type="tel"
                    placeholder="7XXXXXXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                    className="text-left font-mono"
                    dir="ltr"
                    maxLength={9}
                  />
                </div>
                <Button
                  onClick={handleSendOtp}
                  disabled={loading || phoneNumber.length < 9}
                  className="w-full py-5 text-base font-bold"
                >
                  {loading ? "جاري الإرسال..." : "إرسال رمز التحقق"}
                </Button>
              </div>
            )}

            {phoneStep === "otp" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => setPhoneStep("phone")}
                    className="text-muted-foreground hover:text-foreground"
                  >
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
                  {loading ? "جاري التحقق..." : "تحقق من الرمز"}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpCode("");
                    handleSendOtp();
                  }}
                  disabled={loading || resendCountdown > 0}
                  className="w-full text-sm text-center text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                >
                  {resendCountdown > 0
                    ? `إعادة الإرسال بعد ${resendCountdown} ثانية`
                    : "إعادة إرسال الرمز"}
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-white/70 mt-4">
          إذا لم يكن لديك حساب، سيتم إنشاؤه تلقائياً
        </p>
      </div>
    </div>
  );
};

export default Login;
