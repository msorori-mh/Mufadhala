import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import PermissionGate from "@/components/admin/PermissionGate";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, Link2 } from "lucide-react";

interface Subject {
  id: string;
  name_ar: string;
  name_en: string | null;
  code: string;
  icon: string | null;
  is_active: boolean;
  display_order: number;
}

interface MajorSubject {
  id: string;
  major_id: string;
  subject_id: string;
}


const AdminSubjects = () => {
  const { loading: authLoading, isAdmin } = useAuth("admin");
  const { toast } = useToast();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [majorSubjects, setMajorSubjects] = useState<MajorSubject[]>([]);
  const [loading, setLoading] = useState(true);

  // Subject dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [code, setCode] = useState("");
  const [icon, setIcon] = useState("BookOpen");
  const [isActive, setIsActive] = useState(true);
  const [order, setOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  // Link dialog (shared for majors & colleges)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkSubject, setLinkSubject] = useState<Subject | null>(null);
  const [linkTab, setLinkTab] = useState<"majors">("majors");
  const [filterUni, setFilterUni] = useState("");
  const [filterCollege, setFilterCollege] = useState("");

  const fetchData = async () => {
    const [{ data: s }, { data: ms }, { data: m }, { data: c }, { data: u }] = await Promise.all([
      supabase.from("subjects").select("*").order("display_order"),
      supabase.from("major_subjects").select("*"),
      supabase.from("majors").select("*").order("display_order"),
      supabase.from("colleges").select("*").order("display_order"),
      supabase.from("universities").select("*").order("display_order"),
    ]);
    if (s) setSubjects(s as Subject[]);
    if (ms) setMajorSubjects(ms as MajorSubject[]);
    if (m) setMajors(m);
    if (c) setColleges(c);
    if (u) setUniversities(u);
    setLoading(false);
  };

  useEffect(() => { if (!authLoading) fetchData(); }, [authLoading]);

  const openCreate = () => {
    setEditing(null);
    setNameAr("");
    setNameEn("");
    setCode("");
    setIcon("BookOpen");
    setIsActive(true);
    setOrder(subjects.length);
    setDialogOpen(true);
  };

  const openEdit = (s: Subject) => {
    setEditing(s);
    setNameAr(s.name_ar);
    setNameEn(s.name_en || "");
    setCode(s.code);
    setIcon(s.icon || "BookOpen");
    setIsActive(s.is_active);
    setOrder(s.display_order);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nameAr || !code) {
      toast({ variant: "destructive", title: "يرجى ملء الاسم والرمز" });
      return;
    }
    setSaving(true);
    const payload = { name_ar: nameAr, name_en: nameEn || null, code, icon, is_active: isActive, display_order: order };
    if (editing) {
      const { error } = await supabase.from("subjects").update(payload).eq("id", editing.id);
      if (error) toast({ variant: "destructive", title: error.message });
      else toast({ title: "تم التحديث" });
    } else {
      const { error } = await supabase.from("subjects").insert(payload);
      if (error) toast({ variant: "destructive", title: error.message });
      else toast({ title: "تمت الإضافة" });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف هذه المادة؟")) return;
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: error.message });
    else { toast({ title: "تم الحذف" }); fetchData(); }
  };

  // Link dialog
  const openLinkDialog = (s: Subject) => {
    setLinkSubject(s);
    setFilterUni("");
    setFilterCollege("");
    setLinkTab("majors");
    setLinkDialogOpen(true);
  };

  // Major links
  const linkedMajorIds = (subjectId: string) =>
    new Set(majorSubjects.filter(ms => ms.subject_id === subjectId).map(ms => ms.major_id));

  const toggleMajorLink = async (majorId: string, subjectId: string) => {
    const existing = majorSubjects.find(ms => ms.major_id === majorId && ms.subject_id === subjectId);
    if (existing) {
      await supabase.from("major_subjects").delete().eq("id", existing.id);
    } else {
      await supabase.from("major_subjects").insert({ major_id: majorId, subject_id: subjectId });
    }
    fetchData();
  };


  const filteredColleges = filterUni ? colleges.filter((c: any) => c.university_id === filterUni) : colleges;
  const filteredMajors = filterCollege
    ? majors.filter((m: any) => m.college_id === filterCollege)
    : filterUni
      ? majors.filter((m: any) => filteredColleges.some((c: any) => c.id === m.college_id))
      : majors;

  if (authLoading || loading) return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <PermissionGate permission="content">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">المواد الدراسية</h1>
              <p className="text-sm text-muted-foreground">{subjects.length} مادة</p>
            </div>
            <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 ml-1" />إضافة مادة</Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((s) => {
              const linkedMajors = linkedMajorIds(s.id);
              return (
                <Card key={s.id} className={!s.is_active ? "opacity-60" : ""}>
                  <CardContent className="py-4 px-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{s.name_ar}</p>
                        <p className="text-xs text-muted-foreground">{s.name_en || s.code}</p>
                        <div className="flex gap-1 mt-2 flex-wrap">
                          <Badge variant={s.is_active ? "default" : "secondary"} className="text-[10px]">
                            {s.is_active ? "نشطة" : "غير نشطة"}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {linkedMajors.size} تخصص
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openLinkDialog(s)} title="ربط بالتخصصات">
                          <Link2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Subject Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "تعديل مادة" : "إضافة مادة"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الاسم بالعربي *</Label>
                <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>الاسم بالإنجليزي</Label>
                <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>الرمز *</Label>
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="مثل: chemistry" />
                </div>
                <div className="space-y-2">
                  <Label>ترتيب العرض</Label>
                  <Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>نشطة</Label>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Link to Majors Dialog */}
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>ربط "{linkSubject?.name_ar}" بالتخصصات</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-3">
              <div className="flex gap-2">
                <select value={filterUni} onChange={(e) => { setFilterUni(e.target.value); setFilterCollege(""); }} className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex-1">
                  <option value="">جميع الجامعات</option>
                  {universities.map((u: any) => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
                </select>
                <select value={filterCollege} onChange={(e) => setFilterCollege(e.target.value)} className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex-1">
                  <option value="">جميع الكليات</option>
                  {filteredColleges.map((c: any) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                </select>
              </div>
              <div className="space-y-1 max-h-[50vh] overflow-y-auto">
                {filteredMajors.map((m: any) => {
                  const isLinked = linkSubject ? linkedMajorIds(linkSubject.id).has(m.id) : false;
                  const college = colleges.find((c: any) => c.id === m.college_id);
                  return (
                    <div
                      key={m.id}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${isLinked ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"}`}
                      onClick={() => linkSubject && toggleMajorLink(m.id, linkSubject.id)}
                    >
                      <div>
                        <p className="text-sm font-medium">{m.name_ar}</p>
                        <p className="text-[10px] text-muted-foreground">{college?.name_ar}</p>
                      </div>
                      <Switch checked={isLinked} onChange={() => {}} />
                    </div>
                  );
                })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </PermissionGate>
    </AdminLayout>
  );
};

export default AdminSubjects;
