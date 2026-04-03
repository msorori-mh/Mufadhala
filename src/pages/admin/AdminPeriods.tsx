import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

type Period = {
  id: string;
  name_ar: string;
  name_en: string | null;
  academic_year: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "مسودة", variant: "outline" },
  open: { label: "مفتوحة", variant: "default" },
  closed: { label: "مغلقة", variant: "secondary" },
  completed: { label: "منتهية", variant: "destructive" },
};

const AdminPeriods = () => {
  const { loading: authLoading, isAdmin } = useAuth("moderator");
  const { toast } = useToast();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Period | null>(null);

  const [nameAr, setNameAr] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("draft");
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const { data } = await supabase.from("competition_periods").select("*").order("created_at", { ascending: false });
    if (data) setPeriods(data as Period[]);
    setLoading(false);
  };

  useEffect(() => { if (!authLoading) fetchData(); }, [authLoading]);

  const openCreate = () => {
    setEditing(null); setNameAr(""); setAcademicYear(""); setStartDate(""); setEndDate(""); setStatus("draft"); setDialogOpen(true);
  };

  const openEdit = (p: Period) => {
    setEditing(p); setNameAr(p.name_ar); setAcademicYear(p.academic_year);
    setStartDate(p.start_date.slice(0, 16)); setEndDate(p.end_date.slice(0, 16)); setStatus(p.status); setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nameAr || !academicYear || !startDate || !endDate) { toast({ variant: "destructive", title: "يرجى ملء جميع الحقول" }); return; }
    setSaving(true);
    const payload = { name_ar: nameAr, academic_year: academicYear, start_date: startDate, end_date: endDate, status };
    if (editing) {
      const { error } = await supabase.from("competition_periods").update(payload).eq("id", editing.id);
      if (error) toast({ variant: "destructive", title: error.message }); else toast({ title: "تم التحديث" });
    } else {
      const { error } = await supabase.from("competition_periods").insert(payload);
      if (error) toast({ variant: "destructive", title: error.message }); else toast({ title: "تمت الإضافة" });
    }
    setSaving(false); setDialogOpen(false); fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد؟")) return;
    const { error } = await supabase.from("competition_periods").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: error.message }); else { toast({ title: "تم الحذف" }); fetchData(); }
  };

  if (authLoading || loading) return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">فترات المفاضلة</h1>
            <p className="text-sm text-muted-foreground">{periods.length} فترة</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 ml-1" />إضافة</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "تعديل فترة" : "إضافة فترة"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>الاسم *</Label><Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} /></div>
                <div className="space-y-2"><Label>السنة الأكاديمية *</Label><Input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="2025-2026" dir="ltr" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>تاريخ البداية *</Label><Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} dir="ltr" /></div>
                  <div className="space-y-2"><Label>تاريخ النهاية *</Label><Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} dir="ltr" /></div>
                </div>
                <div className="space-y-2">
                  <Label>الحالة</Label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="draft">مسودة</option>
                    <option value="open">مفتوحة</option>
                    <option value="closed">مغلقة</option>
                    <option value="completed">منتهية</option>
                  </select>
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? "جاري الحفظ..." : "حفظ"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {periods.map((p) => {
            const s = statusLabels[p.status] || statusLabels.draft;
            return (
              <Card key={p.id}>
                <CardContent className="flex items-center justify-between py-3 px-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{p.name_ar}</p>
                      <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{p.academic_year} • {new Date(p.start_date).toLocaleDateString("ar")} - {new Date(p.end_date).toLocaleDateString("ar")}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                    {isAdmin && <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {periods.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد فترات مفاضلة بعد</p>}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPeriods;
