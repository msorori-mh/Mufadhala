import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import PermissionGate from "@/components/admin/PermissionGate";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, Upload, FileText, X } from "lucide-react";
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
  const [guideText, setGuideText] = useState("");
  const [guideUrl, setGuideUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setNameAr(""); setNameEn(""); setCode("");
    setIsActive(true); setDisplayOrder(universities.length);
    setGuideText(""); setGuideUrl("");
    setDialogOpen(true);
  };

  const openEdit = (u: Tables<"universities">) => {
    setEditing(u);
    setNameAr(u.name_ar);
    setNameEn(u.name_en || "");
    setCode(u.code);
    setIsActive(u.is_active);
    setDisplayOrder(u.display_order);
    setGuideText((u as any).guide_text || "");
    setGuideUrl((u as any).guide_url || "");
    setDialogOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ variant: "destructive", title: "يُقبل فقط ملفات PDF" });
      return;
    }
    setUploading(true);
    const fileName = `${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("university-guides").upload(fileName, file);
    if (error) {
      toast({ variant: "destructive", title: "فشل رفع الملف: " + error.message });
    } else {
      const { data: pub } = supabase.storage.from("university-guides").getPublicUrl(fileName);
      setGuideUrl(pub.publicUrl);
      toast({ title: "تم رفع الملف بنجاح" });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeGuide = () => {
    setGuideUrl("");
  };

  const handleSave = async () => {
    if (!nameAr || !code) {
      toast({ variant: "destructive", title: "يرجى ملء الحقول المطلوبة" });
      return;
    }
    setSaving(true);
    const payload: any = {
      name_ar: nameAr, name_en: nameEn || null, code,
      is_active: isActive, display_order: displayOrder,
      guide_url: guideUrl || null, guide_text: guideText || null,
    };

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
            <DialogContent className="max-h-[85vh] overflow-y-auto">
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

                {/* Guide PDF Upload */}
                <div className="border-t pt-4 space-y-3">
                  <Label className="text-base font-semibold">دليل التنسيق والتسجيل</Label>
                  <div className="space-y-2">
                    <Label className="text-sm">ملف الدليل (PDF)</Label>
                    {guideUrl ? (
                      <div className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <a href={guideUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-1">
                          عرض الملف المرفوع
                        </a>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={removeGuide}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-1.5">
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {uploading ? "جاري الرفع..." : "رفع ملف PDF"}
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">نص الدليل (للمساعد الذكي)</Label>
                    <Textarea
                      value={guideText}
                      onChange={(e) => setGuideText(e.target.value)}
                      placeholder="انسخ والصق محتوى دليل التنسيق هنا ليتمكن المساعد الذكي من الإجابة عن مواعيد التسجيل والشروط..."
                      rows={5}
                    />
                    <p className="text-xs text-muted-foreground">هذا النص يُستخدم من المساعد الذكي (مُفَاضِل) للإجابة عن استفسارات الطلاب</p>
                  </div>
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
                <div className="flex items-center gap-2">
                  <div>
                    <p className="font-semibold text-sm">{u.name_ar}</p>
                    <p className="text-xs text-muted-foreground">{u.code} {u.name_en && `• ${u.name_en}`}</p>
                  </div>
                  {(u as any).guide_url && (
                    <span title="يوجد دليل تنسيق"><FileText className="w-4 h-4 text-primary" /></span>
                  )}
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
