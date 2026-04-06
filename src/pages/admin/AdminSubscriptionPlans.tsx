import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import PermissionGate from "@/components/admin/PermissionGate";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Settings, Plus, Pencil, Tag, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface Plan {
  id: string; name: string; slug: string; description: string;
  features: string[]; price_zone_a: number; price_zone_b: number;
  price_default: number; currency: string; is_active: boolean;
  display_order: number; is_free: boolean; allowed_major_ids: string[] | null;
}

interface PromoCode {
  id: string; code: string; discount_percent: number;
  max_uses: number | null; used_count: number;
  is_active: boolean; expires_at: string | null;
}

const emptyPlan: Omit<Plan, "id"> = {
  name: "", slug: "", description: "", features: [],
  price_zone_a: 0, price_zone_b: 0, price_default: 0,
  currency: "YER", is_active: true, display_order: 0,
  is_free: false, allowed_major_ids: null,
};

const AdminSubscriptionPlans = () => {
  const { loading: authLoading } = useAuth("moderator");
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);

  // Plan dialog
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState(emptyPlan);
  const [featuresText, setFeaturesText] = useState("");
  const [saving, setSaving] = useState(false);

  // Promo dialog
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [promoForm, setPromoForm] = useState({ code: "", discount_percent: 10, max_uses: "", expires_at: "" });
  const [savingPromo, setSavingPromo] = useState(false);

  const fetchAll = async () => {
    const [{ data: pl }, { data: pc }] = await Promise.all([
      supabase.from("subscription_plans").select("*").order("display_order"),
      supabase.from("promo_codes").select("*").order("created_at", { ascending: false }),
    ]);
    if (pl) setPlans(pl as any as Plan[]);
    if (pc) setPromoCodes(pc as any as PromoCode[]);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    fetchAll();
  }, [authLoading]);

  const openNewPlan = () => {
    setEditingPlan(null);
    setPlanForm(emptyPlan);
    setFeaturesText("");
    setPlanDialogOpen(true);
  };

  const openEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setPlanForm({ ...plan });
    setFeaturesText((plan.features || []).join("\n"));
    setPlanDialogOpen(true);
  };

  const handleSavePlan = async () => {
    if (!planForm.name || !planForm.slug) {
      toast({ variant: "destructive", title: "الاسم والمعرف مطلوبان" });
      return;
    }
    setSaving(true);
    const payload: any = {
      name: planForm.name, slug: planForm.slug, description: planForm.description,
      features: featuresText.split("\n").map(s => s.trim()).filter(Boolean),
      price_zone_a: Number(planForm.price_zone_a), price_zone_b: Number(planForm.price_zone_b),
      price_default: Number(planForm.price_default), currency: planForm.currency,
      is_active: planForm.is_active, display_order: Number(planForm.display_order),
      is_free: planForm.is_free,
    };

    const { error } = editingPlan
      ? await supabase.from("subscription_plans").update(payload).eq("id", editingPlan.id)
      : await supabase.from("subscription_plans").insert(payload);

    if (error) toast({ variant: "destructive", title: error.message });
    else {
      toast({ title: editingPlan ? "تم تحديث الخطة" : "تم إنشاء الخطة" });
      setPlanDialogOpen(false);
      fetchAll();
    }
    setSaving(false);
  };

  const togglePlanActive = async (plan: Plan) => {
    await supabase.from("subscription_plans").update({ is_active: !plan.is_active }).eq("id", plan.id);
    fetchAll();
  };

  const handleSavePromo = async () => {
    if (!promoForm.code) {
      toast({ variant: "destructive", title: "الكود مطلوب" });
      return;
    }
    setSavingPromo(true);
    const payload: any = {
      code: promoForm.code.toUpperCase(),
      discount_percent: Number(promoForm.discount_percent),
      max_uses: promoForm.max_uses ? Number(promoForm.max_uses) : null,
      expires_at: promoForm.expires_at || null,
    };
    const { error } = await supabase.from("promo_codes").insert(payload);
    if (error) toast({ variant: "destructive", title: error.message });
    else {
      toast({ title: "تم إنشاء كود الخصم" });
      setPromoDialogOpen(false);
      setPromoForm({ code: "", discount_percent: 10, max_uses: "", expires_at: "" });
      fetchAll();
    }
    setSavingPromo(false);
  };

  const togglePromoActive = async (pc: PromoCode) => {
    await supabase.from("promo_codes").update({ is_active: !pc.is_active } as any).eq("id", pc.id);
    fetchAll();
  };

  if (authLoading || loading) return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <PermissionGate permission="subscriptions">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="w-6 h-6" /> إدارة الاشتراكات</h1>
            <p className="text-sm text-muted-foreground">إدارة خطط الاشتراك وأكواد الخصم</p>
          </div>

          <Tabs defaultValue="plans" dir="rtl">
            <TabsList>
              <TabsTrigger value="plans">خطط الاشتراك</TabsTrigger>
              <TabsTrigger value="promos">أكواد الخصم</TabsTrigger>
            </TabsList>

            {/* Plans Tab */}
            <TabsContent value="plans" className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={openNewPlan}><Plus className="w-4 h-4 ml-1" /> خطة جديدة</Button>
              </div>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الاسم</TableHead>
                        <TableHead>المعرف</TableHead>
                        <TableHead>السعر الافتراضي</TableHead>
                        <TableHead>منطقة أ</TableHead>
                        <TableHead>منطقة ب</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell><code className="text-xs">{p.slug}</code></TableCell>
                          <TableCell>{p.is_free ? "مجاني" : p.price_default.toLocaleString()}</TableCell>
                          <TableCell>{p.is_free ? "-" : p.price_zone_a.toLocaleString()}</TableCell>
                          <TableCell>{p.is_free ? "-" : p.price_zone_b.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={p.is_active ? "default" : "secondary"}>
                              {p.is_active ? "نشطة" : "معطلة"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditPlan(p)}><Pencil className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => togglePlanActive(p)}>
                                <Switch checked={p.is_active} className="pointer-events-none" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Promo Codes Tab */}
            <TabsContent value="promos" className="space-y-3">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setPromoDialogOpen(true)}><Plus className="w-4 h-4 ml-1" /> كود جديد</Button>
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
                            <Button variant="ghost" size="icon" onClick={() => togglePromoActive(pc)}>
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
            </TabsContent>
          </Tabs>

          {/* Plan Dialog */}
          <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPlan ? "تعديل الخطة" : "خطة جديدة"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>الاسم *</Label>
                    <Input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>المعرف (slug) *</Label>
                    <Input value={planForm.slug} onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value })} placeholder="medical" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>الوصف</Label>
                  <Textarea value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>الميزات (سطر لكل ميزة)</Label>
                  <Textarea value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} rows={4} placeholder="أسئلة الأحياء&#10;شرح الحلول&#10;وضع أوفلاين" />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={planForm.is_free} onCheckedChange={(v) => setPlanForm({ ...planForm, is_free: v })} />
                  <Label>خطة مجانية</Label>
                </div>
                {!planForm.is_free && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>السعر الافتراضي</Label>
                      <Input type="number" value={planForm.price_default} onChange={(e) => setPlanForm({ ...planForm, price_default: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-1">
                      <Label>منطقة أ</Label>
                      <Input type="number" value={planForm.price_zone_a} onChange={(e) => setPlanForm({ ...planForm, price_zone_a: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-1">
                      <Label>منطقة ب</Label>
                      <Input type="number" value={planForm.price_zone_b} onChange={(e) => setPlanForm({ ...planForm, price_zone_b: Number(e.target.value) })} />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>العملة</Label>
                    <Input value={planForm.currency} onChange={(e) => setPlanForm({ ...planForm, currency: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>ترتيب العرض</Label>
                    <Input type="number" value={planForm.display_order} onChange={(e) => setPlanForm({ ...planForm, display_order: Number(e.target.value) })} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSavePlan} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Save className="w-4 h-4 ml-1" />}
                  {editingPlan ? "تحديث" : "إنشاء"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Promo Dialog */}
          <Dialog open={promoDialogOpen} onOpenChange={setPromoDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>كود خصم جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>الكود *</Label>
                  <Input value={promoForm.code} onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })} placeholder="STUDENT2026" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>نسبة الخصم %</Label>
                    <Input type="number" value={promoForm.discount_percent} onChange={(e) => setPromoForm({ ...promoForm, discount_percent: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label>حد الاستخدام (فارغ = لا نهائي)</Label>
                    <Input type="number" value={promoForm.max_uses} onChange={(e) => setPromoForm({ ...promoForm, max_uses: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>تاريخ الانتهاء (اختياري)</Label>
                  <Input type="date" value={promoForm.expires_at} onChange={(e) => setPromoForm({ ...promoForm, expires_at: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSavePromo} disabled={savingPromo}>
                  {savingPromo ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Tag className="w-4 h-4 ml-1" />}
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

export default AdminSubscriptionPlans;
