import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, ArrowRight, Loader2 } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import type { Tables } from "@/integrations/supabase/types";

const GOVERNORATES = [
  "أمانة العاصمة", "عدن", "تعز", "الحديدة", "إب", "ذمار", "حجة",
  "صعدة", "عمران", "صنعاء", "المحويت", "ريمة", "البيضاء", "مأرب",
  "الجوف", "شبوة", "حضرموت", "المهرة", "أبين", "لحج", "الضالع", "سقطرى",
];

const YEMEN_PHONE_REGEX = /^7[0-9]{8}$/;

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

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [fourthName, setFourthName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [collegeId, setCollegeId] = useState("");

  // OTP
  const [otpCode, setOtpCode] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  // Data
  const [universities, setUniversities] = useState<Tables<"universities">[]>([]);
  const [colleges, setColleges] = useState<Tables<"colleges">[]>([]);

  // WebOTP
  const handleWebOTPCode = useCallback((code: string) => setOtpCode(code), []);
  useWebOTP(step === "otp", handleWebOTPCode);

  // Check session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard", { replace: true });
      } else {
        setCheckingSession(false);
      }
    });
  }, [navigate]);

  // Fetch universities
  useEffect(() => {
    supabase.from("universities").select("*").eq("is_active", true).order("display_order")
      .then(({ data }) => { if (data) setUniversities(data); });
  }, []);

  // Fetch colleges when university changes
  useEffect(() => {
    if (!universityId) { setColleges([]); setCollegeId(""); return; }
    supabase.from("colleges").select("*").eq("university_id", universityId).eq("is_active", true).order("display_order")
      .then(({ data }) => { setColleges(data || []); setCollegeId(""); });
  }, [universityId]);

  // Countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const isFormValid = firstName.trim() && fourthName.trim() && YEMEN_PHONE_REGEX.test(phoneNumber) && governorate && universityId && collegeId;

  const handleSendOtp = async () => {
    if (!isFormValid) {
      toast({ variant: "destructive", title: "يرجى ملء جميع الحقول بشكل صحيح" });
      return;
    }
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("send-otp", {
        body: { phone: phoneNumber },
      });
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
        body: {
          phone: phoneNumber,
          code: otpCode,
          metadata: {
            first_name: firstName.trim(),
            fourth_name: fourthName.trim(),
            governorate,
            university_id: universityId,
            college_id: collegeId,
            phone: phoneNumber,
          },
        },
      });
      if (res.error || res.data?.error) {
        toast({ variant: "destructive", title: "خطأ", description: res.data?.error || "فشل في التحقق من الرمز" });
        setLoading(false);
        return;
      }
      const { access_token, refresh_token } = res.data.session;
      await supabase.auth.setSession({ access_token, refresh_token });
      toast({ title: "تم التسجيل بنجاح! 🎉" });
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
        {/* Logo */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex flex-col items-center gap-2">
            <div className="w-20 h-20 flex items-center justify-center animate-scale-in rounded-full overflow-hidden bg-white/20 backdrop-blur-sm">
              <img src={logoImg} alt="شعار مُفَاضَلَة" className="w-full h-full object-cover drop-shadow-lg" />
            </div>
            <span className="text-2xl font-bold text-white">مُفَاضَلَة</span>
          </Link>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">أنشئ حسابك</CardTitle>
            <CardDescription>
              {step === "form" ? "أدخل بياناتك للبدء" : "أدخل رمز التحقق"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === "form" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>الاسم الأول</Label>
                    <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="أحمد" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>اللقب</Label>
                    <Input value={fourthName} onChange={e => setFourthName(e.target.value)} placeholder="العمري" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>رقم الجوال</Label>
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
                  {phoneNumber && !YEMEN_PHONE_REGEX.test(phoneNumber) && (
                    <p className="text-xs text-destructive">يجب أن يبدأ بـ 7 ويتكون من 9 أرقام</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>المحافظة</Label>
                  <Select value={governorate} onValueChange={setGovernorate}>
                    <SelectTrigger><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
                    <SelectContent>
                      {GOVERNORATES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>الجامعة</Label>
                  <Select value={universityId} onValueChange={v => { setUniversityId(v); setCollegeId(""); }}>
                    <SelectTrigger><SelectValue placeholder="اختر الجامعة" /></SelectTrigger>
                    <SelectContent>
                      {universities.map(u => <SelectItem key={u.id} value={u.id}>{u.name_ar}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>الكلية</Label>
                  <Select value={collegeId} onValueChange={setCollegeId} disabled={!universityId}>
                    <SelectTrigger><SelectValue placeholder={!universityId ? "اختر الجامعة أولاً" : "اختر الكلية"} /></SelectTrigger>
                    <SelectContent>
                      {colleges.map(c => <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleSendOtp}
                  disabled={loading || !isFormValid}
                  className="w-full py-5 text-base font-bold gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                  {loading ? "جاري الإرسال..." : "إرسال رمز التحقق"}
                </Button>
              </>
            )}

            {step === "otp" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => { setStep("form"); setOtpCode(""); }} className="text-muted-foreground hover:text-foreground">
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
                  {loading ? "جاري التحقق..." : "تحقق وأنشئ حسابك"}
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
              <span className="text-muted-foreground">لديك حساب بالفعل؟</span>{" "}
              <Link to="/login" className="text-primary font-semibold hover:underline">تسجيل الدخول</Link>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              بتسجيلك فإنك توافق على{" "}
              <Link to="/privacy-policy" className="text-primary hover:underline">سياسة الخصوصية</Link>
              {" "}و{" "}
              <Link to="/terms-of-service" className="text-primary hover:underline">شروط الاستخدام</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
