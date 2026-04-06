import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, ChevronLeft, ChevronRight, Eye, EyeOff, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

const governorates = [
  "عدن", "تعز", "مأرب", "حضرموت", "شبوة", "أبين", "لحج", "الضالع",
  "صنعاء", "عمران", "ذمار", "إب", "الحديدة", "حجة", "صعدة", "المهرة",
  "سقطرى", "الجوف", "البيضاء", "المحويت", "ريمة",
];

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Data from database
  const [universities, setUniversities] = useState<Tables<"universities">[]>([]);
  const [colleges, setColleges] = useState<Tables<"colleges">[]>([]);
  const [majors, setMajors] = useState<Tables<"majors">[]>([]);

  // Step 1 - Account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2 - Personal
  const [firstName, setFirstName] = useState("");
  const [secondName, setSecondName] = useState("");
  const [thirdName, setThirdName] = useState("");
  const [fourthName, setFourthName] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [highSchoolGPA, setHighSchoolGPA] = useState("");
  const [coordinationNumber, setCoordinationNumber] = useState("");

  // Step 3 - Academic
  const [universityId, setUniversityId] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [majorId, setMajorId] = useState("");

  // Fetch universities on mount
  useEffect(() => {
    const fetchUniversities = async () => {
      const { data } = await supabase
        .from("universities")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (data) setUniversities(data);
    };
    fetchUniversities();
  }, []);

  // Fetch colleges when university changes
  useEffect(() => {
    if (!universityId) {
      setColleges([]);
      return;
    }
    const fetchColleges = async () => {
      const { data } = await supabase
        .from("colleges")
        .select("*")
        .eq("university_id", universityId)
        .eq("is_active", true)
        .order("display_order");
      if (data) setColleges(data);
    };
    fetchColleges();
  }, [universityId]);

  // Fetch majors when college changes
  useEffect(() => {
    if (!collegeId) {
      setMajors([]);
      return;
    }
    const fetchMajors = async () => {
      const { data } = await supabase
        .from("majors")
        .select("*")
        .eq("college_id", collegeId)
        .eq("is_active", true)
        .order("display_order");
      if (data) setMajors(data);
    };
    fetchMajors();
  }, [collegeId]);

  const passwordChecks = useMemo(() => {
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const passed = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
    const strength = passed <= 2 ? "weak" : passed <= 3 ? "medium" : "strong";
    const strengthPct = (passed / 5) * 100;
    return { hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial, passed, strength, strengthPct };
  }, [password]);

  const strengthLabel = { weak: "ضعيفة", medium: "متوسطة", strong: "قوية" } as const;
  const strengthColor = { weak: "bg-destructive", medium: "bg-yellow-500", strong: "bg-green-500" } as const;

  const validateStep1 = () => {
    if (!email || !password || !confirmPassword) {
      toast({ variant: "destructive", title: "يرجى ملء جميع الحقول" });
      return false;
    }
    if (password.length < 8) {
      toast({ variant: "destructive", title: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" });
      return false;
    }
    if (passwordChecks.strength === "weak") {
      toast({ variant: "destructive", title: "كلمة المرور ضعيفة جداً، حاول إضافة أحرف كبيرة وأرقام ورموز" });
      return false;
    }
    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "كلمة المرور غير متطابقة" });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!firstName || !secondName || !thirdName || !fourthName || !governorate || !highSchoolGPA) {
      toast({ variant: "destructive", title: "يرجى ملء جميع الحقول المطلوبة" });
      return false;
    }
    const gpa = parseFloat(highSchoolGPA);
    if (isNaN(gpa) || gpa < 0 || gpa > 100) {
      toast({ variant: "destructive", title: "يرجى إدخال معدل صحيح بين 0 و 100" });
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!universityId || !collegeId || !majorId) {
      toast({ variant: "destructive", title: "يرجى اختيار الجامعة والكلية والتخصص" });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) return;

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          first_name: firstName,
          second_name: secondName,
          third_name: thirdName,
          fourth_name: fourthName,
          governorate,
          high_school_gpa: parseFloat(highSchoolGPA),
          coordination_number: coordinationNumber,
          university_id: universityId,
          college_id: collegeId,
          major_id: majorId,
        },
      },
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "خطأ في التسجيل",
        description: error.message,
      });
    } else {
      toast({
        title: "تم التسجيل بنجاح!",
        description: "تحقق من بريدك الإلكتروني لتأكيد الحساب",
      });
      navigate("/login");
    }

    setLoading(false);
  };

  const stepIndicator = (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              s === step
                ? "bg-primary text-primary-foreground"
                : s < step
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {s}
          </div>
          {s < 3 && <div className={`w-8 h-0.5 ${s < step ? "bg-accent" : "bg-muted"}`} />}
        </div>
      ))}
    </div>
  );

  const stepLabels = ["بيانات الحساب", "البيانات الشخصية", "البيانات الأكاديمية"];

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">قَبُول</span>
          </Link>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">إنشاء حساب جديد</CardTitle>
            <CardDescription>{stepLabels[step - 1]}</CardDescription>
          </CardHeader>
          <CardContent>
            {stepIndicator}

            <form onSubmit={handleRegister} className="space-y-4">
              {/* Step 1: Account */}
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label>البريد الإلكتروني</Label>
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      dir="ltr"
                      className="text-left"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>كلمة المرور</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="8 أحرف على الأقل"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        dir="ltr"
                        className="pl-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {/* Password strength indicator */}
                    {password && (
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">قوة كلمة المرور:</span>
                          <span className={`text-xs font-bold ${passwordChecks.strength === "weak" ? "text-destructive" : passwordChecks.strength === "medium" ? "text-yellow-600" : "text-green-600"}`}>
                            {strengthLabel[passwordChecks.strength]}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${strengthColor[passwordChecks.strength]}`}
                            style={{ width: `${passwordChecks.strengthPct}%` }}
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-1 text-xs">
                          {[
                            { check: passwordChecks.hasMinLength, label: "8 أحرف على الأقل" },
                            { check: passwordChecks.hasUppercase, label: "حرف كبير (A-Z)" },
                            { check: passwordChecks.hasLowercase, label: "حرف صغير (a-z)" },
                            { check: passwordChecks.hasNumber, label: "رقم (0-9)" },
                            { check: passwordChecks.hasSpecial, label: "رمز خاص (!@#$...)" },
                          ].map(({ check, label }) => (
                            <div key={label} className="flex items-center gap-1.5">
                              {check ? (
                                <Check className="w-3.5 h-3.5 text-green-600" />
                              ) : (
                                <X className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                              <span className={check ? "text-green-600" : "text-muted-foreground"}>{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>تأكيد كلمة المرور</Label>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="أعد إدخال كلمة المرور"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      dir="ltr"
                      required
                    />
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <X className="w-3.5 h-3.5" /> كلمة المرور غير متطابقة
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Step 2: Personal */}
              {step === 2 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>الاسم الأول</Label>
                      <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>اسم الأب</Label>
                      <Input value={secondName} onChange={(e) => setSecondName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>اسم الجد</Label>
                      <Input value={thirdName} onChange={(e) => setThirdName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>اللقب</Label>
                      <Input value={fourthName} onChange={(e) => setFourthName(e.target.value)} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>معدل الثانوية (%)</Label>
                    <Input
                      type="number"
                      placeholder="مثال: 85.5"
                      value={highSchoolGPA}
                      onChange={(e) => setHighSchoolGPA(e.target.value)}
                      dir="ltr"
                      className="text-left"
                      min="0"
                      max="100"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>المحافظة</Label>
                    <Select value={governorate} onValueChange={setGovernorate}>
                      <SelectTrigger><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
                      <SelectContent>
                        {governorates.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>رقم التنسيق <span className="text-muted-foreground text-xs">(اختياري)</span></Label>
                    <Input
                      value={coordinationNumber}
                      onChange={(e) => setCoordinationNumber(e.target.value)}
                      placeholder="أدخل رقم التنسيق إن وجد"
                      dir="ltr"
                      className="text-left"
                    />
                  </div>
                </>
              )}

              {/* Step 3: Academic */}
              {step === 3 && (
                <>
                  <div className="space-y-2">
                    <Label>الجامعة</Label>
                    <select
                      value={universityId}
                      onChange={(e) => {
                        setUniversityId(e.target.value);
                        setCollegeId("");
                        setMajorId("");
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">اختر الجامعة</option>
                      {universities.map((u) => (
                        <option key={u.id} value={u.id}>{u.name_ar}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>الكلية</Label>
                    <select
                      value={collegeId}
                      onChange={(e) => {
                        setCollegeId(e.target.value);
                        setMajorId("");
                      }}
                      disabled={!universityId || colleges.length === 0}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">{!universityId ? "اختر الجامعة أولاً" : "اختر الكلية"}</option>
                      {colleges.map((c) => (
                        <option key={c.id} value={c.id}>{c.name_ar}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>التخصص</Label>
                    <select
                      value={majorId}
                      onChange={(e) => setMajorId(e.target.value)}
                      disabled={!collegeId || majors.length === 0}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">{!collegeId ? "اختر الكلية أولاً" : "اختر التخصص"}</option>
                      {majors.map((m) => (
                        <option key={m.id} value={m.id}>{m.name_ar}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-2">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    className="flex-1 py-5"
                  >
                    <ChevronRight className="w-4 h-4 ml-1" />
                    السابق
                  </Button>
                )}
                {step < 3 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 py-5 font-bold"
                  >
                    التالي
                    <ChevronLeft className="w-4 h-4 mr-1" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="flex-1 py-5 font-bold"
                    disabled={loading}
                  >
                    {loading ? "جاري التسجيل..." : "إنشاء الحساب"}
                  </Button>
                )}
              </div>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">لديك حساب بالفعل؟</span>{" "}
              <Link to="/login" className="text-primary font-semibold hover:underline">
                تسجيل الدخول
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
