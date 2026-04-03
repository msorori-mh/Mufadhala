import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Settings } from "lucide-react";

const AdminSubscriptionPlans = () => {
  const { loading: authLoading } = useAuth("admin");
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [price, setPrice] = useState("5000");
  const [priceZoneA, setPriceZoneA] = useState("3000");
  const [priceZoneB, setPriceZoneB] = useState("7000");
  const [currency, setCurrency] = useState("YER");
  const [currency, setCurrency] = useState("YER");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (authLoading) return;
    supabase.from("subscription_settings" as any).select("*").limit(1).then(({ data }) => {
      if (data && (data as any[]).length > 0) {
        const s = (data as any[])[0];
        setSettingsId(s.id);
        setPrice(s.price.toString());
        setPriceZoneA((s.price_zone_a || 3000).toString());
        setPriceZoneB((s.price_zone_b || 7000).toString());
        setCurrency(s.currency);
        setDescription(s.description || "");
      }
      setLoading(false);
    });
  }, [authLoading]);

  const handleSave = async () => {
    if (!price || !priceZoneA || !priceZoneB) {
      toast({ variant: "destructive", title: "يرجى ملء جميع حقول الأسعار" });
      return;
    }
    setSaving(true);
    const payload = {
      price: Number(price),
      price_zone_a: Number(priceZoneA),
      price_zone_b: Number(priceZoneB),
      currency,
      duration_months: Number(durationMonths),
      description,
    };

    const { error } = settingsId
      ? await (supabase.from("subscription_settings" as any) as any).update(payload).eq("id", settingsId)
      : await (supabase.from("subscription_settings" as any) as any).insert(payload);

    if (error) toast({ variant: "destructive", title: error.message });
    else toast({ title: "تم حفظ الإعدادات" });
    setSaving(false);
  };

  if (authLoading || loading) return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="w-6 h-6" /> إعدادات الاشتراك</h1>
          <p className="text-sm text-muted-foreground">تحديد سعر ومدة الاشتراك للطلاب</p>
        </div>
        <Card>
          <CardHeader><CardTitle className="text-base">بيانات الاشتراك</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>السعر الافتراضي ({currency}) *</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
              <p className="text-xs text-muted-foreground">يُستخدم إذا لم تُحدد محافظة الطالب</p>
            </div>

            <div className="rounded-lg border p-3 space-y-3 bg-muted/50">
              <p className="text-sm font-semibold">التسعير حسب المنطقة الجغرافية</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>المنطقة أ ({currency})</Label>
                  <Input type="number" value={priceZoneA} onChange={(e) => setPriceZoneA(e.target.value)} />
                  <p className="text-xs text-muted-foreground">صنعاء، عمران، ذمار، إب، الحديدة، صعدة، حجة، المحويت، ريمة، تعز (مناطق أنصار الله)</p>
                </div>
                <div className="space-y-2">
                  <Label>المنطقة ب ({currency})</Label>
                  <Input type="number" value={priceZoneB} onChange={(e) => setPriceZoneB(e.target.value)} />
                  <p className="text-xs text-muted-foreground">عدن، مأرب، حضرموت، شبوة، أبين، لحج، الضالع، المهرة، سقطرى (مناطق الشرعية)</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>العملة</Label><Input value={currency} onChange={(e) => setCurrency(e.target.value)} /></div>
              <div className="space-y-2"><Label>المدة (أشهر) *</Label><Input type="number" value={durationMonths} onChange={(e) => setDurationMonths(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>وصف (اختياري)</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="مثال: اشتراك لفترة القبول" /></div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <><Loader2 className="w-4 h-4 ml-1 animate-spin" /> جاري الحفظ...</> : <><Save className="w-4 h-4 ml-1" /> حفظ الإعدادات</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSubscriptionPlans;
