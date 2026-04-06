import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import PermissionGate from "@/components/admin/PermissionGate";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const AdminUniversities = () => {
  const { loading: authLoading, isAdmin } = useAuth("moderator");
  const { toast } = useToast();
  const [universities, setUniversities] = useState<Tables<"universities">[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"universities"> | null>(null);
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [code, setCode] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const { data } = await supabase.from("universities").select("*").order("display_order");
    if (data) setUniversities(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading]);

  const openCreate = () => {
    setEditing(null);
    setNameAr("");
    setNameEn("");
    setCode("");
    setIsActive(true);
    setDisplayOrder(universities.length);
    setDialogOpen(true);
  };

  const openEdit = (u: Tables<"universities">) => {
    setEditing(u);
    setNameAr(u.name_ar);
    setNameEn(u.name_en || "");
    setCode(u.code);
    setIsActive(u.is_active);
    setDisplayOrder(u.display_order);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nameAr || !code) {
      toast({ variant: "destructive", title: "يرجى ملء الحقول المطلوبة" });
      return;
    }
    setSaving(true);
    const payload = { name_ar: nameAr, name_en: nameEn || null, code, is_active: isActive, display_order: displayOrder };

    if (editing) {
      const { error } = await supabase.from("universities").update(payload).eq("id", editing.id);
      if (error) toast({ variant: "destructive", title: error.message });
      else toast({ title: "تم التحديث بنجاح" });
    } else {
      const { error } = await supabase.from("universities").insert(payload);
      if (error) toast({ variant: "destructive", title: error.message });
      else toast({ title: "تمت الإضافة بنجاح" });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    const { error } = await supabase.from("universities").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: error.message });
    else { toast({ title: "تم الحذف" }); fetchData(); }
  };

  if (authLoading || loading) {
    return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <PermissionGate permission="universities">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">الجامعات</h1>
            <p className="text-sm text-muted-foreground">{universities.length} جامعة</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 ml-1" />إضافة</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "تعديل جامعة" : "إضافة جامعة"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>الاسم بالعربية *</Label>
                  <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>الاسم بالإنجليزية</Label>
                  <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>الرمز *</Label>
                    <Input value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>ترتيب العرض</Label>
                    <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <Label>مفعّلة</Label>
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {universities.map((u) => (
            <Card key={u.id} className={!u.is_active ? "opacity-50" : ""}>
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div>
                  <p className="font-semibold text-sm">{u.name_ar}</p>
                  <p className="text-xs text-muted-foreground">{u.code} {u.name_en && `• ${u.name_en}`}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="w-4 h-4" /></Button>
                  {isAdmin && <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
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

export default AdminUniversities;
