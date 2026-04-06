import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import PermissionGate from "@/components/admin/PermissionGate";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const AdminColleges = () => {
  const { loading: authLoading, isAdmin } = useAuth("moderator");
  const { toast } = useToast();
  const [colleges, setColleges] = useState<Tables<"colleges">[]>([]);
  const [universities, setUniversities] = useState<Tables<"universities">[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"colleges"> | null>(null);
  const [filterUni, setFilterUni] = useState("");

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [code, setCode] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const [{ data: c }, { data: u }] = await Promise.all([
      supabase.from("colleges").select("*").order("display_order"),
      supabase.from("universities").select("*").eq("is_active", true).order("display_order"),
    ]);
    if (c) setColleges(c);
    if (u) setUniversities(u);
    setLoading(false);
  };

  useEffect(() => { if (!authLoading) fetchData(); }, [authLoading]);

  const filtered = filterUni ? colleges.filter((c) => c.university_id === filterUni) : colleges;
  const getUniName = (id: string) => universities.find((u) => u.id === id)?.name_ar || "";

  const openCreate = () => {
    setEditing(null); setNameAr(""); setNameEn(""); setCode(""); setUniversityId(filterUni); setIsActive(true); setDisplayOrder(0); setDialogOpen(true);
  };

  const openEdit = (c: Tables<"colleges">) => {
    setEditing(c); setNameAr(c.name_ar); setNameEn(c.name_en || ""); setCode(c.code); setUniversityId(c.university_id); setIsActive(c.is_active); setDisplayOrder(c.display_order); setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nameAr || !code || !universityId) { toast({ variant: "destructive", title: "يرجى ملء الحقول المطلوبة" }); return; }
    setSaving(true);
    const payload = { name_ar: nameAr, name_en: nameEn || null, code, university_id: universityId, is_active: isActive, display_order: displayOrder };
    if (editing) {
      const { error } = await supabase.from("colleges").update(payload).eq("id", editing.id);
      if (error) toast({ variant: "destructive", title: error.message }); else toast({ title: "تم التحديث" });
    } else {
      const { error } = await supabase.from("colleges").insert(payload);
      if (error) toast({ variant: "destructive", title: error.message }); else toast({ title: "تمت الإضافة" });
    }
    setSaving(false); setDialogOpen(false); fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد؟")) return;
    const { error } = await supabase.from("colleges").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: error.message }); else { toast({ title: "تم الحذف" }); fetchData(); }
  };

  if (authLoading || loading) return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <PermissionGate permission="universities">
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold">الكليات</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} كلية</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 ml-1" />إضافة</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "تعديل كلية" : "إضافة كلية"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>الجامعة *</Label>
                  <select value={universityId} onChange={(e) => setUniversityId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">اختر الجامعة</option>
                    {universities.map((u) => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
                  </select>
                </div>
                <div className="space-y-2"><Label>الاسم بالعربية *</Label><Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} /></div>
                <div className="space-y-2"><Label>الاسم بالإنجليزية</Label><Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>الرمز *</Label><Input value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" /></div>
                  <div className="space-y-2"><Label>ترتيب العرض</Label><Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} /></div>
                </div>
                <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>مفعّلة</Label></div>
                <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? "جاري الحفظ..." : "حفظ"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <select value={filterUni} onChange={(e) => setFilterUni(e.target.value)} className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm w-full md:w-64">
          <option value="">جميع الجامعات</option>
          {universities.map((u) => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
        </select>

        <div className="space-y-2">
          {filtered.map((c) => (
            <Card key={c.id} className={!c.is_active ? "opacity-50" : ""}>
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div>
                  <p className="font-semibold text-sm">{c.name_ar}</p>
                  <p className="text-xs text-muted-foreground">{getUniName(c.university_id)} • {c.code}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                  {isAdmin && <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      </PermissionGate>
    </AdminLayout>
  );
};

export default AdminColleges;
