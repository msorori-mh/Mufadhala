import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import PermissionGate from "@/components/admin/PermissionGate";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Pencil, Trash2, Building, ArrowLeftRight, Smartphone, Globe, QrCode, X } from "lucide-react";

interface PaymentMethod {
  id: string;
  type: string;
  name: string;
  account_name: string | null;
  account_number: string | null;
  details: string | null;
  is_active: boolean;
  sort_order: number;
  barcode_url: string | null;
  logo_url: string | null;
}

const AdminPaymentMethods = () => {
  const { loading: authLoading } = useAuth("moderator");
  const { toast } = useToast();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [saving, setSaving] = useState(false);

  const [type, setType] = useState("bank");
  const [name, setName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [details, setDetails] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");
  const [barcodeFile, setBarcodeFile] = useState<File | null>(null);
  const [barcodePreview, setBarcodePreview] = useState<string | null>(null);
  const [removingBarcode, setRemovingBarcode] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removingLogo, setRemovingLogo] = useState(false);

  const fetchMethods = async () => {
    const { data } = await supabase.from("payment_methods").select("*").order("sort_order");
    if (data) setMethods(data as PaymentMethod[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) fetchMethods();
  }, [authLoading]);

  const resetForm = () => {
    setType("bank"); setName(""); setAccountName(""); setAccountNumber("");
    setDetails(""); setIsActive(true); setSortOrder("0"); setEditing(null);
    setBarcodeFile(null); setBarcodePreview(null); setRemovingBarcode(false);
    setLogoFile(null); setLogoPreview(null); setRemovingLogo(false);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (m: PaymentMethod) => {
    setEditing(m);
    setType(m.type); setName(m.name);
    setAccountName(m.account_name || ""); setAccountNumber(m.account_number || "");
    setDetails(m.details || ""); setIsActive(m.is_active);
    setSortOrder(m.sort_order.toString());
    setBarcodeFile(null); setBarcodePreview(m.barcode_url || null); setRemovingBarcode(false);
    setLogoFile(null); setLogoPreview(m.logo_url || null); setRemovingLogo(false);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name) { toast({ variant: "destructive", title: "يرجى إدخال الاسم" }); return; }
    setSaving(true);

    let barcode_url: string | null = editing?.barcode_url ?? null;
    let logo_url: string | null = editing?.logo_url ?? null;

    // Upload new barcode
    if (barcodeFile) {
      const ext = barcodeFile.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-barcodes").upload(path, barcodeFile);
      if (upErr) { toast({ variant: "destructive", title: "فشل رفع الباركود" }); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("payment-barcodes").getPublicUrl(path);
      barcode_url = urlData.publicUrl;
    }

    // Upload new logo
    if (logoFile) {
      const ext = logoFile.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-logos").upload(path, logoFile);
      if (upErr) { toast({ variant: "destructive", title: "فشل رفع الشعار" }); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("payment-logos").getPublicUrl(path);
      logo_url = urlData.publicUrl;
    }

    // Remove barcode
    if (removingBarcode && !barcodeFile) {
      barcode_url = null;
    }

    // Remove logo
    if (removingLogo && !logoFile) {
      logo_url = null;
    }

    const payload = {
      type, name, account_name: accountName || null,
      account_number: accountNumber || null, details: details || null,
      is_active: isActive, sort_order: Number(sortOrder), barcode_url, logo_url,
    };

    const { error } = editing
      ? await supabase.from("payment_methods").update(payload).eq("id", editing.id)
      : await supabase.from("payment_methods").insert(payload);

    if (error) toast({ variant: "destructive", title: error.message });
    else { toast({ title: editing ? "تم التحديث" : "تمت الإضافة" }); setDialogOpen(false); fetchMethods(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد؟")) return;
    const { error } = await supabase.from("payment_methods").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: error.message });
    else { toast({ title: "تم الحذف" }); fetchMethods(); }
  };

  if (authLoading || loading) return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AdminLayout>;

  const banks = methods.filter((m) => m.type === "bank");
  const exchanges = methods.filter((m) => m.type === "exchange");
  const ewallets = methods.filter((m) => m.type === "ewallet");
  const networkTransfers = methods.filter((m) => m.type === "network_transfer");

  return (
    <AdminLayout>
      <PermissionGate permission="payment_methods">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">طرق الدفع</h1>
            <p className="text-sm text-muted-foreground">{methods.length} طريقة دفع</p>
          </div>
          <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 ml-1" /> إضافة</Button>
        </div>

        {banks.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Building className="w-4 h-4" /> الحسابات البنكية</h2>
            <div className="space-y-2">
              {banks.map((m) => (
                <Card key={m.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                           {m.logo_url && <img src={m.logo_url} alt={m.name} className="w-6 h-6 rounded object-contain" />}
                           <p className="font-semibold text-sm">{m.name}</p>
                           <Badge variant={m.is_active ? "default" : "secondary"}>{m.is_active ? "مفعل" : "معطل"}</Badge>
                           {m.barcode_url && <QrCode className="w-4 h-4 text-primary" />}
                         </div>
                         {m.account_name && <p className="text-xs text-muted-foreground mt-1">الحساب: {m.account_name}</p>}
                         {m.account_number && <p className="text-xs text-muted-foreground">رقم الحساب: {m.account_number}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {exchanges.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1"><ArrowLeftRight className="w-4 h-4" /> شركات الصرافة</h2>
            <div className="space-y-2">
              {exchanges.map((m) => (
                <Card key={m.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div>
                         <div className="flex items-center gap-2">
                           {m.logo_url && <img src={m.logo_url} alt={m.name} className="w-6 h-6 rounded object-contain" />}
                           <p className="font-semibold text-sm">{m.name}</p>
                           <Badge variant={m.is_active ? "default" : "secondary"}>{m.is_active ? "مفعل" : "معطل"}</Badge>
                           {m.barcode_url && <QrCode className="w-4 h-4 text-primary" />}
                         </div>
                         {m.account_number && <p className="text-xs text-muted-foreground mt-1">رقم الهاتف: {m.account_number}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {ewallets.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Smartphone className="w-4 h-4" /> المحافظ الإلكترونية</h2>
            <div className="space-y-2">
              {ewallets.map((m) => (
                <Card key={m.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div>
                         <div className="flex items-center gap-2">
                           {m.logo_url && <img src={m.logo_url} alt={m.name} className="w-6 h-6 rounded object-contain" />}
                           <p className="font-semibold text-sm">{m.name}</p>
                           <Badge variant={m.is_active ? "default" : "secondary"}>{m.is_active ? "مفعل" : "معطل"}</Badge>
                           {m.barcode_url && <QrCode className="w-4 h-4 text-primary" />}
                         </div>
                         {m.account_number && <p className="text-xs text-muted-foreground mt-1">رقم المحفظة: {m.account_number}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {networkTransfers.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Globe className="w-4 h-4" /> تحويل عبر الشبكة الموحدة</h2>
            <div className="space-y-2">
              {networkTransfers.map((m) => (
                <Card key={m.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div>
                         <div className="flex items-center gap-2">
                           {m.logo_url && <img src={m.logo_url} alt={m.name} className="w-6 h-6 rounded object-contain" />}
                           <p className="font-semibold text-sm">{m.name}</p>
                           <Badge variant={m.is_active ? "default" : "secondary"}>{m.is_active ? "مفعل" : "معطل"}</Badge>
                           {m.barcode_url && <QrCode className="w-4 h-4 text-primary" />}
                         </div>
                         {m.account_name && <p className="text-xs text-muted-foreground mt-1">الحساب: {m.account_name}</p>}
                         {m.account_number && <p className="text-xs text-muted-foreground">رقم الحساب: {m.account_number}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {methods.length === 0 && <p className="text-center text-muted-foreground py-8">لا توجد طرق دفع بعد</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "تعديل طريقة الدفع" : "إضافة طريقة دفع"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>النوع *</Label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="bank">بنك</option>
                <option value="exchange">شركة صرافة</option>
                <option value="ewallet">محفظة إلكترونية</option>
                <option value="network_transfer">تحويل عبر الشبكة الموحدة</option>
              </select>
            </div>
            <div className="space-y-2"><Label>{type === "bank" ? "اسم البنك" : type === "exchange" ? "اسم شركة الصرافة" : type === "network_transfer" ? "اسم الخدمة" : "اسم المحفظة"} *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>شعار طريقة الدفع</Label>
              {logoPreview && !removingLogo ? (
                <div className="relative inline-block">
                  <img src={logoPreview} alt="شعار" className="w-12 h-12 rounded-lg border object-contain" />
                  <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 w-6 h-6" onClick={() => { setRemovingLogo(true); setLogoFile(null); }}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Input type="file" accept="image/*" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); setRemovingLogo(false); }
                }} />
              )}
              {logoFile && <img src={URL.createObjectURL(logoFile)} alt="معاينة" className="w-12 h-12 rounded-lg border object-contain mt-1" />}
            </div>
            <div className="space-y-2"><Label>{type === "network_transfer" ? "تحويل بأسم (اسم المستلم)" : "اسم صاحب الحساب"}</Label><Input value={accountName} onChange={(e) => setAccountName(e.target.value)} /></div>
            <div className="space-y-2"><Label>{type === "bank" ? "رقم الحساب" : type === "exchange" || type === "network_transfer" ? "رقم الهاتف" : "رقم المحفظة"}</Label><Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} /></div>
            <div className="space-y-2"><Label>تفاصيل إضافية</Label><Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="الفرع، ملاحظات..." /></div>
            <div className="space-y-2">
              <Label>صورة الباركود / QR Code</Label>
              {barcodePreview && !removingBarcode ? (
                <div className="relative inline-block">
                  <img src={barcodePreview} alt="باركود" className="max-w-[150px] rounded-lg border" />
                  <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 w-6 h-6" onClick={() => { setRemovingBarcode(true); setBarcodeFile(null); }}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Input type="file" accept="image/*" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setBarcodeFile(f); setBarcodePreview(URL.createObjectURL(f)); setRemovingBarcode(false); }
                }} />
              )}
              {barcodeFile && <img src={URL.createObjectURL(barcodeFile)} alt="معاينة" className="max-w-[150px] rounded-lg border mt-1" />}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>الترتيب</Label><Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} /></div>
              <div className="flex items-center gap-2 pt-6"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>مفعل</Label></div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? "جاري الحفظ..." : "حفظ"}</Button>
          </div>
        </DialogContent>
      </Dialog>
      </PermissionGate>
    </AdminLayout>
  );
};

export default AdminPaymentMethods;
