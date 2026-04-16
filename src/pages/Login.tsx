import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, LogIn, Send } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { YEMEN_PHONE_REGEX } from "@/domain/constants";

type Step = "phone" | "otp";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const phoneRef = useRef<HTMLInputElement>(null);
  const [phoneValue, setPhoneValue] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<Step>("phone");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [notRegistered, setNotRegistered] = useState(false);

  const isPhoneValid = YEMEN_PHONE_REGEX.test(phoneValue);

  // Cooldown timer
  const startCooldown = (seconds: number) => {
    setCooldown(seconds);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    const phone = phoneRef.current?.value ?? "";
    if (!YEMEN_PHONE_REGEX.test(phone) || loading) return;

    setLoading(true);
    try {
      const res = await supabase.functions.invoke("send-otp", {
        body: { phone },
      });

      const errorMsg = res.data?.error || (res.error ? "فشل في الاتصال بالخادم" : null);
      if (errorMsg) {
        const retryAfter = res.data?.retryAfter;
        if (retryAfter) startCooldown(retryAfter);
        toast({ variant: "destructive", title: "خطأ", description: errorMsg });
        setLoading(false);
        return;
      }

      toast({ title: "تم إرسال رمز التحقق 📱" });
      setStep("otp");
      startCooldown(60);
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ غير متوقع" });
    }
    setLoading(false);
  };

  const handleVerifyAndLogin = async () => {
    const phone = phoneRef.current?.value ?? "";
    if (!YEMEN_PHONE_REGEX.test(phone) || otpCode.length !== 6 || loading) return;

    setLoading(true);
    try {
      const res = await supabase.functions.invoke("login-student", {
        body: { phone, code: otpCode },
      });

      const errorMsg = res.data?.error || (res.error ? "فشل في الاتصال بالخادم" : null);
      if (errorMsg) {
        // Check if this is a "not registered" error (404)
        if (errorMsg.includes("لا يوجد حساب")) {
          setNotRegistered(true);
        } else {
          toast({ variant: "destructive", title: "خطأ", description: errorMsg });
        }
        setLoading(false);
        return;
      }

      setNotRegistered(false);
      const { access_token, refresh_token } = res.data.session;
      const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
      if (sessionError) {
        toast({ variant: "destructive", title: "خطأ", description: "فشل في تثبيت الجلسة." });
        setLoading(false);
        return;
      }

      toast({ title: "تم تسجيل الدخول بنجاح! 🎉" });
      navigate("/dashboard", { replace: true });
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ غير متوقع" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-24 h-24 mx-auto animate-float rounded-full overflow-hidden bg-white/20 backdrop-blur-sm -translate-x-2">
            <img src={logoImg} alt="مُفَاضَلَة" className="w-full h-full object-cover drop-shadow-lg" />
          </div>
          <CardTitle className="text-xl">تسجيل الدخول</CardTitle>
          <CardDescription>
            {step === "phone"
              ? "أدخل رقم جوالك لاستلام رمز التحقق"
              : "أدخل رمز التحقق المرسل إلى جوالك"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Phone Input */}
          <div className="space-y-1.5">
            <Label>رقم الجوال</Label>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground shrink-0">967+</span>
              <Input
                ref={phoneRef}
                type="tel"
                inputMode="numeric"
                maxLength={9}
                disabled={step === "otp"}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 9);
                  if (phoneRef.current) phoneRef.current.value = val;
                  setPhoneValue(val);
                }}
              />
            </div>
            {phoneValue && !isPhoneValid && (
              <p className="text-xs text-destructive">رقم الجوال يجب أن يبدأ بـ 7 ويتكون من 9 أرقام</p>
            )}
          </div>

          {/* OTP Step */}
          {step === "otp" && (
            <>
              <div className="space-y-1.5">
                <Label>رمز التحقق</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="أدخل الرمز المكون من 6 أرقام"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  autoFocus
                  className="text-center tracking-widest text-lg"
                />
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                disabled={cooldown > 0 || loading}
                onClick={handleSendOtp}
              >
                {cooldown > 0 ? `إعادة الإرسال بعد ${cooldown} ثانية` : "إعادة إرسال الرمز"}
              </Button>
            </>
          )}

          {/* Not Registered Alert */}
          {notRegistered && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 space-y-3">
              <p className="text-sm text-destructive font-medium text-center">
                لا يوجد حساب مسجل بهذا الرقم
              </p>
              <p className="text-xs text-muted-foreground text-center">
                يبدو أنك لم تسجل من قبل. أنشئ حساباً جديداً للبدء.
              </p>
              <Button
                className="w-full"
                variant="default"
                size="sm"
                onClick={() => navigate("/register")}
              >
                إنشاء حساب جديد
              </Button>
            </div>
          )}

          {/* Action Button */}
          {step === "phone" ? (
            <Button
              className="w-full"
              size="lg"
              disabled={!isPhoneValid || loading || cooldown > 0}
              onClick={handleSendOtp}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5 ml-2" />
                  إرسال رمز التحقق
                </>
              )}
            </Button>
          ) : (
            <Button
              className="w-full"
              size="lg"
              disabled={otpCode.length !== 6 || loading}
              onClick={handleVerifyAndLogin}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5 ml-2" />
                  تسجيل الدخول
                </>
              )}
            </Button>
          )}

          {/* Back to phone step */}
          {step === "otp" && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => { setStep("phone"); setOtpCode(""); }}
              disabled={loading}
            >
              تغيير رقم الجوال
            </Button>
          )}

          <p className="text-center text-sm text-muted-foreground">
            ليس لديك حساب؟{" "}
            <Link to="/register" className="text-primary font-medium underline">
              إنشاء حساب جديد
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
