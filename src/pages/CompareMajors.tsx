import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, ArrowRight, Search, Loader2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

const CompareMajors = () => {
  const [requirements, setRequirements] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterUni, setFilterUni] = useState("");

  useEffect(() => {
    const fetch = async () => {
      const [{ data: r }, { data: m }, { data: c }, { data: u }, { data: p }] = await Promise.all([
        supabase.from("admission_requirements").select("*"),
        supabase.from("majors").select("*").eq("is_active", true),
        supabase.from("colleges").select("*").eq("is_active", true),
        supabase.from("universities").select("*").eq("is_active", true).order("display_order"),
        supabase.from("competition_periods").select("*").order("created_at", { ascending: false }).limit(1),
      ]);
      if (r) setRequirements(r);
      if (m) setMajors(m);
      if (c) setColleges(c);
      if (u) setUniversities(u);
      if (p) setPeriods(p);
      setLoading(false);
    };
    fetch();
  }, []);

  const latestPeriod = periods[0];
  const latestReqs = latestPeriod ? requirements.filter((r) => r.competition_period_id === latestPeriod.id) : [];

  const getCollege = (majorId: string) => {
    const major = majors.find((m) => m.id === majorId);
    return major ? colleges.find((c) => c.id === major.college_id) : null;
  };

  const getUniName = (collegeId: string) => {
    const college = colleges.find((c) => c.id === collegeId);
    return college ? universities.find((u) => u.id === college.university_id)?.name_ar || "" : "";
  };

  const enriched = latestReqs.map((r) => {
    const major = majors.find((m) => m.id === r.major_id);
    const college = major ? colleges.find((c) => c.id === major.college_id) : null;
    const uni = college ? universities.find((u) => u.id === college.university_id) : null;
    return { ...r, majorName: major?.name_ar || "", collegeName: college?.name_ar || "", uniName: uni?.name_ar || "", uniId: uni?.id || "" };
  });

  const filtered = enriched.filter((item) => {
    if (search && !item.majorName.includes(search) && !item.collegeName.includes(search)) return false;
    if (filterUni && item.uniId !== filterUni) return false;
    return true;
  }).sort((a, b) => b.min_gpa - a.min_gpa);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-primary text-white px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6" />
            <span className="text-lg font-bold">مفاضلة</span>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20 hover:text-white">
            <Link to="/dashboard"><ArrowRight className="w-4 h-4 ml-1" />العودة</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">مقارنة التخصصات</h1>
          <p className="text-sm text-muted-foreground">
            {latestPeriod ? `${latestPeriod.name_ar} - ${latestPeriod.academic_year}` : "لا توجد فترة مفاضلة"}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث بالتخصص أو الكلية..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
          </div>
          <select value={filterUni} onChange={(e) => setFilterUni(e.target.value)} className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[150px]">
            <option value="">جميع الجامعات</option>
            {universities.map((u) => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
          </select>
        </div>

        {filtered.length > 0 ? (
          <div className="space-y-2">
            {filtered.map((item) => (
              <Card key={item.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{item.majorName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.collegeName} • {item.uniName}</p>
                    </div>
                    <div className="text-left space-y-1">
                      <Badge variant="outline" className="text-xs">الحد الأدنى: {item.min_gpa}%</Badge>
                      <p className="text-[10px] text-muted-foreground">{item.available_seats} مقعد</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="py-8 text-center"><p className="text-muted-foreground">لا توجد بيانات متاحة</p></CardContent></Card>
        )}
      </main>
    </div>
  );
};

export default CompareMajors;
