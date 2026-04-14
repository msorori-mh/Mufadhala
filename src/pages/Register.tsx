import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import NativeSelect from "@/components/NativeSelect";
import { Loader2, Rocket } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import { clearDraft } from "@/lib/registrationDraft";
import { GOVERNORATES, YEMEN_PHONE_REGEX } from "@/domain/constants";
import { trackFunnelEvent } from "@/lib/funnelTracking";
import { isNativePlatform } from "@/lib/capacitor";
import RegisterDebugPanel from "@/components/RegisterDebugPanel";

// ── Types ──
interface FormState {
  firstName: string;
  fourthName: string;
  phoneNumber: string;
  governorate: string;
  universityId: string;
  collegeId: string;
  majorId: string;
  highSchoolGpa: string;
}

const emptyForm: FormState = {
  firstName: "",
  fourthName: "",
  phoneNumber: "",
  governorate: "",
  universityId: "",
  collegeId: "",
  majorId: "",
  highSchoolGpa: "",
};

// ── Debug trace log (in-memory ring buffer) ──
interface TraceEntry {
  ts: number;
  source: string;
  changed: string[];
  snapshot: FormState;
}
const MAX_TRACE = 60;

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: authUser, loading: authLoading } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [submitPhase, setSubmitPhase] = useState("");

  // ── Single source of truth for form ──
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formTouched, setFormTouched] = useState(false);
  const mountCount = useRef(0);
  const [traceLog, setTraceLog] = useState<TraceEntry[]>([]);
  const [lastSource, setLastSource] = useState("");
  const [viewportH, setViewportH] = useState(window.innerHeight);
  const [kbVisible, setKbVisible] = useState(false);

  // Increment mount count
  useEffect(() => {
    mountCount.current += 1;
  }, []);

  // ── Traced setter ──
  const tracedSetForm = useCallback(
    (source: string, updater: (prev: FormState) => FormState) => {
      setForm((prev) => {
        const next = updater(prev);
        // Compute changed keys
        const changed: string[] = [];
        for (const k of Object.keys(next) as (keyof FormState)[]) {
          if (prev[k] !== next[k]) changed.push(k);
        }
        if (changed.length > 0) {
          const entry: TraceEntry = {
            ts: Date.now(),
            source,
            changed,
            snapshot: { ...next },
          };
          console.log(`[SETFORM:${source}]`, { changed, prev: { ...prev }, next: { ...next } });
          setTraceLog((t) => [...t.slice(-(MAX_TRACE - 1)), entry]);
          setLastSource(source);
        }
        return next;
      });
    },
    [],
  );

  // ── Update a single field (the ONLY mutation path for user input) ──
  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setFormTouched(true);
      tracedSetForm(`updateField:${key}`, (prev) => ({ ...prev, [key]: value }));
    },
    [tracedSetForm],
  );

  // ── PHASE 1: Draft restore DISABLED on mobile for stability ──
  // On web we also skip draft restore to keep behavior consistent during debugging
  // (Draft restore was identified as a race condition source)

  // ── Redirect if already logged in ──
  useEffect(() => {
    if (authLoading) return;
    if (authUser) {
      clearDraft();
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, authUser, navigate]);

  // ── Data loading ──
  const [universities, setUniversities] = useState<Tables<"universities">[]>([]);
  const [colleges, setColleges] = useState<Tables<"colleges">[]>([]);
  const [majors, setMajors] = useState<Tables<"majors">[]>([]);

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

  // Fetch colleges when university changes — ONLY reset collegeId & majorId
  useEffect(() => {
    if (!form.universityId) {
      setColleges([]);
      setMajors([]);
      return;
    }
    let cancelled = false;
    supabase
      .from("colleges")
      .select("*")
      .eq("university_id", form.universityId)
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        if (cancelled) return;
        setColleges(data || []);
        // Only reset college/major if current selection is no longer valid
        if (data) {
          setForm((prev) => {
            const stillValid = data.some((c) => c.id === prev.collegeId);
            if (!stillValid && prev.collegeId) {
              console.log("[SETFORM:universityEffect] resetting collegeId+majorId");
              return { ...prev, collegeId: "", majorId: "" };
            }
            return prev;
          });
        }
      });
    return () => { cancelled = true; };
  }, [form.universityId]);

  // Fetch majors when college changes — ONLY reset majorId
  useEffect(() => {
    if (!form.collegeId) {
      setMajors([]);
      return;
    }
    let cancelled = false;
    supabase
      .from("majors")
      .select("*")
      .eq("college_id", form.collegeId)
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        if (cancelled) return;
        setMajors(data || []);
        if (data) {
          setForm((prev) => {
            const stillValid = data.some((m) => m.id === prev.majorId);
            if (!stillValid && prev.majorId) {
              console.log("[SETFORM:collegeEffect] resetting majorId");
              return { ...prev, majorId: "" };
            }
            return prev;
          });
        }
      });
    return () => { cancelled = true; };
  }, [form.collegeId]);

  // ── Viewport / keyboard tracking ──
  useEffect(() => {
    const onResize = () => {
      const h = window.innerHeight;
      const wasKb = kbVisible;
      const isKb = h < viewportH - 100;
      setViewportH(h);
      if (isKb !== wasKb) setKbVisible(isKb);
    };
    window.addEventListener("resize", onResize);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      vv?.removeEventListener("resize", onResize);
    };
  }, [viewportH, kbVisible]);

  // ── Validation ──
  const validationChecks = {
    firstName: !!form.firstName.trim(),
    fourthName: !!form.fourthName.trim(),
    phoneNumber: YEMEN_PHONE_REGEX.test(form.phoneNumber),
    governorate: !!form.governorate,
    universityId: !!form.universityId,
    collegeId: !!form.collegeId,
  };
  const isFormValid = Object.values(validationChecks).every(Boolean);

  const fieldLabels: Record<string, string> = {
    firstName: "الاسم الأول",
    fourthName: "اللقب",
    phoneNumber: "رقم الجوال",
    governorate: "المحافظة",
    universityId: "الجامعة",
    collegeId: "الكلية",
  };
  const missingFields = Object.entries(validationChecks)
    .filter(([, ok]) => !ok)
    .map(([key]) => fieldLabels[key]);

  // ── Submit with timeout protection ──
  const handleRegister = async () => {
    setSubmitPhase("validation");
    console.log("[SUBMIT:start]", { form, isFormValid, validationChecks });

    if (!isFormValid) {
      toast({ variant: "destructive", title: "يرجى ملء جميع الحقول بشكل صحيح" });
      setSubmitPhase("");
      return;
    }

    setLoading(true);
    setSubmitPhase("payload-created");

    const payload = {
      phone: form.phoneNumber,
      first_name: form.firstName.trim(),
      fourth_name: form.fourthName.trim(),
      governorate: form.governorate,
      university_id: form.universityId,
      college_id: form.collegeId,
      major_id: form.majorId,
      high_school_gpa: form.highSchoolGpa ? parseFloat(form.highSchoolGpa) : null,
    };
    console.log("[SUBMIT:payload-created]", payload);

    // Timeout protection: 30 seconds max
    const timeoutId = setTimeout(() => {
      console.error("[SUBMIT:TIMEOUT] exceeded 30s");
      setLoading(false);
      setSubmitPhase("timeout");
      toast({
        variant: "destructive",
        title: "انتهت مهلة الطلب",
        description: "يرجى المحاولة مرة أخرى",
      });
    }, 30000);

    try {
      setSubmitPhase("invoke-register-student");
      console.log("[SUBMIT:invoke-register-student]");

      const res = await supabase.functions.invoke("register-student", { body: payload });

      console.log("[SUBMIT:edge-response]", { data: res.data, error: res.error });
      setSubmitPhase("edge-response");

      const errorMsg = res.data?.error || (res.error ? "فشل في الاتصال بالخادم" : null);
      if (errorMsg) {
        clearTimeout(timeoutId);
        toast({ variant: "destructive", title: "خطأ", description: errorMsg });
        setLoading(false);
        setSubmitPhase("error: " + errorMsg);
        return;
      }

      setSubmitPhase("session-establishing");
      const { access_token, refresh_token } = res.data.session;
      const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });

      if (sessionError) {
        clearTimeout(timeoutId);
        console.error("[SUBMIT:session-error]", sessionError);
        toast({
          variant: "destructive",
          title: "خطأ",
          description: "فشل في تثبيت الجلسة. يرجى المحاولة مرة أخرى.",
        });
        setLoading(false);
        setSubmitPhase("session-error");
        return;
      }

      clearTimeout(timeoutId);
      setSubmitPhase("session-established");
      console.log("[SUBMIT:session-established]");

      await clearDraft();
      trackFunnelEvent("user_registered");
      toast({ title: "تم التسجيل بنجاح! 🎉" });

      setSubmitPhase("navigate-welcome");
      console.log("[SUBMIT:navigate-welcome]");
      navigate("/welcome", { replace: true });
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("[SUBMIT:exception]", err);
      toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ غير متوقع" });
      setSubmitPhase("exception");
    }
    setLoading(false);
  };

  if (authLoading) {
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
                  onFocus={() => console.log("[FOCUS:firstName]", { firstName: form.firstName })}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label>اللقب</Label>
                <Input
                  value={form.fourthName}
                  onChange={(e) => updateField("fourthName", e.target.value)}
                  onFocus={() => console.log("[FOCUS:fourthName]", { fourthName: form.fourthName })}
                  autoComplete="off"
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
                  onFocus={() => console.log("[FOCUS:phoneNumber]", { firstName: form.firstName, fourthName: form.fourthName })}
                  className="text-left font-mono"
                  dir="ltr"
                  maxLength={9}
                  autoComplete="off"
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
                  tracedSetForm("universitySelect", (prev) => ({
                    ...prev,
                    universityId: v,
                    collegeId: "",
                    majorId: "",
                  }));
                  setFormTouched(true);
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
                autoComplete="off"
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
                  tracedSetForm("collegeSelect", (prev) => ({
                    ...prev,
                    collegeId: v,
                    majorId: "",
                  }));
                  setFormTouched(true);
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

            {formTouched && !isFormValid && missingFields.length > 0 && (
              <p className="text-xs text-destructive text-center">
                أكمل: {missingFields.join("، ")}
              </p>
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
            <p className="text-center text-[10px] text-muted-foreground/50 mt-1">v3.0-debug</p>
          </CardContent>
        </Card>

        {/* Debug panel — visible on device */}
        <RegisterDebugPanel
          form={form}
          validationChecks={validationChecks}
          isFormValid={isFormValid}
          loading={loading}
          submitPhase={submitPhase}
          lastSource={lastSource}
          mountCount={mountCount.current}
          viewportH={viewportH}
          kbVisible={kbVisible}
          traceLog={traceLog}
        />
      </div>
    </div>
  );
};

export default Register;
