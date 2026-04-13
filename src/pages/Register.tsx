import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import NativeSelect from "@/components/NativeSelect";
import { Loader2, Rocket } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import {
  RegistrationDraft,
  emptyDraft,
  saveDraft,
  loadDraft,
  clearDraft,
} from "@/lib/registrationDraft";
import { GOVERNORATES, YEMEN_PHONE_REGEX } from "@/domain/constants";
import { trackFunnelEvent } from "@/lib/funnelTracking";

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Unified form state
  const [form, setForm] = useState<RegistrationDraft>(emptyDraft);
  const draftLoaded = useRef(false);
  const formTouched = useRef(false);

  // Data
  const [universities, setUniversities] = useState<Tables<"universities">[]>([]);
  const [colleges, setColleges] = useState<Tables<"colleges">[]>([]);
  const [majors, setMajors] = useState<Tables<"majors">[]>([]);

  // Restore draft on mount — merge only empty fields if user already typed
  useEffect(() => {
    loadDraft().then((draft) => {
      if (draft) {
        if (!formTouched.current) {
          setForm(draft);
        } else {
          // User already started typing — only fill fields that are still empty
          setForm((prev) => {
            const merged = { ...prev };
            (Object.keys(draft) as (keyof RegistrationDraft)[]).forEach((key) => {
              if (!merged[key] && draft[key]) {
                merged[key] = draft[key];
              }
            });
            return merged;
          });
        }
      }
      draftLoaded.current = true;
    });
  }, []);

  // Auto-save draft on every change (after initial load)
  useEffect(() => {
    if (!draftLoaded.current) return;
    saveDraft(form);
  }, [form]);

  // Update a single field
  const updateField = useCallback(
    <K extends keyof RegistrationDraft>(key: K, value: RegistrationDraft[K]) => {
      formTouched.current = true;
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

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
    supabase
      .from("universities")
      .select("*")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        if (data) setUniversities(data);
      });
  }, []);

  // Fetch colleges when university changes
  useEffect(() => {
    if (!form.universityId) {
      setColleges([]);
      setMajors([]);
      return;
    }
    supabase
      .from("colleges")
      .select("*")
      .eq("university_id", form.universityId)
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        setColleges(data || []);
        if (data && form.collegeId) {
          const stillValid = data.some((c) => c.id === form.collegeId);
          if (!stillValid) {
            updateField("collegeId", "");
            updateField("majorId", "");
          }
        }
      });
  }, [form.universityId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch majors when college changes
  useEffect(() => {
    if (!form.collegeId) {
      setMajors([]);
      return;
    }
    supabase
      .from("majors")
      .select("*")
      .eq("college_id", form.collegeId)
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        setMajors(data || []);
        if (data && form.majorId) {
          const stillValid = data.some((m) => m.id === form.majorId);
          if (!stillValid) {
            updateField("majorId", "");
          }
        }
      });
  }, [form.collegeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const isFormValid =
    form.firstName.trim() &&
    form.fourthName.trim() &&
    YEMEN_PHONE_REGEX.test(form.phoneNumber) &&
    form.governorate &&
    form.universityId &&
    form.collegeId;

  const handleRegister = async () => {
    if (!isFormValid) {
      toast({ variant: "destructive", title: "يرجى ملء جميع الحقول بشكل صحيح" });
      return;
    }
    setLoading(true);
    try {
      const res = await supabase.functions.invoke("register-student", {
        body: {
          phone: form.phoneNumber,
          first_name: form.firstName.trim(),
          fourth_name: form.fourthName.trim(),
          governorate: form.governorate,
          university_id: form.universityId,
          college_id: form.collegeId,
          major_id: form.majorId,
          high_school_gpa: form.highSchoolGpa ? parseFloat(form.highSchoolGpa) : null,
        },
      });

      // Handle edge function or backend errors
      const errorMsg = res.data?.error || (res.error ? "فشل في الاتصال بالخادم" : null);
      if (errorMsg) {
        toast({ variant: "destructive", title: "خطأ", description: errorMsg });
        setLoading(false);
        return;
      }

      // Set session and verify it was established
      const { access_token, refresh_token } = res.data.session;
      const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
      if (sessionError) {
        console.error("setSession error:", sessionError);
        toast({ variant: "destructive", title: "خطأ", description: "فشل في تثبيت الجلسة. يرجى المحاولة مرة أخرى." });
        setLoading(false);
        return;
      }

      // Only clear draft after confirmed session
      await clearDraft();
      trackFunnelEvent("user_registered");
      toast({ title: "تم التسجيل بنجاح! 🎉" });
      navigate("/welcome", { replace: true });
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
                <Input
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  placeholder="أحمد"
                />
              </div>
              <div className="space-y-1.5">
                <Label>اللقب</Label>
                <Input
                  value={form.fourthName}
                  onChange={(e) => updateField("fourthName", e.target.value)}
                  placeholder="العمري"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>رقم الجوال</Label>
              <div className="flex gap-2" dir="ltr">
                <div className="flex items-center px-3 border rounded-md bg-muted text-sm font-mono">+967</div>
                <Input
                  type="tel"
                  placeholder="7XXXXXXXX"
                  value={form.phoneNumber}
                  onChange={(e) =>
                    updateField("phoneNumber", e.target.value.replace(/\D/g, "").slice(0, 9))
                  }
                  className="text-left font-mono"
                  dir="ltr"
                  maxLength={9}
                />
              </div>
              {form.phoneNumber && !YEMEN_PHONE_REGEX.test(form.phoneNumber) && (
                <p className="text-xs text-destructive">يجب أن يبدأ بـ 7 ويتكون من 9 أرقام</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>المحافظة</Label>
              <NativeSelect
                value={form.governorate}
                onValueChange={(v) => updateField("governorate", v)}
                placeholder="اختر المحافظة"
                options={GOVERNORATES.map((g) => ({ value: g, label: g }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>الجامعة</Label>
              <NativeSelect
                value={form.universityId}
                onValueChange={(v) => {
                  updateField("universityId", v);
                  updateField("collegeId", "");
                  updateField("majorId", "");
                }}
                placeholder="اختر الجامعة"
                options={universities.map((u) => ({ value: u.id, label: u.name_ar }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                معدل الثانوية (%) <span className="text-muted-foreground font-normal">اختياري</span>
              </Label>
              <Input
                type="number"
                placeholder="مثال: 85.5"
                value={form.highSchoolGpa}
                onChange={(e) => updateField("highSchoolGpa", e.target.value)}
                dir="ltr"
                className="text-left"
                min="60"
                max="100"
                step="0.01"
              />
              {form.highSchoolGpa &&
                (parseFloat(form.highSchoolGpa) < 60 || parseFloat(form.highSchoolGpa) > 100) && (
                  <p className="text-xs text-destructive">يجب أن يكون المعدل بين 60 و 100</p>
                )}
            </div>

            <div className="space-y-1.5">
              <Label>الكلية</Label>
              <NativeSelect
                value={form.collegeId}
                onValueChange={(v) => {
                  updateField("collegeId", v);
                  updateField("majorId", "");
                }}
                placeholder={!form.universityId ? "اختر الجامعة أولاً" : "اختر الكلية"}
                disabled={!form.universityId}
                options={colleges.map((c) => ({ value: c.id, label: c.name_ar }))}
              />
            </div>

            {majors.length > 0 && (
              <div className="space-y-1.5">
                <Label>التخصص <span className="text-muted-foreground font-normal">اختياري</span></Label>
                <NativeSelect
                  value={form.majorId}
                  onValueChange={(v) => updateField("majorId", v)}
                  placeholder="اختر التخصص"
                  options={majors.map((m) => ({ value: m.id, label: m.name_ar }))}
                />
              </div>
            )}

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
              <Link to="/privacy-policy" className="text-primary hover:underline">
                سياسة الخصوصية
              </Link>
              {" "}و{" "}
              <Link to="/terms-of-service" className="text-primary hover:underline">
                شروط الاستخدام
              </Link>
            </p>
            <p className="text-center text-[10px] text-muted-foreground/50 mt-1">v2.1</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
