import { useEffect, useState, useRef } from "react";
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
import { Plus, Pencil, Trash2, Loader2, GraduationCap, Percent, CalendarClock, FileText, AlertCircle, Upload, Download } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as XLSX from "xlsx";

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
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMode, setImportMode] = useState<"add" | "update">("add");
  const [importResults, setImportResults] = useState<{ added: number; updated: number; errors: string[] } | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
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
    setMinGpa(c.min_gpa != null ? String(c.min_gpa) : ""); setAcceptanceRate(c.capacity != null ? String(c.capacity) : "");
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
      capacity: acceptanceRate ? Number(acceptanceRate) : null,
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
    if (c.capacity != null) filled++;
    if (c.registration_deadline) filled++;
    if (c.required_documents && c.required_documents.length > 0) filled++;
    return { filled, total };
  };

  // --- Excel Import ---
  const downloadCollegeTemplate = () => {
    const headers = ["الجامعة", "اسم الكلية بالعربية", "اسم الكلية بالإنجليزية", "الرمز", "الحد الأدنى للمعدل", "الطاقة الاستيعابية", "موعد التنسيق", "الوثائق المطلوبة (مفصولة بفاصلة)", "ملاحظات"];
    const example = ["جامعة صنعاء", "كلية الطب", "Faculty of Medicine", "MED", "85", "150", "سبتمبر 2025", "شهادة الثانوية, صورة الهوية", ""];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws["!cols"] = headers.map(() => ({ wch: 25 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "كليات");
    XLSX.writeFile(wb, "قالب_استيراد_الكليات.xlsx");
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResults(null);

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      if (rows.length < 2) {
        toast({ variant: "destructive", title: "الملف فارغ أو لا يحتوي على بيانات" });
        setImporting(false);
        return;
      }

      // Build university name → id map
      const uniMap = new Map<string, string>();
      universities.forEach(u => {
        uniMap.set(u.name_ar.trim(), u.id);
        if (u.name_en) uniMap.set(u.name_en.trim().toLowerCase(), u.id);
        uniMap.set(u.code.trim().toLowerCase(), u.id);
      });

      const errors: string[] = [];
      let added = 0;
      let updated = 0;
      const dataRows = rows.slice(1).filter(r => r.some(cell => cell != null && String(cell).trim()));

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 2;
        const uniName = String(row[0] || "").trim();
        const nameAr = String(row[1] || "").trim();
        const nameEn = String(row[2] || "").trim() || null;
        const code = String(row[3] || "").trim();
        const minGpa = row[4] != null && String(row[4]).trim() ? Number(row[4]) : null;
        const capacity = row[5] != null && String(row[5]).trim() ? Number(row[5]) : null;
        const deadline = String(row[6] || "").trim() || null;
        const docsStr = String(row[7] || "").trim();
        const docs = docsStr ? docsStr.split(",").map(d => d.trim()).filter(Boolean) : null;
        const notes = String(row[8] || "").trim() || null;

        if (!nameAr || !code) {
          errors.push(`سطر ${rowNum}: اسم الكلية والرمز مطلوبان`);
          continue;
        }

        const uniId = uniMap.get(uniName) || uniMap.get(uniName.toLowerCase());
        if (!uniId) {
          errors.push(`سطر ${rowNum}: الجامعة "${uniName}" غير موجودة`);
          continue;
        }

        const payload = {
          name_ar: nameAr, name_en: nameEn, code, university_id: uniId,
          min_gpa: minGpa, capacity, registration_deadline: deadline,
          required_documents: docs, notes, is_active: true, display_order: 0,
        };

        if (importMode === "update") {
          // Try to find existing college by code + university
          const existing = colleges.find(c => c.university_id === uniId && (c.code === code || c.name_ar === nameAr));
          if (existing) {
            const { error } = await supabase.from("colleges").update(payload).eq("id", existing.id);
            if (error) { errors.push(`سطر ${rowNum}: ${error.message}`); } else { updated++; }
            continue;
          }
        }

        // Insert new
        const { error } = await supabase.from("colleges").insert(payload);
        if (error) { errors.push(`سطر ${rowNum}: ${error.message}`); } else { added++; }
      }

      setImportResults({ added, updated, errors });
      if (added > 0 || updated > 0) {
        toast({ title: `تم استيراد ${added} كلية جديدة${updated > 0 ? ` وتحديث ${updated} كلية` : ""}` });
        fetchData();
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "خطأ في قراءة الملف: " + err.message });
    }
    setImporting(false);
    if (importFileRef.current) importFileRef.current.value = "";
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
          <div className="flex gap-2">
            <Dialog open={importDialogOpen} onOpenChange={(o) => { setImportDialogOpen(o); if (!o) setImportResults(null); }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5"><Upload className="w-4 h-4" />استيراد Excel</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>استيراد كليات من Excel</DialogTitle>
                  <DialogDescription>حمّل القالب واملأه ثم ارفعه لإضافة كليات بالجملة</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Button variant="outline" onClick={downloadCollegeTemplate} className="w-full gap-1.5">
                    <Download className="w-4 h-4" /> تحميل قالب Excel
                  </Button>
                  <div className="space-y-2">
                    <Label>اختر ملف (Excel)</Label>
                    <Input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} disabled={importing} />
                  </div>
                  {importing && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" /> جاري الاستيراد...
                    </div>
                  )}
                  {importResults && (
                    <div className="space-y-2 text-sm">
                      {importResults.added > 0 && (
                        <p className="text-green-600 dark:text-green-400">✓ تم إضافة {importResults.added} كلية بنجاح</p>
                      )}
                      {importResults.errors.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-destructive font-medium">أخطاء ({importResults.errors.length}):</p>
                          <ScrollArea className="max-h-32">
                            {importResults.errors.map((err, i) => (
                              <p key={i} className="text-xs text-destructive">{err}</p>
                            ))}
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
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
                    {c.capacity != null && (
                      <span className="flex items-center gap-1"><Percent className="w-3 h-3" /> الطاقة الاستيعابية: {c.capacity}</span>
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
