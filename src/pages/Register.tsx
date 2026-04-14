import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import NativeSelect from "@/components/NativeSelect";
import { Loader2, Rocket, Bug, ChevronDown, ChevronUp } from "lucide-react";
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
import { saveNativeSession } from "@/lib/nativeSessionStorage";
import { isNativePlatform } from "@/lib/capacitor";
import { GOVERNORATES, YEMEN_PHONE_REGEX } from "@/domain/constants";
import { trackFunnelEvent } from "@/lib/funnelTracking";

/* ─── APK Debug Panel v4 — keyboard/viewport/focus tracing ─── */
interface DebugLog {
  ts: number;
  tag: string;
  msg: string;
  critical?: boolean;
}

function RegDebugPanel({
  form,
  logs,
  mountCount,
  submitPhase,
  kbState,
  activeField,
}: {
  form: RegistrationDraft;
  logs: DebugLog[];
  mountCount: number;
  submitPhase: string;
  kbState: string;
  activeField: string;
}) {
  const [open, setOpen] = useState(false);
  const isNative = isNativePlatform();
  const [vh, setVh] = useState(window.innerHeight);
  const vvh = (window.visualViewport?.height ?? window.innerHeight).toFixed(0);

  useEffect(() => {
    const h = () => setVh(window.innerHeight);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  return (
    <div
      dir="ltr"
      className="fixed bottom-0 left-0 right-0 z-[99999] bg-black/90 text-green-400 text-[10px] font-mono"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center px-2 py-1 bg-amber-600 text-black font-bold text-xs"
      >
        <span>🐛 v4 {isNative ? "[APK]" : "[WEB]"} m:{mountCount} s:{submitPhase} vh:{vh} vv:{vvh} kb:{kbState} f:{activeField}</span>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>
      {open && (
        <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
          <div className="text-yellow-300">
            FORM: fn="{form.firstName}" ln="{form.fourthName}" ph="{form.phoneNumber}" gov="{form.governorate}"
          </div>
          <div className="border-t border-green-800 mt-1 pt-1 text-green-300">
            {logs.slice(-40).map((l, i) => (
              <div key={i} className={l.critical ? "text-red-400 font-bold" : ""}>
                <span className="text-gray-500">{new Date(l.ts).toLocaleTimeString()}</span>{" "}
                <span className="text-cyan-400">[{l.tag}]</span> {l.msg}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const PROTECTED_TEXT_FIELDS: (keyof RegistrationDraft)[] = ["firstName", "fourthName", "phoneNumber"];

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Unified form state — fully local, NO async hydration on native
  const [form, setFormRaw] = useState<RegistrationDraft>(emptyDraft);
  const draftLoaded = useRef(false);
  const formRef = useRef<RegistrationDraft>(emptyDraft); // always current
  const mountCount = useRef(0);
  const [submitPhase, setSubmitPhase] = useState("idle");
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  const [kbState, setKbState] = useState("hidden");
  const [activeField, setActiveField] = useState("none");
  const lastFormSnapshot = useRef<string>("");
  const lastEventRef = useRef<string>("init");
  const isNative = isNativePlatform();

  // ─── OVERWRITE GUARD: track which text fields user has manually typed into ───
  const userTouchedFields = useRef<Set<keyof RegistrationDraft>>(new Set());
  const updateSourceRef = useRef<"user" | "internal">("internal");

  // Guarded setForm: on native, prevents non-user overwrites of touched text fields
  const setForm: typeof setFormRaw = useCallback((updater) => {
    if (!isNative || updateSourceRef.current === "user") {
      setFormRaw(updater);
      return;
    }
    // Internal update on native → protect touched text fields
    setFormRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const guarded = { ...next };
      for (const field of PROTECTED_TEXT_FIELDS) {
        if (userTouchedFields.current.has(field) && prev[field] && !next[field]) {
          // BLOCK: internal logic trying to clear a user-typed field
          console.log(`[GUARD:BLOCKED] ${field} clear blocked! keeping "${prev[field]}"`);
          guarded[field] = prev[field];
        }
      }
      return guarded;
    });
  }, [isNative]);

  const log = useCallback((tag: string, msg: string, critical = false) => {
    console.log(`[${tag}] ${msg}`);
    setDebugLogs((prev) => [...prev.slice(-100), { ts: Date.now(), tag, msg, critical }]);
  }, []);

  // Keep formRef in sync + detect unexpected resets
  useEffect(() => {
    formRef.current = form;
    const snap = `${form.firstName}|${form.fourthName}|${form.phoneNumber}`;
    const prev = lastFormSnapshot.current;
    if (prev && prev !== snap) {
      const [pFn, pLn, pPh] = prev.split("|");
      // Detect if a non-empty field became empty without updateField
      if (pFn && !form.firstName) {
        log("CRITICAL:RESET", `firstName cleared! was="${pFn}" now="" lastEvent=${lastEventRef.current}`, true);
      }
      if (pLn && !form.fourthName) {
        log("CRITICAL:RESET", `fourthName cleared! was="${pLn}" now="" lastEvent=${lastEventRef.current}`, true);
      }
      if (pPh && !form.phoneNumber) {
        log("CRITICAL:RESET", `phoneNumber cleared! was="${pPh}" now="" lastEvent=${lastEventRef.current}`, true);
      }
    }
    lastFormSnapshot.current = snap;
  }, [form, log]);

  // Mount counter + scroll normalization
  useEffect(() => {
    mountCount.current += 1;
    log("LIFECYCLE", `Register mounted (count: ${mountCount.current}), isNative: ${isNative}`);
    // Normalize viewport on mount — prevent stale scroll position from triggering resize
    window.scrollTo(0, 0);
    return () => log("LIFECYCLE", "Register unmounting");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── PHASE 1: Keyboard events (Capacitor plugin) ───
  useEffect(() => {
    if (!isNative) return;
    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        const { Keyboard } = await import("@capacitor/keyboard");
        const listeners = await Promise.all([
          Keyboard.addListener("keyboardWillShow", (info) => {
            lastEventRef.current = "kb-willShow";
            log("KB:willShow", `height=${info.keyboardHeight} form: fn="${formRef.current.firstName}" ln="${formRef.current.fourthName}"`);
            setKbState("showing");
          }),
          Keyboard.addListener("keyboardDidShow", (info) => {
            lastEventRef.current = "kb-didShow";
            log("KB:didShow", `height=${info.keyboardHeight}`);
            setKbState("visible");
          }),
          Keyboard.addListener("keyboardWillHide", () => {
            lastEventRef.current = "kb-willHide";
            log("KB:willHide", `form: fn="${formRef.current.firstName}" ln="${formRef.current.fourthName}"`);
            setKbState("hiding");
          }),
          Keyboard.addListener("keyboardDidHide", () => {
            lastEventRef.current = "kb-didHide";
            log("KB:didHide", `form: fn="${formRef.current.firstName}" ln="${formRef.current.fourthName}"`);
            setKbState("hidden");
          }),
        ]);
        cleanup = () => listeners.forEach((l) => l.remove());
        log("KB:init", "Keyboard listeners registered");
      } catch (e: any) {
        log("KB:init", `FAILED: ${e.message}`);
      }
    })();
    return () => cleanup?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── PHASE 2: Viewport / resize trace ───
  useEffect(() => {
    let prevH = window.innerHeight;
    const onResize = () => {
      const newH = window.innerHeight;
      const delta = newH - prevH;
      if (Math.abs(delta) > 5) {
        lastEventRef.current = `resize-${delta}`;
        log("VIEWPORT:resize", `${prevH}→${newH} (Δ${delta}) form: fn="${formRef.current.firstName}" ln="${formRef.current.fourthName}"`);
      }
      prevH = newH;
    };
    window.addEventListener("resize", onResize);

    const vv = window.visualViewport;
    let prevVV = vv?.height ?? 0;
    const onVVResize = () => {
      const newVV = vv?.height ?? 0;
      const delta = Math.round(newVV - prevVV);
      if (Math.abs(delta) > 5) {
        lastEventRef.current = `vv-resize-${delta}`;
        log("VIEWPORT:visualViewport", `${prevVV.toFixed(0)}→${newVV.toFixed(0)} (Δ${delta})`);
      }
      prevVV = newVV;
    };
    vv?.addEventListener("resize", onVVResize);

    return () => {
      window.removeEventListener("resize", onResize);
      vv?.removeEventListener("resize", onVVResize);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── PHASE 3: Focus / blur trace (document level) ───
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      const name = el.getAttribute("placeholder") || el.tagName || "unknown";
      lastEventRef.current = `focus-${name}`;
      setActiveField(name.slice(0, 15));
      log("FOCUS:in", `"${name}" form: fn="${formRef.current.firstName}" ln="${formRef.current.fourthName}"`);
    };
    const onFocusOut = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      const name = el.getAttribute("placeholder") || el.tagName || "unknown";
      lastEventRef.current = `blur-${name}`;
      setActiveField("none");
      log("FOCUS:out", `"${name}" form: fn="${formRef.current.firstName}" ln="${formRef.current.fourthName}"`);
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Data
  const [universities, setUniversities] = useState<Tables<"universities">[]>([]);
  const [colleges, setColleges] = useState<Tables<"colleges">[]>([]);
  const [majors, setMajors] = useState<Tables<"majors">[]>([]);

  // ─── STABILIZATION: Draft restore ───
  // On NATIVE: SKIP draft restore entirely to prevent async race conditions
  // On WEB: restore from localStorage (synchronous, safe)
  useEffect(() => {
    if (isNative) {
      log("FORM:draftRestore", "SKIPPED on native — stabilization mode");
      draftLoaded.current = true;
      return;
    }
    let cancelled = false;
    loadDraft().then((draft) => {
      if (cancelled) return;
      if (draft) {
        log("FORM:draftRestore", `Restored: ${JSON.stringify(draft)}`);
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
      draftLoaded.current = true;
    });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── STABILIZATION: Auto-save draft ───
  // On NATIVE: DISABLED — no Preferences writes during registration
  // On WEB: debounced save to localStorage
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!draftLoaded.current) return;
    if (isNative) return; // STABILIZATION: no async saves on native
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveDraft(form);
    }, 1000); // debounce 1s
    return () => clearTimeout(saveTimer.current);
  }, [form, isNative]);

  // Update a single field — marks source as "user" for text inputs
  const updateField = useCallback(
    <K extends keyof RegistrationDraft>(key: K, value: RegistrationDraft[K]) => {
      log(`FORM:updateField:${key}`, `"${value}"`);
      // Mark text fields as user-touched
      if (PROTECTED_TEXT_FIELDS.includes(key)) {
        userTouchedFields.current.add(key);
      }
      updateSourceRef.current = "user";
      setForm((prev) => {
        const next = { ...prev, [key]: value };
        log(`FORM:stateAfterUpdate:${key}`, `fn="${next.firstName}" ln="${next.fourthName}" ph="${next.phoneNumber}"`);
        return next;
      });
      // Reset source back to internal after microtask
      queueMicrotask(() => { updateSourceRef.current = "internal"; });
    },
    [log, setForm],
  );

  // Check session on mount
  useEffect(() => {
    log("NATIVE:initSession", "Checking session...");
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        log("NATIVE:initSession", "Session found → redirect to dashboard");
        clearDraft();
        navigate("/dashboard", { replace: true });
      } else {
        log("NATIVE:initSession", "No session → show form");
        setCheckingSession(false);
      }
    });
  }, [navigate, log]);

  // Fetch universities
  useEffect(() => {
    supabase
      .from("universities")
      .select("*")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        if (data) {
          setUniversities(data);
          log("DATA", `Universities loaded: ${data.length}`);
        }
      });
  }, [log]);

  // Fetch colleges when university changes
  useEffect(() => {
    if (!form.universityId) {
      setColleges([]);
      setMajors([]);
      return;
    }
    const currentUni = form.universityId;
    supabase
      .from("colleges")
      .select("*")
      .eq("university_id", form.universityId)
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        // Guard: ignore if university changed while loading
        if (formRef.current.universityId !== currentUni) return;
        setColleges(data || []);
        log("DATA", `Colleges loaded: ${data?.length || 0}`);
        if (data && formRef.current.collegeId) {
          const stillValid = data.some((c) => c.id === formRef.current.collegeId);
          if (!stillValid) {
            updateField("collegeId", "");
            updateField("majorId", "");
          }
        }
      });
  }, [form.universityId, updateField, log]);

  // Fetch majors when college changes
  useEffect(() => {
    if (!form.collegeId) {
      setMajors([]);
      return;
    }
    const currentCol = form.collegeId;
    supabase
      .from("majors")
      .select("*")
      .eq("college_id", form.collegeId)
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        if (formRef.current.collegeId !== currentCol) return;
        setMajors(data || []);
        log("DATA", `Majors loaded: ${data?.length || 0}`);
        if (data && formRef.current.majorId) {
          const stillValid = data.some((m) => m.id === formRef.current.majorId);
          if (!stillValid) {
            updateField("majorId", "");
          }
        }
      });
  }, [form.collegeId, updateField, log]);

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
    setSubmitPhase("validating");
    log("SUBMIT:start", JSON.stringify(formRef.current));

    // Timeout guard — never hang silently
    const submitTimeout = setTimeout(() => {
      log("SUBMIT:timeout", "Submit timed out after 30s");
      setLoading(false);
      setSubmitPhase("timeout");
      toast({ variant: "destructive", title: "انتهت المهلة", description: "يرجى المحاولة مرة أخرى" });
    }, 30000);

    try {
      setSubmitPhase("invoking-edge");
      log("SUBMIT:invoke-register-student", "Calling edge function...");

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

      log("SUBMIT:edge-response", `status: ${res.error ? "ERROR" : "OK"}, data: ${JSON.stringify(res.data?.error || "success")}`);

      const errorMsg = res.data?.error || (res.error ? "فشل في الاتصال بالخادم" : null);
      if (errorMsg) {
        clearTimeout(submitTimeout);
        toast({ variant: "destructive", title: "خطأ", description: errorMsg });
        setLoading(false);
        setSubmitPhase("error");
        return;
      }

      setSubmitPhase("session-sync");
      log("SUBMIT:session-sync", "Setting session...");
      const { access_token, refresh_token } = res.data.session;
      const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });

      if (sessionError) {
        clearTimeout(submitTimeout);
        log("SUBMIT:session-sync", `ERROR: ${sessionError.message}`);
        toast({ variant: "destructive", title: "خطأ", description: "فشل في تثبيت الجلسة. يرجى المحاولة مرة أخرى." });
        setLoading(false);
        setSubmitPhase("session-error");
        return;
      }

      // Save session to native storage EXPLICITLY (don't rely on onAuthStateChange)
      if (isNative) {
        log("NATIVE:saveNativeSession", "Saving tokens to Preferences...");
        await saveNativeSession(access_token, refresh_token);
        log("NATIVE:saveNativeSession", "Done");
      }

      setSubmitPhase("cleanup");
      log("SUBMIT:cleanup", "Clearing draft...");
      await clearDraft();
      trackFunnelEvent("user_registered");

      clearTimeout(submitTimeout);
      setSubmitPhase("navigating");
      log("SUBMIT:navigate", "→ /welcome");
      toast({ title: "تم التسجيل بنجاح! 🎉" });
      navigate("/welcome", { replace: true });
    } catch (err: any) {
      clearTimeout(submitTimeout);
      log("SUBMIT:error", err?.message || "unknown");
      toast({ variant: "destructive", title: "خطأ", description: "حدث خطأ غير متوقع" });
      setSubmitPhase("catch-error");
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
            <p className="text-center text-[10px] text-muted-foreground/50 mt-1">v5.0-field-guard</p>
          </CardContent>
        </Card>
      </div>

      {/* APK Debug Panel — always visible */}
      <RegDebugPanel
        form={form}
        logs={debugLogs}
        mountCount={mountCount.current}
        submitPhase={submitPhase}
        kbState={kbState}
        activeField={activeField}
      />
    </div>
  );
};

export default Register;
