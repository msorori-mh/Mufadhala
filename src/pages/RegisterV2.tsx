import { useState, useEffect } from "react";
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
import { GOVERNORATES, YEMEN_PHONE_REGEX } from "@/domain/constants";

interface FormState {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  governorate: string;
  universityId: string;
  collegeId: string;
  majorId: string;
  highSchoolGpa: string;
}

const emptyForm: FormState = {
  firstName: "",
  lastName: "",
  phoneNumber: "",
  governorate: "",
  universityId: "",
  collegeId: "",
  majorId: "",
  highSchoolGpa: "",
};

type University = { id: string; name_ar: string };
type College = { id: string; name_ar: string };
type Major = { id: string; name_ar: string };

const RegisterV2 = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);

  const [universities, setUniversities] = useState<University[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);

  // Load universities once
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

  // Load colleges when university changes
  useEffect(() => {
    if (!form.universityId) {
      setColleges([]);
      return;
    }
    supabase
      .from("colleges")
      .select("id, name_ar")
      .eq("university_id", form.universityId)
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        if (data) setColleges(data);
      });
  }, [form.universityId]);

  // Load majors when college changes
  useEffect(() => {
    if (!form.collegeId) {
      setMajors([]);
      return;
    }
    supabase
      .from("majors")
      .select("id, name_ar")
      .eq("college_id", form.collegeId)
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        if (data) setMajors(data);
      });
  }, [form.collegeId]);

  const handleUniversityChange = (value: string) => {
    setForm((prev) => ({ ...prev, universityId: value, collegeId: "", majorId: "" }));
  };

  const handleCollegeChange = (value: string) => {
    setForm((prev) => ({ ...prev, collegeId: value, majorId: "" }));
  };

  const isPhoneValid = YEMEN_PHONE_REGEX.test(form.phoneNumber);

  const isFormValid =
    form.firstName.trim() !== "" &&
    form.lastName.trim() !== "" &&
    isPhoneValid &&
    form.governorate !== "" &&
    form.universityId !== "" &&
    form.collegeId !== "";

  const handleSubmit = async () => {
    if (!isFormValid || loading) return;

    setLoading(true);
    try {
      const res = await supabase.functions.invoke("register-student", {
        body: {
          phone: form.phoneNumber,
          first_name: form.firstName.trim(),
          fourth_name: form.lastName.trim(),
          governorate: form.governorate,
          university_id: form.universityId,
          college_id: form.collegeId,
          major_id: form.majorId || null,
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
          {/* الاسم الأول */}
          <div className="space-y-1.5">
            <Label>الاسم الأول *</Label>
            <Input
              value={form.firstName}
              onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
            />
          </div>

          {/* اللقب */}
          <div className="space-y-1.5">
            <Label>اللقب *</Label>
            <Input
              value={form.lastName}
              onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
            />
          </div>

          {/* رقم الجوال */}
          <div className="space-y-1.5">
            <Label>رقم الجوال *</Label>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground shrink-0">967+</span>
              <Input
                type="tel"
                inputMode="numeric"
                maxLength={9}
                value={form.phoneNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 9);
                  setForm((prev) => ({ ...prev, phoneNumber: val }));
                }}
              />
            </div>
            {form.phoneNumber && !isPhoneValid && (
              <p className="text-xs text-destructive">رقم الجوال يجب أن يبدأ بـ 7 ويتكون من 9 أرقام</p>
            )}
          </div>

          {/* المحافظة */}
          <div className="space-y-1.5">
            <Label>المحافظة *</Label>
            <NativeSelect
              value={form.governorate}
              onValueChange={(v) => setForm((prev) => ({ ...prev, governorate: v }))}
              placeholder="اختر المحافظة"
              options={GOVERNORATES.map((g) => ({ value: g, label: g }))}
            />
          </div>

          {/* الجامعة */}
          <div className="space-y-1.5">
            <Label>الجامعة *</Label>
            <NativeSelect
              value={form.universityId}
              onValueChange={handleUniversityChange}
              placeholder="اختر الجامعة"
              options={universities.map((u) => ({ value: u.id, label: u.name_ar }))}
            />
          </div>

          {/* الكلية */}
          <div className="space-y-1.5">
            <Label>الكلية *</Label>
            <NativeSelect
              value={form.collegeId}
              onValueChange={handleCollegeChange}
              placeholder="اختر الكلية"
              disabled={!form.universityId}
              options={colleges.map((c) => ({ value: c.id, label: c.name_ar }))}
            />
          </div>

          {/* التخصص */}
          {majors.length > 0 && (
            <div className="space-y-1.5">
              <Label>التخصص</Label>
              <NativeSelect
                value={form.majorId}
                onValueChange={(v) => setForm((prev) => ({ ...prev, majorId: v }))}
                placeholder="اختر التخصص"
                options={majors.map((m) => ({ value: m.id, label: m.name_ar }))}
              />
            </div>
          )}

          {/* معدل الثانوية */}
          <div className="space-y-1.5">
            <Label>معدل الثانوية العامة</Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              max="100"
              value={form.highSchoolGpa}
              onChange={(e) => setForm((prev) => ({ ...prev, highSchoolGpa: e.target.value }))}
            />
          </div>

          {/* Submit */}
          <Button
            className="w-full"
            size="lg"
            disabled={!isFormValid || loading}
            onClick={handleSubmit}
          >
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

export default RegisterV2;
