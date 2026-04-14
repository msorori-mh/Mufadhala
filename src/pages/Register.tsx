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
import { useAuthContext } from "@/contexts/AuthContext";
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
import RegDebugPanel, { type DebugEvent } from "@/components/RegDebugPanel";

// ─── Debug helpers ───
const _ts = () => {
  const d = new Date();
  return `${d.toTimeString().slice(0, 8)}.${String(d.getMilliseconds()).padStart(3, "0")}`;
};

let _globalMountCount = 0;

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: authUser, loading: authLoading } = useAuthContext();
  const [loading, setLoading] = useState(false);

  // ─── Debug state ───
  const mountId = useRef(++_globalMountCount);
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const [viewportH, setViewportH] = useState(window.innerHeight);

  const pushEvent = useCallback((label: string, detail?: string) => {
    const ev: DebugEvent = { time: _ts(), label, detail };
    console.log(`[REG-DBG] ${ev.time} ${label}`, detail || "");
    setDebugEvents((prev) => [...prev.slice(-100), ev]);
  }, []);

  // Track mount/unmount
  useEffect(() => {
    pushEvent("MOUNT", `mountId=${mountId.current}`);
    return () => {
      console.log(`[REG-DBG] UNMOUNT mountId=${mountId.current}`);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Track viewport/keyboard changes
  useEffect(() => {
    const onResize = () => {
      const h = window.innerHeight;
      setViewportH(h);
      pushEvent("VIEWPORT_RESIZE", `h=${h}`);
    };
    window.addEventListener("resize", onResize);
    if (window.visualViewport) {
      const onVV = () => pushEvent("VISUAL_VIEWPORT", `h=${window.visualViewport!.height.toFixed(0)} oT=${window.visualViewport!.offsetTop.toFixed(0)}`);
      window.visualViewport.addEventListener("resize", onVV);
      return () => {
        window.removeEventListener("resize", onResize);
        window.visualViewport?.removeEventListener("resize", onVV);
      };
    }
    return () => window.removeEventListener("resize", onResize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Form state with traced setForm ───
  const [form, setFormRaw] = useState<RegistrationDraft>(emptyDraft);
  const draftLoaded = useRef(false);
  const [formTouched, setFormTouched] = useState(false);

  // Wrapper that traces every setForm call
  const setForm = useCallback(
    (updater: RegistrationDraft | ((prev: RegistrationDraft) => RegistrationDraft), source: string) => {
      setFormRaw((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        // Detect overwrites — fields that had values and became empty
        const cleared: string[] = [];
        const changed: string[] = [];
        (Object.keys(prev) as (keyof RegistrationDraft)[]).forEach((k) => {
          if (prev[k] !== next[k]) {
            changed.push(`${k}:"${prev[k]}"→"${next[k]}"`);
            if (prev[k] && !next[k]) cleared.push(k);
          }
        });
        if (changed.length > 0) {
          const label = cleared.length > 0
            ? `⚠️ SETFORM:${source}:OVERWRITE_DETECTED`
            : `SETFORM:${source}`;
          const detail = changed.join(", ");
          console.log(`[REG-DBG] ${_ts()} ${label}`, detail);
          setDebugEvents((evs) => [...evs.slice(-100), { time: _ts(), label, detail }]);
        }
        return next;
      });
    },
    [],
  );

  // Data
  const [universities, setUniversities] = useState<Tables<"universities">[]>([]);
  const [colleges, setColleges] = useState<Tables<"colleges">[]>([]);
  const [majors, setMajors] = useState<Tables<"majors">[]>([]);

  // Restore draft on mount
  useEffect(() => {
    let cancelled = false;
    pushEvent("EFFECT:draftRestore:start");
    loadDraft().then((draft) => {
      if (cancelled) { pushEvent("EFFECT:draftRestore:cancelled"); return; }
      if (draft) {
        pushEvent("EFFECT:draftRestore:apply", JSON.stringify(draft));
        setForm((prev) => {
          const merged = { ...prev };
          (Object.keys(draft) as (keyof RegistrationDraft)[]).forEach((key) => {
            if (!merged[key] && draft[key]) {
              merged[key] = draft[key];
            }
          });
          return merged;
        }, "draftRestore");
      } else {
        pushEvent("EFFECT:draftRestore:noDraft");
      }
      draftLoaded.current = true;
    });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save draft
  useEffect(() => {
    if (!draftLoaded.current) return;
    saveDraft(form);
  }, [form]);

  // Update a single field — traced
  const updateField = useCallback(
    <K extends keyof RegistrationDraft>(key: K, value: RegistrationDraft[K]) => {
      setFormTouched(true);
      setForm((prev) => ({ ...prev, [key]: value }), `updateField:${key}`);
    },
    [setForm],
  );

  // Redirect if already logged in
  useEffect(() => {
    pushEvent("EFFECT:authCheck", `authLoading=${authLoading} authUser=${!!authUser}`);
    if (authLoading) return;
    if (authUser) {
      pushEvent("EFFECT:authCheck:redirect");
      clearDraft();
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, authUser, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch universities
  useEffect(() => {
    pushEvent("EFFECT:fetchUniversities");
    supabase
      .from("universities")
      .select("*")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        if (data) setUniversities(data);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch colleges when university changes
  useEffect(() => {
    let cancelled = false;
    const uniId = form.universityId;
    pushEvent("EFFECT:fetchColleges", `uniId=${uniId}`);
    if (!uniId) {
      setColleges([]);
      setMajors([]);
      return;
    }
    supabase
      .from("colleges")
      .select("*")
      .eq("university_id", uniId)
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        if (cancelled) { pushEvent("EFFECT:fetchColleges:cancelled"); return; }
        pushEvent("EFFECT:fetchColleges:done", `count=${data?.length}`);
        setColleges(data || []);
        setForm((prev) => {
          if (prev.universityId !== uniId) return prev;
          if (!prev.collegeId) return prev;
          const stillValid = data?.some((c) => c.id === prev.collegeId);
          if (stillValid) return prev;
          return { ...prev, collegeId: "", majorId: "" };
        }, "collegeFetchValidation");
      });
    return () => { cancelled = true; };
  }, [form.universityId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch majors when college changes
  useEffect(() => {
    let cancelled = false;
    const colId = form.collegeId;
    pushEvent("EFFECT:fetchMajors", `colId=${colId}`);
    if (!colId) {
      setMajors([]);
      return;
    }
    supabase
      .from("majors")
      .select("*")
      .eq("college_id", colId)
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        if (cancelled) { pushEvent("EFFECT:fetchMajors:cancelled"); return; }
        pushEvent("EFFECT:fetchMajors:done", `count=${data?.length}`);
        setMajors(data || []);
        setForm((prev) => {
          if (prev.collegeId !== colId) return prev;
          if (!prev.majorId) return prev;
          const stillValid = data?.some((m) => m.id === prev.majorId);
          if (stillValid) return prev;
          return { ...prev, majorId: "" };
        }, "majorFetchValidation");
      });
    return () => { cancelled = true; };
  }, [form.collegeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const validationChecks = {
    firstName: !!form.firstName.trim(),
    fourthName: !!form.fourthName.trim(),
    phoneNumber: YEMEN_PHONE_REGEX.test(form.phoneNumber),
    governorate: !!form.governorate,
    universityId: !!form.universityId,
    collegeId: !!form.collegeId,
  };
  const isFormValid = Object.values(validationChecks).every(Boolean);

  useEffect(() => {
    if (formTouched) {
      console.log('[REG] validation:', validationChecks, 'valid:', isFormValid);
    }
  }, [form]); // eslint-disable-line react-hooks/exhaustive-deps

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

      const errorMsg = res.data?.error || (res.error ? "فشل في الاتصال بالخادم" : null);
      if (errorMsg) {
        toast({ variant: "destructive", title: "خطأ", description: errorMsg });
        setLoading(false);
        return;
      }

      const { access_token, refresh_token } = res.data.session;
      const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
      if (sessionError) {
        console.error("setSession error:", sessionError);
        toast({ variant: "destructive", title: "خطأ", description: "فشل في تثبيت الجلسة. يرجى المحاولة مرة أخرى." });
        setLoading(false);
        return;
      }

      await clearDraft();
      trackFunnelEvent("user_registered");
      toast({ title: "تم التسجيل بنجاح! 🎉" });
      navigate("/welcome", { replace: true });
    } catch {
      toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ غير متوقع" });
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
                  onFocus={() => pushEvent("FOCUS:firstName")}
                  onBlur={() => pushEvent("BLUR:firstName", `val="${form.firstName}"`)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>اللقب</Label>
                <Input
                  value={form.fourthName}
                  onChange={(e) => updateField("fourthName", e.target.value)}
                  onFocus={() => pushEvent("FOCUS:fourthName")}
                  onBlur={() => pushEvent("BLUR:fourthName", `val="${form.fourthName}"`)}
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
                  onFocus={() => pushEvent("FOCUS:phoneNumber", `firstName="${form.firstName}" fourthName="${form.fourthName}"`)}
                  onBlur={() => pushEvent("BLUR:phoneNumber", `val="${form.phoneNumber}"`)}
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
            <p className="text-center text-[10px] text-muted-foreground/50 mt-1">v2.1-dbg</p>
          </CardContent>
        </Card>
      </div>

      {/* Debug panel — dev only */}
      <RegDebugPanel
        form={form}
        events={debugEvents}
        mountCount={mountId.current}
        viewportH={viewportH}
      />
    </div>
  );
};

export default Register;
