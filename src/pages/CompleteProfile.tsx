import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GOVERNORATES = [
  "أمانة العاصمة", "عدن", "تعز", "الحديدة", "إب", "ذمار", "حجة",
  "صعدة", "عمران", "صنعاء", "المحويت", "ريمة", "البيضاء", "مأرب",
  "الجوف", "شبوة", "حضرموت", "المهرة", "أبين", "لحج", "الضالع", "سقطرى",
];

type University = { id: string; name_ar: string };
type College = { id: string; name_ar: string };
type Major = { id: string; name_ar: string };

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [showPhone, setShowPhone] = useState(false);

  // Step 1 fields
  const [firstName, setFirstName] = useState("");
  const [fourthName, setFourthName] = useState("");
  const [phone, setPhone] = useState("");
  const [governorate, setGovernorate] = useState("");

  // Step 2 fields
  const [universities, setUniversities] = useState<University[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [universityId, setUniversityId] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [majorId, setMajorId] = useState("");

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      // Show phone field only for email/Google signups (not phone auth)
      const provider = session.user.app_metadata?.provider;
      const hasPhone = !!session.user.phone;
      setShowPhone(!hasPhone && provider !== 'phone');

      const { data: student } = await supabase
        .from("students")
        .select("id, first_name, fourth_name, governorate, major_id, phone")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (student?.major_id) {
        navigate("/dashboard");
        return;
      }

      if (student) {
        setStudentId(student.id);
        if (student.first_name) setFirstName(student.first_name);
        if (student.fourth_name) setFourthName(student.fourth_name);
        if (student.governorate) setGovernorate(student.governorate);
        if (student.phone) setPhone(student.phone);
      }
      setCheckingAuth(false);
    };
    check();
  }, [navigate]);

  // Load universities
  useEffect(() => {
    supabase
      .from("universities")
      .select("id, name_ar")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => setUniversities(data || []));
  }, []);

  // Load colleges when university changes
  useEffect(() => {
    if (!universityId) { setColleges([]); setCollegeId(""); setMajorId(""); return; }
    supabase
      .from("colleges")
      .select("id, name_ar")
      .eq("university_id", universityId)
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => { setColleges(data || []); setCollegeId(""); setMajorId(""); });
  }, [universityId]);

  // Load majors when college changes
  useEffect(() => {
    if (!collegeId) { setMajors([]); setMajorId(""); return; }
    supabase
      .from("majors")
      .select("id, name_ar")
      .eq("college_id", collegeId)
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => { setMajors(data || []); setMajorId(""); });
  }, [collegeId]);

  const handleSubmit = async () => {
    if (!studentId) return;
    setLoading(true);
    const { error } = await supabase
      .from("students")
      .update({
        first_name: firstName,
        fourth_name: fourthName,
        phone: phone || null,
        governorate,
        university_id: universityId,
        college_id: collegeId,
        major_id: majorId,
      })
      .eq("id", studentId);

    if (error) {
      toast({ variant: "destructive", title: "خطأ", description: error.message });
      setLoading(false);
      return;
    }
    localStorage.removeItem("profile_skipped");
    toast({ title: "تم حفظ البيانات بنجاح" });
    navigate("/dashboard");
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">قَبُول</span>
          </div>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">أكمل بياناتك</CardTitle>
            <CardDescription>
              {step === 1 ? "الخطوة 1 من 2 — البيانات الشخصية" : "الخطوة 2 من 2 — البيانات الأكاديمية"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">الاسم الأول</label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="أدخل اسمك الأول"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">اللقب</label>
                  <Input
                    value={fourthName}
                    onChange={(e) => setFourthName(e.target.value)}
                    placeholder="أدخل لقبك"
                  />
                </div>
                {showPhone && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">رقم الجوال</label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="مثال: 777123456"
                      type="tel"
                      dir="ltr"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium">المحافظة</label>
                  <Select value={governorate} onValueChange={setGovernorate}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المحافظة" />
                    </SelectTrigger>
                    <SelectContent>
                      {GOVERNORATES.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!firstName || !fourthName || !governorate}
                  className="w-full py-5 text-base font-bold gap-2"
                >
                  التالي
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <button
                  onClick={() => {
                    localStorage.setItem("profile_skipped", "true");
                    navigate("/dashboard");
                  }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  تخطي الآن وإكمال لاحقاً
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">الجامعة</label>
                  <Select value={universityId} onValueChange={setUniversityId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الجامعة" />
                    </SelectTrigger>
                    <SelectContent>
                      {universities.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name_ar}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">الكلية</label>
                  <Select value={collegeId} onValueChange={setCollegeId} disabled={!universityId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الكلية" />
                    </SelectTrigger>
                    <SelectContent>
                      {colleges.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">التخصص</label>
                  <Select value={majorId} onValueChange={setMajorId} disabled={!collegeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر التخصص" />
                    </SelectTrigger>
                    <SelectContent>
                      {majors.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name_ar}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="py-5 px-4"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || !majorId}
                    className="flex-1 py-5 text-base font-bold"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ والمتابعة"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompleteProfile;
