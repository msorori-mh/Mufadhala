import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { GraduationCap, ArrowRight, User, School, Phone, Save, Loader2, Pencil, ShieldCheck, Send } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

const GOVERNORATES = [
  "أمانة العاصمة", "عدن", "تعز", "الحديدة", "إب", "ذمار", "حجة",
  "صعدة", "عمران", "صنعاء", "المحويت", "ريمة", "البيضاء", "مأرب",
  "الجوف", "شبوة", "حضرموت", "المهرة", "أبين", "لحج", "الضالع", "سقطرى",
];

const YEMEN_PHONE_REGEX = /^7[0-9]{8}$/;
const isValidYemeniPhone = (p: string) => !p || YEMEN_PHONE_REGEX.test(p);

const StudentProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalPhone, setOriginalPhone] = useState("");
  const [phoneEditing, setPhoneEditing] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Student data
  const [firstName, setFirstName] = useState("");
  const [secondName, setSecondName] = useState("");
  const [thirdName, setThirdName] = useState("");
  const [fourthName, setFourthName] = useState("");
  const [phone, setPhone] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [gpa, setGpa] = useState("");
  const [coordinationNumber, setCoordinationNumber] = useState("");

  // Academic
  const [universityId, setUniversityId] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [majorId, setMajorId] = useState("");

  // Reference data
  const [universities, setUniversities] = useState<Tables<"universities">[]>([]);
  const [colleges, setColleges] = useState<Tables<"colleges">[]>([]);
  const [majors, setMajors] = useState<Tables<"majors">[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }

    const init = async () => {
      const { data: studentData } = await supabase
        .from("students")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (studentData) {
        setFirstName(studentData.first_name || "");
        setSecondName(studentData.second_name || "");
        setThirdName(studentData.third_name || "");
        setFourthName(studentData.fourth_name || "");
        setPhone(studentData.phone || "");
        setOriginalPhone(studentData.phone || "");
        setGovernorate(studentData.governorate || "");
        setGpa(studentData.gpa?.toString() || "");
        setCoordinationNumber(studentData.coordination_number || "");
        setUniversityId(studentData.university_id || "");
        setCollegeId(studentData.college_id || "");
        setMajorId(studentData.major_id || "");
      }

      const { data: uniData } = await supabase
        .from("universities").select("*").eq("is_active", true).order("display_order");
      if (uniData) setUniversities(uniData);

      setLoading(false);
    };
    init();
  }, [navigate]);

  // Fetch colleges when university changes
  useEffect(() => {
    if (!universityId) { setColleges([]); return; }
    supabase.from("colleges").select("*")
      .eq("university_id", universityId).eq("is_active", true).order("display_order")
      .then(({ data }) => { if (data) setColleges(data); });
  }, [universityId]);

  // Fetch majors when college changes
  useEffect(() => {
    if (!collegeId) { setMajors([]); return; }
    supabase.from("majors").select("*")
      .eq("college_id", collegeId).eq("is_active", true).order("display_order")
      .then(({ data }) => { if (data) setMajors(data); });
  }, [collegeId]);

  // OTP cooldown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  const phoneChanged = phone !== originalPhone;

  const handleSendOtp = async () => {
    if (!phone || !isValidYemeniPhone(phone)) return;
    setSendingOtp(true);
    try {
      const res = await supabase.functions.invoke("send-otp", { body: { phone } });
      if (res.error || res.data?.error) {
        const retryAfter = res.data?.retryAfter;
        if (retryAfter) setOtpCooldown(retryAfter);
        toast({ variant: "destructive", title: "خطأ", description: res.data?.error || "فشل إرسال رمز التحقق" });
      } else {
        setOtpSent(true);
        setOtpCooldown(60);
        toast({ title: "تم إرسال رمز التحقق إلى رقمك الجديد" });
      }
    } catch {
      toast({ variant: "destructive", title: "خطأ غير متوقع" });
    }
    setSendingOtp(false);
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) return;
    setVerifyingOtp(true);
    try {
      const res = await supabase.functions.invoke("verify-otp", {
        body: { phone, code: otpCode },
      });
      if (res.error || res.data?.error) {
        toast({ variant: "destructive", title: "رمز التحقق غير صحيح أو منتهي الصلاحية" });
      } else {
        setPhoneVerified(true);
        toast({ title: "تم التحقق من الرقم بنجاح ✅" });
      }
    } catch {
      toast({ variant: "destructive", title: "خطأ غير متوقع" });
    }
    setVerifyingOtp(false);
  };

  const resetPhoneEdit = () => {
    setPhone(originalPhone);
    setPhoneEditing(false);
    setOtpSent(false);
    setOtpCode("");
    setPhoneVerified(false);
  };

  const handleSave = async () => {
    if (!user) return;

    if (!firstName || !fourthName) {
      toast({ variant: "destructive", title: "يرجى إدخال الاسم الأول واللقب على الأقل" });
      return;
    }

    if (phone && !isValidYemeniPhone(phone)) {
      toast({ variant: "destructive", title: "رقم الجوال غير صحيح", description: "يجب أن يبدأ بـ 7 ويتكون من 9 أرقام" });
      return;
    }

    // Only require OTP when CHANGING an existing phone, not when entering for the first time
    if (phoneChanged && phone && originalPhone && !phoneVerified) {
      toast({ variant: "destructive", title: "يرجى التحقق من رقم الجوال الجديد عبر رمز OTP أولاً" });
      return;
    }

    const gpaNum = gpa ? parseFloat(gpa) : null;
    if (gpa && (isNaN(gpaNum!) || gpaNum! < 0 || gpaNum! > 100)) {
      toast({ variant: "destructive", title: "يرجى إدخال معدل صحيح بين 0 و 100" });
      return;
    }

    setSaving(true);

    // Check phone uniqueness before saving
    if (phone) {
      const { data: existing } = await supabase
        .from("students")
        .select("user_id")
        .eq("phone", phone)
        .neq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        toast({ variant: "destructive", title: "هذا الرقم مسجل بحساب آخر" });
        setSaving(false);
        return;
      }
    }

    const { error } = await supabase
      .from("students")
      .update({
        first_name: firstName,
        second_name: secondName || null,
        third_name: thirdName || null,
        fourth_name: fourthName,
        phone: phone || null,
        governorate: governorate || null,
        gpa: gpaNum,
        coordination_number: coordinationNumber || null,
        university_id: universityId || null,
        college_id: collegeId || null,
        major_id: majorId || null,
      })
      .eq("user_id", user.id);

    if (error) {
      const msg = error.message.includes("idx_students_phone_unique")
        ? "هذا الرقم مسجل بحساب آخر"
        : error.message;
      toast({ variant: "destructive", title: "خطأ في الحفظ", description: msg });
    } else {
      toast({ title: "تم حفظ البيانات بنجاح" });
      setOriginalPhone(phone);
      setPhoneEditing(false);
      setOtpSent(false);
      setOtpCode("");
      setPhoneVerified(false);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-primary text-white px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6" />
            <span className="text-lg font-bold">مُفَاضَلَة</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20 hover:text-white">
              <Link to="/dashboard">
                <ArrowRight className="w-4 h-4 ml-1" />
                العودة
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الملف الشخصي</h1>
          <p className="text-muted-foreground text-sm">عرض وتعديل بياناتك الشخصية والأكاديمية</p>
        </div>

        {/* Personal Info */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">البيانات الشخصية</CardTitle>
                <CardDescription className="text-xs">الاسم والمحافظة والمعدل</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">الاسم الأول</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">اللقب</Label>
                <Input value={fourthName} onChange={(e) => setFourthName(e.target.value)} />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Phone className="w-3 h-3" />
                رقم الجوال
              </Label>
              {originalPhone && !phoneEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={phone}
                    readOnly
                    dir="ltr"
                    className="text-left bg-muted cursor-not-allowed"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setPhoneEditing(true)}
                    title="تعديل الرقم"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value.replace(/\D/g, "").slice(0, 9));
                        setPhoneVerified(false);
                        setOtpSent(false);
                        setOtpCode("");
                      }}
                      placeholder="مثال: 777123456"
                      type="tel"
                      dir="ltr"
                      disabled={phoneVerified}
                      className={`text-left ${phone && !isValidYemeniPhone(phone) ? "border-destructive" : ""} ${phoneVerified ? "bg-muted" : ""}`}
                    />
                    {phoneChanged && phone && isValidYemeniPhone(phone) && !phoneVerified && originalPhone && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1"
                        disabled={sendingOtp || (otpCooldown > 0)}
                        onClick={handleSendOtp}
                      >
                        {sendingOtp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        {otpCooldown > 0 ? `${otpCooldown}ث` : otpSent ? "إعادة الإرسال" : "إرسال رمز"}
                      </Button>
                    )}
                    {phoneVerified && (
                      <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                  </div>

                  {phone && !isValidYemeniPhone(phone) && (
                    <p className="text-xs text-destructive">يجب أن يبدأ بـ 7 ويتكون من 9 أرقام</p>
                  )}

                  {otpSent && !phoneVerified && (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="أدخل رمز التحقق (6 أرقام)"
                        type="tel"
                        dir="ltr"
                        className="text-left font-mono tracking-widest"
                        maxLength={6}
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={verifyingOtp || otpCode.length !== 6}
                        onClick={handleVerifyOtp}
                        className="shrink-0 gap-1"
                      >
                        {verifyingOtp ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                        تحقق
                      </Button>
                    </div>
                  )}

                  {phoneEditing && originalPhone && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground"
                      onClick={resetPhoneEdit}
                    >
                      إلغاء التعديل
                    </Button>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">المحافظة</Label>
                <Select value={governorate} onValueChange={setGovernorate}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    {GOVERNORATES.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">معدل الثانوية (%)</Label>
                <Input
                  type="number"
                  value={gpa}
                  onChange={(e) => setGpa(e.target.value)}
                  dir="ltr"
                  className="text-left"
                  min="0" max="100" step="0.01"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">رقم التنسيق <span className="text-muted-foreground">(اختياري)</span></Label>
              <Input
                value={coordinationNumber}
                onChange={(e) => setCoordinationNumber(e.target.value)}
                dir="ltr"
                className="text-left"
              />
            </div>
          </CardContent>
        </Card>

        {/* Academic Info */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <School className="w-4 h-4 text-accent" />
              </div>
              <div>
                <CardTitle className="text-lg">البيانات الأكاديمية</CardTitle>
                <CardDescription className="text-xs">الجامعة والكلية والتخصص</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">الجامعة</Label>
              <Select value={universityId} onValueChange={(v) => { setUniversityId(v); setCollegeId(""); setMajorId(""); }}>
                <SelectTrigger><SelectValue placeholder="اختر الجامعة" /></SelectTrigger>
                <SelectContent>
                  {universities.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name_ar}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">الكلية</Label>
              <Select value={collegeId} onValueChange={(v) => { setCollegeId(v); setMajorId(""); }} disabled={!universityId}>
                <SelectTrigger><SelectValue placeholder={!universityId ? "اختر الجامعة أولاً" : "اختر الكلية"} /></SelectTrigger>
                <SelectContent>
                  {colleges.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {majors.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">التخصص <span className="text-muted-foreground">(اختياري)</span></Label>
                <Select value={majorId} onValueChange={setMajorId} disabled={!collegeId}>
                  <SelectTrigger><SelectValue placeholder="اختر التخصص" /></SelectTrigger>
                  <SelectContent>
                    {majors.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name_ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full py-5 font-bold text-base">
          {saving ? (
            <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري الحفظ...</>
          ) : (
            <><Save className="w-4 h-4 ml-2" />حفظ التعديلات</>
          )}
        </Button>
      </main>
    </div>
  );
};

export default StudentProfile;
