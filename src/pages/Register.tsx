import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Rocket } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

const GOVERNORATES = [
  "أمانة العاصمة", "عدن", "تعز", "الحديدة", "إب", "ذمار", "حجة",
  "صعدة", "عمران", "صنعاء", "المحويت", "ريمة", "البيضاء", "مأرب",
  "الجوف", "شبوة", "حضرموت", "المهرة", "أبين", "لحج", "الضالع", "سقطرى",
];

const YEMEN_PHONE_REGEX = /^7[0-9]{8}$/;

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [fourthName, setFourthName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [highSchoolGpa, setHighSchoolGpa] = useState("");

  // Data
  const [universities, setUniversities] = useState<Tables<"universities">[]>([]);
  const [colleges, setColleges] = useState<Tables<"colleges">[]>([]);

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

  const isFormValid = firstName.trim() && fourthName.trim() && YEMEN_PHONE_REGEX.test(phoneNumber) && governorate && universityId && collegeId;

  const handleRegister = async () => {
    if (!isFormValid) {
      toast({ variant: "destructive", title: "يرجى ملء جميع الحقول بشكل صحيح" });
      return;
    }
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("register-student", {
        body: {
          phone: phoneNumber,
          first_name: firstName.trim(),
          fourth_name: fourthName.trim(),
          governorate,
          university_id: universityId,
          college_id: collegeId,
          high_school_gpa: highSchoolGpa ? parseFloat(highSchoolGpa) : null,
        },
      });
      if (res.error || res.data?.error) {
        toast({ variant: "destructive", title: "خطأ", description: res.data?.error || "فشل في إنشاء الحساب" });
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
            <CardDescription>أدخل بياناتك للبدء مباشرة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Label>معدل الثانوية (%) <span className="text-muted-foreground font-normal">اختياري</span></Label>
              <Input
                type="number"
                placeholder="مثال: 85.5"
                value={highSchoolGpa}
                onChange={e => setHighSchoolGpa(e.target.value)}
                dir="ltr"
                className="text-left"
                min="60" max="100" step="0.01"
              />
              {highSchoolGpa && (parseFloat(highSchoolGpa) < 60 || parseFloat(highSchoolGpa) > 100) && (
                <p className="text-xs text-destructive">يجب أن يكون المعدل بين 60 و 100</p>
              )}
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
              onClick={handleRegister}
              disabled={loading || !isFormValid}
              className="w-full py-5 text-base font-bold gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              {loading ? "جاري التسجيل..." : "ابدأ الآن"}
            </Button>

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
