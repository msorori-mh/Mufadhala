import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import NativeSelect from "@/components/NativeSelect";
import { Loader2, Rocket } from "lucide-react";
import logoImg from "@/assets/logo.jpg";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GOVERNORATES, YEMEN_PHONE_REGEX } from "@/domain/constants";

type University = { id: string; name_ar: string };
type College = { id: string; name_ar: string };
type Major = { id: string; name_ar: string };

// Module-level snapshot — survives component remounts but not page reloads.
// No async, no localStorage, no side effects. Pure in-memory safety net.
const _textBackup = { firstName: "", lastName: "", phone: "", gpa: "" };

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // ── TEXT INPUTS: Uncontrolled (DOM owns the values) ──
  // Protects against re-render clearing values (Android WebView bug).
  // Module-level snapshot protects against full remount.
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const gpaRef = useRef<HTMLInputElement>(null);

  // ── SELECT VALUES: Controlled (needed for cascading fetch logic) ──
  const [governorate, setGovernorate] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [majorId, setMajorId] = useState("");

  // ── Validation state (lightweight, only for UI feedback) ──
  const [phoneValue, setPhoneValue] = useState(""); // shadow for validation display
  const [gpaValue, setGpaValue] = useState(""); // shadow for GPA validation
  const [formValid, setFormValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phoneDuplicate, setPhoneDuplicate] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const phoneCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Sync text values to module-level backup on every change ──
  const syncToBackup = useCallback(() => {
    _textBackup.firstName = firstNameRef.current?.value ?? "";
    _textBackup.lastName = lastNameRef.current?.value ?? "";
    _textBackup.phone = phoneRef.current?.value ?? "";
    _textBackup.gpa = gpaRef.current?.value ?? "";
  }, []);

  const [universities, setUniversities] = useState<University[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);

  // Revalidate form whenever anything changes
  const revalidate = useCallback(() => {
    const fn = firstNameRef.current?.value?.trim() ?? "";
    const ln = lastNameRef.current?.value?.trim() ?? "";
    const ph = phoneRef.current?.value ?? "";
    setFormValid(
      fn !== "" &&
      ln !== "" &&
      YEMEN_PHONE_REGEX.test(ph) &&
      governorate !== "" &&
      universityId !== "" &&
      collegeId !== ""
    );
    syncToBackup();
  }, [governorate, universityId, collegeId, syncToBackup]);

  // Re-check validity when select values change
  useEffect(() => {
    revalidate();
  }, [revalidate]);

  useEffect(() => {
    supabase
      .from("universities")
      .select("id, name_ar")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        if (data) setUniversities(data);
      });
  }, []);

  useEffect(() => {
    if (!universityId) {
      setColleges([]);
      setMajors([]);
      return;
    }

    supabase
      .from("colleges")
      .select("id, name_ar")
      .eq("university_id", universityId)
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        const nextColleges = data ?? [];
        setColleges(nextColleges);
        setCollegeId((prev) => {
          if (prev && !nextColleges.some((c) => c.id === prev)) {
            setMajorId("");
            return "";
          }
          return prev;
        });
      });
  }, [universityId]);

  useEffect(() => {
    if (!collegeId) {
      setMajors([]);
      return;
    }

    supabase
      .from("majors")
      .select("id, name_ar")
      .eq("college_id", collegeId)
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        const nextMajors = data ?? [];
        setMajors(nextMajors);
        setMajorId((prev) => {
          if (prev && !nextMajors.some((m) => m.id === prev)) {
            return "";
          }
          return prev;
        });
      });
  }, [collegeId]);

  const handleUniversityChange = (value: string) => {
    setUniversityId(value);
    setCollegeId("");
    setMajorId("");
  };

  const handleCollegeChange = (value: string) => {
    setCollegeId(value);
    setMajorId("");
  };

  const isPhoneValid = YEMEN_PHONE_REGEX.test(phoneValue);

  // Debounced phone duplicate check
  const checkPhoneDuplicate = useCallback((phone: string) => {
    if (phoneCheckTimer.current) clearTimeout(phoneCheckTimer.current);
    setPhoneDuplicate(false);
    if (!YEMEN_PHONE_REGEX.test(phone)) return;
    setCheckingPhone(true);
    phoneCheckTimer.current = setTimeout(async () => {
      try {
        const { data } = await supabase.rpc("check_phone_exists", { _phone: phone });
        setPhoneDuplicate(!!data);
      } catch {}
      setCheckingPhone(false);
    }, 600);
  }, []);

  const handleSubmit = async () => {
    if (!formValid || loading || phoneDuplicate) return;

    // Read text values from DOM refs (source of truth)
    const firstName = firstNameRef.current?.value?.trim() ?? "";
    const lastName = lastNameRef.current?.value?.trim() ?? "";
    const phone = phoneRef.current?.value ?? "";
    const gpa = gpaRef.current?.value ?? "";

    // Final validation guard
    if (!firstName || !lastName || !YEMEN_PHONE_REGEX.test(phone) || !governorate || !universityId || !collegeId) {
      toast({ variant: "destructive", title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة" });
      return;
    }

    if (gpa && (parseFloat(gpa) < 60 || parseFloat(gpa) > 100)) {
      toast({ variant: "destructive", title: "خطأ", description: "المعدل يجب أن يكون بين 60 و 100" });
      return;
    }

    setLoading(true);
    try {
      const res = await supabase.functions.invoke("register-student", {
        body: {
          phone,
          first_name: firstName,
          fourth_name: lastName,
          governorate,
          university_id: universityId,
          college_id: collegeId,
          major_id: majorId || null,
          high_school_gpa: gpa ? parseFloat(gpa) : null,
        },
      });

      let errorMsg = res.data?.error;
      if (!errorMsg && res.error) {
        try {
          const ctx = (res.error as any)?.context;
          if (ctx instanceof Response) {
            const body = await ctx.json();
            errorMsg = body?.error;
          }
        } catch {}
        if (!errorMsg) errorMsg = "فشل في الاتصال بالخادم";
      }
      if (errorMsg) {
        const isDuplicate = errorMsg.includes("مسجل مسبقاً");
        toast({
          variant: "destructive",
          title: isDuplicate ? "الرقم مسجل مسبقاً" : "خطأ",
          description: errorMsg,
          action: isDuplicate ? (
            <Button variant="outline" size="sm" onClick={() => navigate("/login")}>
              تسجيل الدخول
            </Button>
          ) : undefined,
        });
        setLoading(false);
        return;
      }

      const { access_token, refresh_token } = res.data.session;
      const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
      if (sessionError) {
        toast({ variant: "destructive", title: "خطأ", description: "فشل في تثبيت الجلسة." });
        setLoading(false);
        return;
      }

      toast({ title: "تم التسجيل بنجاح! 🎉" });
      navigate("/welcome", { replace: true });
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ غير متوقع" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <img src={logoImg} alt="مُفَاضَلَة" className="w-16 h-16 mx-auto" />
          <CardTitle className="text-xl">إنشاء حساب جديد</CardTitle>
          <CardDescription>سجّل بياناتك للبدء</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>الاسم الأول *</Label>
            <Input
              ref={firstNameRef}
              defaultValue={_textBackup.firstName}
              onChange={revalidate}
            />
          </div>

          <div className="space-y-1.5">
            <Label>اللقب *</Label>
            <Input
              ref={lastNameRef}
              defaultValue={_textBackup.lastName}
              onChange={revalidate}
            />
          </div>

          <div className="space-y-1.5">
            <Label>رقم الجوال *</Label>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground shrink-0">967+</span>
              <Input
                ref={phoneRef}
                type="tel"
                inputMode="numeric"
                maxLength={9}
                defaultValue={_textBackup.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 9);
                  if (phoneRef.current) phoneRef.current.value = val;
                  setPhoneValue(val);
                  checkPhoneDuplicate(val);
                  revalidate();
                }}
              />
            </div>
            {phoneValue && !isPhoneValid && (
              <p className="text-xs text-destructive">رقم الجوال يجب أن يبدأ بـ 7 ويتكون من 9 أرقام</p>
            )}
            {isPhoneValid && checkingPhone && (
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> جارٍ التحقق...</p>
            )}
            {isPhoneValid && !checkingPhone && phoneDuplicate && (
              <div className="flex items-center gap-2">
                <p className="text-xs text-destructive">هذا الرقم مسجل مسبقاً</p>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => navigate("/login")}>
                  تسجيل الدخول
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>المحافظة *</Label>
            <NativeSelect
              value={governorate}
              onValueChange={(value) => setGovernorate(value)}
              placeholder="اختر المحافظة"
              options={GOVERNORATES.map((g) => ({ value: g, label: g }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>الجامعة *</Label>
            <NativeSelect
              value={universityId}
              onValueChange={handleUniversityChange}
              placeholder="اختر الجامعة"
              options={universities.map((u) => ({ value: u.id, label: u.name_ar }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>الكلية *</Label>
            <NativeSelect
              value={collegeId}
              onValueChange={handleCollegeChange}
              placeholder="اختر الكلية"
              disabled={!universityId}
              options={colleges.map((c) => ({ value: c.id, label: c.name_ar }))}
            />
          </div>

          {majors.length > 0 && (
            <div className="space-y-1.5">
              <Label>التخصص</Label>
              <NativeSelect
                value={majorId}
                onValueChange={(value) => setMajorId(value)}
                placeholder="اختر التخصص"
                options={majors.map((m) => ({ value: m.id, label: m.name_ar }))}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>معدل الثانوية العامة</Label>
            <Input
              ref={gpaRef}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="60"
              max="100"
              defaultValue={_textBackup.gpa}
              onChange={(e) => {
                setGpaValue(e.target.value);
                revalidate();
              }}
            />
            {gpaValue && (parseFloat(gpaValue) < 60 || parseFloat(gpaValue) > 100) && (
              <p className="text-xs text-destructive">المعدل يجب أن يكون بين 60 و 100</p>
            )}
          </div>

          <Button className="w-full" size="lg" disabled={!formValid || loading || phoneDuplicate} onClick={handleSubmit}>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Rocket className="w-5 h-5 ml-2" />
                تسجيل
              </>
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            لديك حساب بالفعل؟{" "}
            <Link to="/login" className="text-primary font-medium underline">
              تسجيل الدخول
            </Link>
          </p>

        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
