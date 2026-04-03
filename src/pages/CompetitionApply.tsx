import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, ArrowRight, Loader2, Send, CheckCircle, Clock, XCircle } from "lucide-react";

const CompetitionApply = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [student, setStudent] = useState<any>(null);
  const [periods, setPeriods] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);

  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [choice1, setChoice1] = useState("");
  const [choice2, setChoice2] = useState("");
  const [choice3, setChoice3] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      setUserId(session.user.id);

      const [{ data: s }, { data: p }, { data: r }, { data: m }, { data: c }] = await Promise.all([
        supabase.from("students").select("*").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("competition_periods").select("*").eq("status", "open"),
        supabase.from("admission_requirements").select("*"),
        supabase.from("majors").select("*").eq("is_active", true),
        supabase.from("colleges").select("*").eq("is_active", true),
      ]);

      if (s) {
        setStudent(s);
        const { data: apps } = await supabase.from("competition_applications").select("*").eq("student_id", s.id);
        if (apps) setApplications(apps);
      }
      if (p) setPeriods(p);
      if (r) setRequirements(r);
      if (m) setMajors(m);
      if (c) setColleges(c);
      setLoading(false);
    };
    init();
  }, [navigate]);

  const getMajorName = (id: string) => majors.find((m: any) => m.id === id)?.name_ar || "-";
  const getCollegeName = (majorId: string) => {
    const major = majors.find((m: any) => m.id === majorId);
    return major ? colleges.find((c: any) => c.id === major.college_id)?.name_ar || "" : "";
  };

  const availableMajors = selectedPeriod
    ? requirements
        .filter((r: any) => r.competition_period_id === selectedPeriod)
        .filter((r: any) => !student?.gpa || student.gpa >= r.min_gpa)
    : [];

  const existingApp = applications.find((a: any) => a.competition_period_id === selectedPeriod);

  const handleSubmit = async () => {
    if (!choice1) { toast({ variant: "destructive", title: "يرجى اختيار الرغبة الأولى على الأقل" }); return; }
    if (!student) return;

    setSaving(true);
    const { error } = await supabase.from("competition_applications").insert({
      student_id: student.id,
      competition_period_id: selectedPeriod,
      choice_1_major_id: choice1 || null,
      choice_2_major_id: choice2 || null,
      choice_3_major_id: choice3 || null,
      rank_score: student.gpa,
    });

    if (error) {
      toast({ variant: "destructive", title: "خطأ في التقديم", description: error.message });
    } else {
      toast({ title: "تم تقديم الطلب بنجاح!" });
      const { data: apps } = await supabase.from("competition_applications").select("*").eq("student_id", student.id);
      if (apps) setApplications(apps);
    }
    setSaving(false);
  };

  const statusIcons: Record<string, any> = {
    pending: <Clock className="w-4 h-4 text-warning" />,
    accepted: <CheckCircle className="w-4 h-4 text-accent" />,
    rejected: <XCircle className="w-4 h-4 text-destructive" />,
    waitlisted: <Clock className="w-4 h-4 text-secondary" />,
  };

  const statusLabels: Record<string, string> = {
    pending: "قيد المراجعة",
    accepted: "مقبول",
    rejected: "مرفوض",
    waitlisted: "قائمة الانتظار",
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-primary text-white px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6" />
            <span className="text-lg font-bold">مفاضلة</span>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20 hover:text-white">
            <Link to="/dashboard"><ArrowRight className="w-4 h-4 ml-1" />العودة</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">التقديم على المفاضلة</h1>
          <p className="text-sm text-muted-foreground">اختر فترة المفاضلة ورغباتك من التخصصات</p>
        </div>

        {applications.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">طلباتك السابقة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {applications.map((app: any) => (
                <div key={app.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{periods.find((p: any) => p.id === app.competition_period_id)?.name_ar || "فترة سابقة"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      1. {getMajorName(app.choice_1_major_id)}
                      {app.choice_2_major_id && ` • 2. ${getMajorName(app.choice_2_major_id)}`}
                      {app.choice_3_major_id && ` • 3. ${getMajorName(app.choice_3_major_id)}`}
                    </p>
                    {app.accepted_major_id && (
                      <p className="text-xs text-accent font-semibold mt-1">القبول في: {getMajorName(app.accepted_major_id)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {statusIcons[app.status]}
                    <span className="text-xs">{statusLabels[app.status]}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {periods.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">تقديم طلب جديد</CardTitle>
              {student?.gpa && <CardDescription>معدلك: {student.gpa}%</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">فترة المفاضلة</label>
                <select value={selectedPeriod} onChange={(e) => { setSelectedPeriod(e.target.value); setChoice1(""); setChoice2(""); setChoice3(""); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">اختر الفترة</option>
                  {periods.filter((p: any) => !applications.some((a: any) => a.competition_period_id === p.id)).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name_ar} ({p.academic_year})</option>
                  ))}
                </select>
              </div>

              {selectedPeriod && availableMajors.length > 0 && !existingApp && (
                <>
                  {[
                    { label: "الرغبة الأولى *", value: choice1, setter: setChoice1 },
                    { label: "الرغبة الثانية", value: choice2, setter: setChoice2 },
                    { label: "الرغبة الثالثة", value: choice3, setter: setChoice3 },
                  ].map((item, i) => (
                    <div key={i} className="space-y-2">
                      <label className="text-sm font-medium">{item.label}</label>
                      <select value={item.value} onChange={(e) => item.setter(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="">اختر التخصص</option>
                        {availableMajors
                          .filter((r: any) => {
                            const id = r.major_id;
                            const others = [choice1, choice2, choice3].filter((_, idx) => idx !== i);
                            return !others.includes(id);
                          })
                          .map((r: any) => (
                            <option key={r.major_id} value={r.major_id}>
                              {getMajorName(r.major_id)} - {getCollegeName(r.major_id)} (الحد الأدنى: {r.min_gpa}%)
                            </option>
                          ))}
                      </select>
                    </div>
                  ))}
                  <Button onClick={handleSubmit} disabled={saving} className="w-full">
                    {saving ? <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جاري التقديم...</> : <><Send className="w-4 h-4 ml-2" />تقديم الطلب</>}
                  </Button>
                </>
              )}

              {selectedPeriod && availableMajors.length === 0 && (
                <p className="text-center text-muted-foreground py-4 text-sm">لا توجد تخصصات متاحة لمعدلك ({student?.gpa}%) في هذه الفترة</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">لا توجد فترات مفاضلة مفتوحة حالياً</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default CompetitionApply;
