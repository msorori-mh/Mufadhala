import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { GraduationCap, ArrowRight, User, School, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

const governorates = [
  "عدن", "تعز", "مأرب", "حضرموت", "شبوة", "أبين", "لحج", "الضالع",
  "صنعاء", "عمران", "ذمار", "إب", "الحديدة", "حجة", "صعدة", "المهرة",
  "سقطرى", "الجوف", "البيضاء", "المحويت", "ريمة",
];

const StudentProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Student data
  const [student, setStudent] = useState<Tables<"students"> | null>(null);
  const [firstName, setFirstName] = useState("");
  const [secondName, setSecondName] = useState("");
  const [thirdName, setThirdName] = useState("");
  const [fourthName, setFourthName] = useState("");
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

  // University/college names for display
  const [universityName, setUniversityName] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [majorName, setMajorName] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setUserId(session.user.id);

      // Fetch student data
      const { data: studentData } = await supabase
        .from("students")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (studentData) {
        setStudent(studentData);
        setFirstName(studentData.first_name || "");
        setSecondName(studentData.second_name || "");
        setThirdName(studentData.third_name || "");
        setFourthName(studentData.fourth_name || "");
        setGovernorate(studentData.governorate || "");
        setGpa(studentData.gpa?.toString() || "");
        setCoordinationNumber(studentData.coordination_number || "");
        setUniversityId(studentData.university_id || "");
        setCollegeId(studentData.college_id || "");
        setMajorId(studentData.major_id || "");
      }

      // Fetch universities
      const { data: uniData } = await supabase
        .from("universities")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (uniData) setUniversities(uniData);

      setLoading(false);
    };

    init();
  }, [navigate]);

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
    // Set university name
    const uni = universities.find((u) => u.id === universityId);
    setUniversityName(uni?.name_ar || "");
  }, [universityId, universities]);

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
    const col = colleges.find((c) => c.id === collegeId);
    setCollegeName(col?.name_ar || "");
  }, [collegeId, colleges]);

  useEffect(() => {
    const maj = majors.find((m) => m.id === majorId);
    setMajorName(maj?.name_ar || "");
  }, [majorId, majors]);

  const handleSave = async () => {
    if (!userId) return;

    if (!firstName || !secondName || !thirdName || !fourthName) {
      toast({ variant: "destructive", title: "يرجى إدخال الاسم الرباعي كاملاً" });
      return;
    }

    const gpaNum = gpa ? parseFloat(gpa) : null;
    if (gpa && (isNaN(gpaNum!) || gpaNum! < 0 || gpaNum! > 100)) {
      toast({ variant: "destructive", title: "يرجى إدخال معدل صحيح بين 0 و 100" });
      return;
    }

    setSaving(true);

    const updateData = {
      first_name: firstName,
      second_name: secondName,
      third_name: thirdName,
      fourth_name: fourthName,
      governorate: governorate || null,
      gpa: gpaNum,
      coordination_number: coordinationNumber || null,
      university_id: universityId || null,
      college_id: collegeId || null,
      major_id: majorId || null,
    };

    const { error } = await supabase
      .from("students")
      .update(updateData)
      .eq("user_id", userId);

    if (error) {
      toast({
        variant: "destructive",
        title: "خطأ في الحفظ",
        description: error.message,
      });
    } else {
      toast({ title: "تم حفظ البيانات بنجاح" });
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
      {/* Header */}
      <header className="gradient-primary text-white px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6" />
            <span className="text-lg font-bold">مفاضلة</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-white hover:bg-white/20 hover:text-white"
          >
            <Link to="/dashboard">
              <ArrowRight className="w-4 h-4 ml-1" />
              العودة
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
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
                <CardDescription className="text-xs">الاسم الرباعي والمحافظة والمعدل</CardDescription>
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
                <Label className="text-xs">اسم الأب</Label>
                <Input value={secondName} onChange={(e) => setSecondName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">اسم الجد</Label>
                <Input value={thirdName} onChange={(e) => setThirdName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">اللقب</Label>
                <Input value={fourthName} onChange={(e) => setFourthName(e.target.value)} />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">المحافظة</Label>
                <Select value={governorate} onValueChange={setGovernorate}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    {governorates.map((g) => (
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
                  min="0"
                  max="100"
                  step="0.01"
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

            <div className="space-y-1.5">
              <Label className="text-xs">الكلية</Label>
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

            <div className="space-y-1.5">
              <Label className="text-xs">التخصص</Label>
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
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-5 font-bold text-base"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              جاري الحفظ...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 ml-2" />
              حفظ التعديلات
            </>
          )}
        </Button>
      </main>
    </div>
  );
};

export default StudentProfile;