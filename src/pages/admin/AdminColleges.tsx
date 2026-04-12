import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import PermissionGate from "@/components/admin/PermissionGate";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, GraduationCap, Percent, CalendarClock, FileText, AlertCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [minGpa, setMinGpa] = useState<string>("");
  const [acceptanceRate, setAcceptanceRate] = useState<string>("");
  const [requiredDocs, setRequiredDocs] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [notes, setNotes] = useState("");
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
    setEditing(null); setNameAr(""); setNameEn(""); setCode(""); setUniversityId(filterUni); setIsActive(true); setDisplayOrder(0);
    setMinGpa(""); setAcceptanceRate(""); setRequiredDocs(""); setRegistrationDeadline(""); setNotes("");
    setDialogOpen(true);
  };

  const openEdit = (c: Tables<"colleges">) => {
    setEditing(c); setNameAr(c.name_ar); setNameEn(c.name_en || ""); setCode(c.code); setUniversityId(c.university_id); setIsActive(c.is_active); setDisplayOrder(c.display_order);
    setMinGpa(c.min_gpa != null ? String(c.min_gpa) : ""); setAcceptanceRate(c.acceptance_rate != null ? String(c.acceptance_rate) : "");
    setRequiredDocs(c.required_documents ? c.required_documents.join("\n") : ""); setRegistrationDeadline(c.registration_deadline || ""); setNotes(c.notes || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nameAr || !code || !universityId) { toast({ variant: "destructive", title: "يرجى ملء الحقول المطلوبة" }); return; }
    setSaving(true);
    const docsArray = requiredDocs.trim() ? requiredDocs.split("\n").map(d => d.trim()).filter(Boolean) : null;
    const payload = {
      name_ar: nameAr, name_en: nameEn || null, code, university_id: universityId, is_active: isActive, display_order: displayOrder,
      min_gpa: minGpa ? Number(minGpa) : null,
      acceptance_rate: acceptanceRate ? Number(acceptanceRate) : null,
      required_documents: docsArray,
      registration_deadline: registrationDeadline || null,
      notes: notes || null,
    };
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

  // Count how many admission fields are filled for a college
  const getAdmissionCompleteness = (c: Tables<"colleges">) => {
    let filled = 0;
    let total = 4;
    if (c.min_gpa != null) filled++;
    if (c.acceptance_rate != null) filled++;
    if (c.registration_deadline) filled++;
    if (c.required_documents && c.required_documents.length > 0) filled++;
    return { filled, total };
  };

  if (authLoading || loading) return <AdminLayout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <PermissionGate permission="universities">
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold">الكليات ودليل القبول</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} كلية</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 ml-1" />إضافة</Button></DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>{editing ? "تعديل كلية" : "إضافة كلية"}</DialogTitle>
                <DialogDescription>أدخل بيانات الكلية ومتطلبات القبول</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[65vh] pl-1">
              <div className="space-y-5 pr-3">
                {/* Basic Info */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4" /> البيانات الأساسية
                  </h3>
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
                </div>

                {/* Admission Info */}
                <div className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                    <FileText className="w-4 h-4" /> بيانات القبول والتنسيق
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5" /> الحد الأدنى للمعدل
                      </Label>
                      <Input type="number" step="0.1" value={minGpa} onChange={(e) => setMinGpa(e.target.value)} placeholder="مثال: 85.5" />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5" /> الطاقة الاستيعابية
                      </Label>
                      <Input type="number" step="0.1" value={acceptanceRate} onChange={(e) => setAcceptanceRate(e.target.value)} placeholder="مثال: 30" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <CalendarClock className="w-3.5 h-3.5" /> موعد التنسيق
                    </Label>
                    <Input value={registrationDeadline} onChange={(e) => setRegistrationDeadline(e.target.value)} placeholder="مثال: سبتمبر 2025" />
                  </div>
                  <div className="space-y-2">
                    <Label>الوثائق المطلوبة (سطر لكل وثيقة)</Label>
                    <Textarea value={requiredDocs} onChange={(e) => setRequiredDocs(e.target.value)} rows={3} placeholder={"شهادة الثانوية\nصورة الهوية\nصور شخصية"} />
                  </div>
                  <div className="space-y-2"><Label>ملاحظات</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
                </div>

                <div className="flex items-center gap-2 border-t pt-4">
                  <Switch checked={isActive} onCheckedChange={setIsActive} /><Label>مفعّلة</Label>
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? "جاري الحفظ..." : "حفظ"}</Button>
              </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        <select value={filterUni} onChange={(e) => setFilterUni(e.target.value)} className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm w-full md:w-64">
          <option value="">جميع الجامعات</option>
          {universities.map((u) => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
        </select>

        <div className="space-y-2">
          {filtered.map((c) => {
            const { filled, total } = getAdmissionCompleteness(c);
            const isComplete = filled === total;
            return (
              <Card key={c.id} className={!c.is_active ? "opacity-50" : ""}>
                <CardContent className="py-3 px-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{c.name_ar}</p>
                      <p className="text-xs text-muted-foreground">{getUniName(c.university_id)} • {c.code}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!isComplete && (
                        <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                          <AlertCircle className="w-3 h-3" />
                          {filled}/{total}
                        </Badge>
                      )}
                      {isComplete && (
                        <Badge variant="outline" className="text-xs text-green-600 border-green-300 bg-green-50 dark:bg-green-950/30">
                          مكتمل
                        </Badge>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                      {isAdmin && <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                    </div>
                  </div>
                  {/* Admission summary row */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {c.min_gpa != null && (
                      <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" /> الحد الأدنى: {c.min_gpa}%</span>
                    )}
                    {c.acceptance_rate != null && (
                      <span className="flex items-center gap-1"><Percent className="w-3 h-3" /> الطاقة الاستيعابية: {c.acceptance_rate}</span>
                    )}
                    {c.registration_deadline && (
                      <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" /> {c.registration_deadline}</span>
                    )}
                    {c.required_documents && c.required_documents.length > 0 && (
                      <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {c.required_documents.length} وثيقة</span>
                    )}
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

export default AdminColleges;
