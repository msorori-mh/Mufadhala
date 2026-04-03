import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useModeratorScope } from "@/hooks/useModeratorScope";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Pencil, Trash2, Eye } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const AdminStudents = () => {
  const { loading: authLoading, isAdmin, user } = useAuth("moderator");
  const { toast } = useToast();
  const [students, setStudents] = useState<Tables<"students">[]>([]);
  const [universities, setUniversities] = useState<Tables<"universities">[]>([]);
  const [colleges, setColleges] = useState<Tables<"colleges">[]>([]);
  const [majors, setMajors] = useState<Tables<"majors">[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"students"> | null>(null);
  const [viewing, setViewing] = useState<Tables<"students"> | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [secondName, setSecondName] = useState("");
  const [thirdName, setThirdName] = useState("");
  const [fourthName, setFourthName] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [gpa, setGpa] = useState("");
  const [coordinationNumber, setCoordinationNumber] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [majorId, setMajorId] = useState("");

  const fetchData = async () => {
    const [{ data: s }, { data: u }, { data: c }, { data: m }] = await Promise.all([
      supabase.from("students").select("*").order("created_at", { ascending: false }),
      supabase.from("universities").select("*").order("display_order"),
      supabase.from("colleges").select("*").order("display_order"),
      supabase.from("majors").select("*").order("display_order"),
    ]);
    if (s) setStudents(s);
    if (u) setUniversities(u);
    if (c) setColleges(c);
    if (m) setMajors(m);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading]);

  const getUniName = (id: string | null) => id ? universities.find((u) => u.id === id)?.name_ar || "-" : "-";
  const getCollegeName = (id: string | null) => id ? colleges.find((c) => c.id === id)?.name_ar || "-" : "-";
  const getMajorName = (id: string | null) => id ? majors.find((m) => m.id === id)?.name_ar || "-" : "-";
  const getFullName = (s: Tables<"students">) => [s.first_name, s.second_name, s.third_name, s.fourth_name].filter(Boolean).join(" ");

  const { loading: scopeLoading, getAllowedMajorIds } = useModeratorScope(
    user?.id, isAdmin, universities, colleges, majors
  );

  const scopedStudents = useMemo(() => {
    const allowed = getAllowedMajorIds();
    if (!allowed) return students; // null = no restriction
    return students.filter((s) => s.major_id && allowed.has(s.major_id));
  }, [students, getAllowedMajorIds, isAdmin]);

  const filteredColleges = universityId ? colleges.filter((c) => c.university_id === universityId) : colleges;
  const filteredMajors = collegeId ? majors.filter((m) => m.college_id === collegeId) : majors;

  const filtered = scopedStudents.filter((s) => {
    if (!search) return true;
    const name = getFullName(s).toLowerCase();
    return name.includes(search.toLowerCase()) || s.coordination_number?.includes(search);
  });

  const openEdit = (s: Tables<"students">) => {
    setEditing(s);
    setFirstName(s.first_name || "");
    setSecondName(s.second_name || "");
    setThirdName(s.third_name || "");
    setFourthName(s.fourth_name || "");
    setGovernorate(s.governorate || "");
    setGpa(s.gpa?.toString() || "");
    setCoordinationNumber(s.coordination_number || "");
    setUniversityId(s.university_id || "");
    setCollegeId(s.college_id || "");
    setMajorId(s.major_id || "");
    setDialogOpen(true);
  };

  const openView = (s: Tables<"students">) => {
    setViewing(s);
    setViewDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    const payload = {
      first_name: firstName || null,
      second_name: secondName || null,
      third_name: thirdName || null,
      fourth_name: fourthName || null,
      governorate: governorate || null,
      gpa: gpa ? Number(gpa) : null,
      coordination_number: coordinationNumber || null,
      university_id: universityId || null,
      college_id: collegeId || null,
      major_id: majorId || null,
    };
    const { error } = await supabase.from("students").update(payload).eq("id", editing.id);
    if (error) toast({ variant: "destructive", title: error.message });
    else toast({ title: "تم تحديث بيانات الطالب" });
    setSaving(false);
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطالب؟")) return;
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: error.message });
    else { toast({ title: "تم الحذف" }); fetchData(); }
  };

  if (authLoading || loading || scopeLoading) return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">الطلاب</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} طالب</p>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم أو رقم التنسيق..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
        </div>

        <div className="space-y-2">
          {filtered.map((s) => (
            <Card key={s.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm">{getFullName(s)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getUniName(s.university_id)} • {getMajorName(s.major_id)}
                    </p>
                    {s.governorate && <p className="text-xs text-muted-foreground">{s.governorate}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    {s.gpa && <Badge variant="secondary" className="text-xs">{s.gpa}%</Badge>}
                    <Button variant="ghost" size="icon" onClick={() => openView(s)}><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="w-4 h-4" /></Button>
                    {isAdmin && <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>تفاصيل الطالب</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">الاسم:</span> <span className="font-medium">{getFullName(viewing)}</span></div>
                <div><span className="text-muted-foreground">المعدل:</span> <span className="font-medium">{viewing.gpa || "-"}%</span></div>
                <div><span className="text-muted-foreground">الجامعة:</span> <span className="font-medium">{getUniName(viewing.university_id)}</span></div>
                <div><span className="text-muted-foreground">الكلية:</span> <span className="font-medium">{getCollegeName(viewing.college_id)}</span></div>
                <div><span className="text-muted-foreground">التخصص:</span> <span className="font-medium">{getMajorName(viewing.major_id)}</span></div>
                <div><span className="text-muted-foreground">المحافظة:</span> <span className="font-medium">{viewing.governorate || "-"}</span></div>
                <div><span className="text-muted-foreground">رقم التنسيق:</span> <span className="font-medium">{viewing.coordination_number || "-"}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تعديل بيانات الطالب</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>الاسم الأول</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
              <div className="space-y-2"><Label>الاسم الثاني</Label><Input value={secondName} onChange={(e) => setSecondName(e.target.value)} /></div>
              <div className="space-y-2"><Label>الاسم الثالث</Label><Input value={thirdName} onChange={(e) => setThirdName(e.target.value)} /></div>
              <div className="space-y-2"><Label>الاسم الرابع</Label><Input value={fourthName} onChange={(e) => setFourthName(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>المحافظة</Label><Input value={governorate} onChange={(e) => setGovernorate(e.target.value)} /></div>
              <div className="space-y-2"><Label>المعدل</Label><Input type="number" value={gpa} onChange={(e) => setGpa(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>رقم التنسيق</Label><Input value={coordinationNumber} onChange={(e) => setCoordinationNumber(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>الجامعة</Label>
              <select value={universityId} onChange={(e) => { setUniversityId(e.target.value); setCollegeId(""); setMajorId(""); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">بدون</option>
                {universities.map((u) => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>الكلية</Label>
              <select value={collegeId} onChange={(e) => { setCollegeId(e.target.value); setMajorId(""); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">بدون</option>
                {filteredColleges.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>التخصص</Label>
              <select value={majorId} onChange={(e) => setMajorId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">بدون</option>
                {filteredMajors.map((m) => <option key={m.id} value={m.id}>{m.name_ar}</option>)}
              </select>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? "جاري الحفظ..." : "حفظ التعديلات"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminStudents;
