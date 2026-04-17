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
import { Plus, Pencil, Trash2, Loader2, Upload, FileText, X, CalendarClock, GripVertical, Image, Search } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface TimelinePhase {
  phase: string;
  date: string;
}

interface GuideFile {
  url: string;
  name: string;
  type: "pdf" | "image";
  uploaded_at: string;
}

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
  const [guideFiles, setGuideFiles] = useState<GuideFile[]>([]);
  const [coordinationTimeline, setCoordinationTimeline] = useState<TimelinePhase[]>([]);
  const [coordinationInstructions, setCoordinationInstructions] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredUniversities = universities.filter(u =>
    !searchQuery.trim() ||
    u.name_ar.includes(searchQuery) ||
    (u.name_en && u.name_en.toLowerCase().includes(searchQuery.toLowerCase())) ||
    u.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    setGuideText(""); setGuideFiles([]);
    setCoordinationTimeline([]); setCoordinationInstructions("");
    setDialogOpen(true);
  };

  const openEdit = (u: Tables<"universities">) => {
    setEditing(u);
    setNameAr(u.name_ar);
    setNameEn(u.name_en || "");
    setCode(u.code);
    setIsActive(u.is_active);
    setDisplayOrder(u.display_order);
    setGuideText(u.guide_text || "");
    
    // Load guide_files from DB, fallback to guide_url migration
    const dbFiles = (u as any).guide_files;
    if (Array.isArray(dbFiles) && dbFiles.length > 0) {
      setGuideFiles(dbFiles);
    } else if (u.guide_url) {
      setGuideFiles([{ url: u.guide_url, name: "دليل التنسيق", type: u.guide_url.toLowerCase().endsWith(".pdf") ? "pdf" : "image", uploaded_at: u.created_at }]);
    } else {
      setGuideFiles([]);
    }

    const timeline = (u as any).coordination_timeline;
    setCoordinationTimeline(Array.isArray(timeline) ? timeline : []);
    setCoordinationInstructions((u as any).coordination_instructions || "");
    setDialogOpen(true);
  };

  const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const { safeFileExtension, validateUploadFile, FILE_PRESETS } = await import("@/lib/storageKey");

    // Pre-validate all files (size + type) before any upload
    for (const f of Array.from(files)) {
      const v = validateUploadFile(f, FILE_PRESETS.guide);
      if (!v.ok) {
        toast({ variant: "destructive", title: `ملف غير صالح: ${f.name}`, description: v.error });
        return;
      }
    }

    setUploading(true);
    const newFiles: GuideFile[] = [];

    for (const file of Array.from(files)) {
      // Sanitize key for Supabase Storage (ASCII only, no spaces/Arabic)
      const safeExt = safeFileExtension(file.name);
      const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${safeExt}`;
      let result = await supabase.storage.from("university-guides").upload(fileName, file, {
        contentType: file.type || undefined,
      });
      if (result.error && result.error.message?.includes("claim")) {
        await supabase.auth.refreshSession();
        result = await supabase.storage.from("university-guides").upload(fileName, file, {
          contentType: file.type || undefined,
        });
      }

      if (result.error) {
        toast({ variant: "destructive", title: `فشل رفع ${file.name}: ${result.error.message}` });
      } else {
        const { data: pub } = supabase.storage.from("university-guides").getPublicUrl(fileName);
        newFiles.push({
          url: pub.publicUrl,
          name: file.name, // عرض الاسم الأصلي (العربي) للمستخدم فقط
          type: file.type === "application/pdf" ? "pdf" : "image",
          uploaded_at: new Date().toISOString(),
        });
      }
    }

    if (newFiles.length > 0) {
      setGuideFiles(prev => [...prev, ...newFiles]);
      toast({ title: `تم رفع ${newFiles.length} ملف بنجاح` });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeGuideFile = (index: number) => {
    setGuideFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addTimelinePhase = () => {
    setCoordinationTimeline([...coordinationTimeline, { phase: "", date: "" }]);
  };

  const updateTimelinePhase = (index: number, field: keyof TimelinePhase, value: string) => {
    const updated = [...coordinationTimeline];
    updated[index] = { ...updated[index], [field]: value };
    setCoordinationTimeline(updated);
  };

  const removeTimelinePhase = (index: number) => {
    setCoordinationTimeline(coordinationTimeline.filter((_, i) => i !== index));
  };

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (index: number) => { dragItem.current = index; };
  const handleDragEnter = (index: number) => { dragOverItem.current = index; };
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const items = [...coordinationTimeline];
    const [removed] = items.splice(dragItem.current, 1);
    items.splice(dragOverItem.current, 0, removed);
    setCoordinationTimeline(items);
    dragItem.current = null;
    dragOverItem.current = null;
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
      guide_url: guideFiles.length > 0 ? guideFiles[0].url : null,
      guide_text: guideText || null,
      guide_files: guideFiles,
      coordination_timeline: coordinationTimeline.filter(p => p.phase || p.date),
      coordination_instructions: coordinationInstructions || null,
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
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-8 w-48"
              />
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

                {/* Guide Files Upload */}
                <div className="border-t pt-4 space-y-3">
                  <Label className="text-base font-semibold">دليل التنسيق والتسجيل</Label>
                  
                  {/* Uploaded files list */}
                  {guideFiles.length > 0 && (
                    <div className="space-y-2">
                      {guideFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                          {file.type === "image" ? (
                            <img src={file.url} alt={file.name} className="w-10 h-10 rounded object-cover shrink-0" />
                          ) : (
                            <FileText className="w-5 h-5 text-primary shrink-0" />
                          )}
                          <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-1 text-xs">
                            {file.name}
                          </a>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeGuideFile(idx)}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload button */}
                  <div>
                    <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" multiple onChange={handleFileUpload} className="hidden" />
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-1.5">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploading ? "جاري الرفع..." : "رفع ملفات (PDF أو صور)"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">يمكنك رفع أكثر من ملف دفعة واحدة</p>
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

                {/* Coordination Timeline */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold flex items-center gap-1.5">
                      <CalendarClock className="w-4 h-4" />
                      الجدول الزمني للتنسيق
                    </Label>
                    <Button type="button" variant="outline" size="sm" onClick={addTimelinePhase} className="gap-1">
                      <Plus className="w-3 h-3" /> إضافة مرحلة
                    </Button>
                  </div>
                  {coordinationTimeline.length === 0 && (
                    <p className="text-xs text-muted-foreground">لم تتم إضافة مراحل بعد</p>
                  )}
                  <div className="space-y-2">
                    {coordinationTimeline.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex gap-2 items-start border rounded-md p-2 bg-background"
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragEnter={() => handleDragEnter(idx)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                      >
                        <div className="cursor-grab active:cursor-grabbing pt-2 text-muted-foreground">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <Input placeholder="اسم المرحلة (مثال: المرحلة الأولى)" value={item.phase} onChange={(e) => updateTimelinePhase(idx, "phase", e.target.value)} />
                        </div>
                        <div className="flex-1 space-y-1">
                          <Input placeholder="التاريخ (مثال: 1 - 15 سبتمبر 2025)" value={item.date} onChange={(e) => updateTimelinePhase(idx, "date", e.target.value)} />
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => removeTimelinePhase(idx)}>
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Coordination Instructions */}
                <div className="border-t pt-4 space-y-2">
                  <Label className="text-base font-semibold">تعليمات التنسيق</Label>
                  <Textarea
                    value={coordinationInstructions}
                    onChange={(e) => setCoordinationInstructions(e.target.value)}
                    placeholder="أدخل تعليمات وإرشادات التنسيق للطلاب (تظهر تلقائياً في بطاقات الكليات)..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">تظهر هذه التعليمات تلقائياً في دليل الكليات التابعة لهذه الجامعة</p>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </div>
            </DialogContent>
           </Dialog>
          </div>
        </div>

        <div className="space-y-2">
          {filteredUniversities.map((u) => {
            const files: GuideFile[] = Array.isArray((u as any).guide_files) ? (u as any).guide_files : [];
            const hasFiles = files.length > 0 || !!u.guide_url;
            return (
              <Card key={u.id} className={!u.is_active ? "opacity-50" : ""}>
                <CardContent className="flex items-center justify-between py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="font-semibold text-sm">{u.name_ar}</p>
                      <p className="text-xs text-muted-foreground">{u.code} {u.name_en && `• ${u.name_en}`}</p>
                    </div>
                    {hasFiles && (
                      <span title={`${files.length} ملف مرفق`}>
                        <FileText className="w-4 h-4 text-primary" />
                      </span>
                    )}
                    {(u as any).coordination_timeline && Array.isArray((u as any).coordination_timeline) && (u as any).coordination_timeline.length > 0 && (
                      <span title="يوجد جدول زمني للتنسيق"><CalendarClock className="w-4 h-4 text-primary" /></span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="w-4 h-4" /></Button>
                    {isAdmin && <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      </PermissionGate>
    </AdminLayout>
  );
};

export default AdminUniversities;
