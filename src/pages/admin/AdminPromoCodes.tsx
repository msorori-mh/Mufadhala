import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import PermissionGate from "@/components/admin/PermissionGate";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Tag, Sparkles } from "lucide-react";

const generateRandomCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 5; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MUF${suffix}`;
};
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface PromoCode {
  id: string; code: string; discount_percent: number;
  max_uses: number | null; used_count: number;
  is_active: boolean; expires_at: string | null;
}

const AdminPromoCodes = () => {
  const { loading: authLoading } = useAuth("moderator");
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ code: "", discount_percent: 10, max_uses: "", expires_at: "" });
  const [saving, setSaving] = useState(false);

  const fetchCodes = async () => {
    const { data } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
    if (data) setPromoCodes(data as any as PromoCode[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) fetchCodes();
  }, [authLoading]);

  const handleSave = async () => {
    if (!form.code) {
      toast({ variant: "destructive", title: "الكود مطلوب" });
      return;
    }
    setSaving(true);
    const payload: any = {
      code: form.code.toUpperCase(),
      discount_percent: Number(form.discount_percent),
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      expires_at: form.expires_at || null,
    };
    const { error } = await supabase.from("promo_codes").insert(payload);
    if (error) toast({ variant: "destructive", title: error.message });
    else {
      toast({ title: "تم إنشاء كود الخصم" });
      setDialogOpen(false);
      setForm({ code: "", discount_percent: 10, max_uses: "", expires_at: "" });
      fetchCodes();
    }
    setSaving(false);
  };

  const toggleActive = async (pc: PromoCode) => {
    await supabase.from("promo_codes").update({ is_active: !pc.is_active } as any).eq("id", pc.id);
    fetchCodes();
  };

  if (authLoading || loading) return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <PermissionGate permission="subscriptions">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><Tag className="w-6 h-6" /> أكواد الخصم</h1>
              <p className="text-sm text-muted-foreground">إنشاء وإدارة أكواد الخصم الترويجية</p>
            </div>
            <Button size="sm" onClick={() => { setForm({ code: generateRandomCode(), discount_percent: 10, max_uses: "", expires_at: "" }); setDialogOpen(true); }}><Plus className="w-4 h-4 ml-1" /> كود جديد</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الكود</TableHead>
                    <TableHead>الخصم</TableHead>
                    <TableHead>الاستخدام</TableHead>
                    <TableHead>الانتهاء</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promoCodes.map((pc) => (
                    <TableRow key={pc.id}>
                      <TableCell><code className="font-bold">{pc.code}</code></TableCell>
                      <TableCell>{pc.discount_percent}%</TableCell>
                      <TableCell>{pc.used_count}{pc.max_uses ? ` / ${pc.max_uses}` : " / ∞"}</TableCell>
                      <TableCell>{pc.expires_at ? new Date(pc.expires_at).toLocaleDateString("ar") : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={pc.is_active ? "default" : "secondary"}>
                          {pc.is_active ? "نشط" : "معطل"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => toggleActive(pc)}>
                          <Switch checked={pc.is_active} className="pointer-events-none" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {promoCodes.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">لا توجد أكواد خصم</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>كود خصم جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>الكود *</Label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="STUDENT2026" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>نسبة الخصم %</Label>
                    <Input type="number" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label>حد الاستخدام (فارغ = لا نهائي)</Label>
                    <Input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>تاريخ الانتهاء (اختياري)</Label>
                  <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Tag className="w-4 h-4 ml-1" />}
                  إنشاء الكود
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PermissionGate>
    </AdminLayout>
  );
};

export default AdminPromoCodes;
