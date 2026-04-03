import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

type Requirement = {
  id: string;
  competition_period_id: string;
  major_id: string;
  min_gpa: number;
  available_seats: number;
  created_at: string;
  updated_at: string;
};

const AdminRequirements = () => {
  const { loading: authLoading, isAdmin } = useAuth("moderator");
  const { toast } = useToast();
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Requirement | null>(null);
  const [filterPeriod, setFilterPeriod] = useState("");

  const [periodId, setPeriodId] = useState("");
  const [majorId, setMajorId] = useState("");
  const [minGpa, setMinGpa] = useState("");
  const [availableSeats, setAvailableSeats] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const [{ data: r }, { data: p }, { data: m }, { data: c }] = await Promise.all([
      supabase.from("admission_requirements").select("*"),
      supabase.from("competition_periods").select("*").order("created_at", { ascending: false }),
      supabase.from("majors").select("*").eq("is_active", true).order("display_order"),
      supabase.from("colleges").select("*").eq("is_active", true),
    ]);
    if (r) setRequirements(r as Requirement[]);
    if (p) setPeriods(p);
    if (m) setMajors(m);
    if (c) setColleges(c);
    setLoading(false);
  };

  useEffect(() => { if (!authLoading) fetchData(); }, [authLoading]);

  const filtered = filterPeriod ? requirements.filter((r) => r.competition_period_id === filterPeriod) : requirements;
  const getMajorName = (id: string) => majors.find((m: any) => m.id === id)?.name_ar || "-";
  const getCollegeName = (majorId: string) => {
    const major = majors.find((m: any) => m.id === majorId);
    return major ? colleges.find((c: any) => c.id === major.college_id)?.name_ar || "" : "";
  };
  const getPeriodName = (id: string) => periods.find((p: any) => p.id === id)?.name_ar || "-";

  const openCreate = () => {
    setEditing(null); setPeriodId(filterPeriod); setMajorId(""); setMinGpa(""); setAvailableSeats(""); setDialogOpen(true);
  };

  const openEdit = (r: Requirement) => {
    setEditing(r); setPeriodId(r.competition_period_id); setMajorId(r.major_id); setMinGpa(r.min_gpa.toString()); setAvailableSeats(r.available_seats.toString()); setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!periodId || !majorId || !minGpa || !availableSeats) { toast({ variant: "destructive", title: "يرجى ملء جميع الحقول" }); return; }
    setSaving(true);
    const payload = { competition_period_id: periodId, major_id: majorId, min_gpa: parseFloat(minGpa), available_seats: parseInt(availableSeats) };
    if (editing) {
      const { error } = await supabase.from("admission_requirements").update(payload).eq("id", editing.id);
      if (error) toast({ variant: "destructive", title: error.message }); else toast({ title: "تم التحديث" });
    } else {
      const { error } = await supabase.from("admission_requirements").insert(payload);
      if (error) toast({ variant: "destructive", title: error.message }); else toast({ title: "تمت الإضافة" });
    }
    setSaving(false); setDialogOpen(false); fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد؟")) return;
    const { error } = await supabase.from("admission_requirements").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: error.message }); else { toast({ title: "تم الحذف" }); fetchData(); }
  };

  if (authLoading || loading) return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold">متطلبات القبول</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} متطلب</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 ml-1" />إضافة</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "تعديل متطلب" : "إضافة متطلب"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>فترة المفاضلة *</Label>
                  <select value={periodId} onChange={(e) => setPeriodId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">اختر الفترة</option>
                    {periods.map((p: any) => <option key={p.id} value={p.id}>{p.name_ar} ({p.academic_year})</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>التخصص *</Label>
                  <select value={majorId} onChange={(e) => setMajorId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">اختر التخصص</option>
                    {majors.map((m: any) => <option key={m.id} value={m.id}>{m.name_ar} - {getCollegeName(m.id)}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>الحد الأدنى للمعدل *</Label><Input type="number" value={minGpa} onChange={(e) => setMinGpa(e.target.value)} dir="ltr" min="0" max="100" step="0.01" /></div>
                  <div className="space-y-2"><Label>المقاعد المتاحة *</Label><Input type="number" value={availableSeats} onChange={(e) => setAvailableSeats(e.target.value)} dir="ltr" min="0" /></div>
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? "جاري الحفظ..." : "حفظ"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm w-full md:w-64">
          <option value="">جميع الفترات</option>
          {periods.map((p: any) => <option key={p.id} value={p.id}>{p.name_ar}</option>)}
        </select>

        <div className="space-y-2">
          {filtered.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div>
                  <p className="font-semibold text-sm">{getMajorName(r.major_id)}</p>
                  <p className="text-xs text-muted-foreground">{getCollegeName(r.major_id)} • {getPeriodName(r.competition_period_id)}</p>
                  <p className="text-xs text-muted-foreground mt-1">الحد الأدنى: {r.min_gpa}% • المقاعد: {r.available_seats}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                  {isAdmin && <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد متطلبات قبول بعد</p>}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminRequirements;
