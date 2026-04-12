import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import PermissionGate from "@/components/admin/PermissionGate";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, Upload, Download } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as XLSX from "xlsx";

const AdminMajors = () => {
  const { loading: authLoading, isAdmin } = useAuth("moderator");
  const { toast } = useToast();
  const [majors, setMajors] = useState<Tables<"majors">[]>([]);
  const [colleges, setColleges] = useState<Tables<"colleges">[]>([]);
  const [universities, setUniversities] = useState<Tables<"universities">[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"majors"> | null>(null);
  const [filterCollege, setFilterCollege] = useState("");
  const [filterUni, setFilterUni] = useState("");

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [code, setCode] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMode, setImportMode] = useState<"add" | "update">("add");
  const [importResults, setImportResults] = useState<{ added: number; updated: number; errors: string[] } | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    const [{ data: m }, { data: c }, { data: u }] = await Promise.all([
      supabase.from("majors").select("*").order("display_order"),
      supabase.from("colleges").select("*").eq("is_active", true).order("display_order"),
      supabase.from("universities").select("*").eq("is_active", true).order("display_order"),
    ]);
    if (m) setMajors(m);
    if (c) setColleges(c);
    if (u) setUniversities(u);
    setLoading(false);
  };

  useEffect(() => { if (!authLoading) fetchData(); }, [authLoading]);

  const filteredColleges = filterUni ? colleges.filter((c) => c.university_id === filterUni) : colleges;
  const filtered = majors.filter((m) => {
    if (filterCollege && m.college_id !== filterCollege) return false;
    if (filterUni && !filteredColleges.some((c) => c.id === m.college_id)) return false;
    return true;
  });

  const getCollegeName = (id: string) => colleges.find((c) => c.id === id)?.name_ar || "";

  const openCreate = () => {
    setEditing(null); setNameAr(""); setNameEn(""); setCode(""); setCollegeId(filterCollege); setIsActive(true); setDisplayOrder(0); setDialogOpen(true);
  };

  const openEdit = (m: Tables<"majors">) => {
    setEditing(m); setNameAr(m.name_ar); setNameEn(m.name_en || ""); setCode(m.code); setCollegeId(m.college_id); setIsActive(m.is_active); setDisplayOrder(m.display_order); setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nameAr || !code || !collegeId) { toast({ variant: "destructive", title: "يرجى ملء الحقول المطلوبة" }); return; }
    setSaving(true);
    const payload = { name_ar: nameAr, name_en: nameEn || null, code, college_id: collegeId, is_active: isActive, display_order: displayOrder };
    if (editing) {
      const { error } = await supabase.from("majors").update(payload).eq("id", editing.id);
      if (error) toast({ variant: "destructive", title: error.message }); else toast({ title: "تم التحديث" });
    } else {
      const { error } = await supabase.from("majors").insert(payload);
      if (error) toast({ variant: "destructive", title: error.message }); else toast({ title: "تمت الإضافة" });
    }
    setSaving(false); setDialogOpen(false); fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد؟")) return;
    const { error } = await supabase.from("majors").delete().eq("id", id);
    if (error) toast({ variant: "destructive", title: error.message }); else { toast({ title: "تم الحذف" }); fetchData(); }
  };

  // --- Excel Import ---
  const downloadTemplate = () => {
    const headers = ["الكلية", "اسم التخصص بالعربية", "اسم التخصص بالإنجليزية", "الرمز"];
    const example = ["كلية الطب والعلوم الصحية", "طب عام وجراحة", "General Medicine & Surgery", "MED-GEN"];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws["!cols"] = headers.map(() => ({ wch: 30 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "تخصصات");
    XLSX.writeFile(wb, "قالب_استيراد_التخصصات.xlsx");
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

      // Build college name/code → id map
      const collegeMap = new Map<string, string>();
      colleges.forEach(c => {
        collegeMap.set(c.name_ar.trim(), c.id);
        if (c.name_en) collegeMap.set(c.name_en.trim().toLowerCase(), c.id);
        collegeMap.set(c.code.trim().toLowerCase(), c.id);
      });

      const errors: string[] = [];
      let added = 0;
      let updated = 0;
      const dataRows = rows.slice(1).filter(r => r.some(cell => cell != null && String(cell).trim()));

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 2;
        const collegeName = String(row[0] || "").trim();
        const majorNameAr = String(row[1] || "").trim();
        const majorNameEn = String(row[2] || "").trim() || null;
        const majorCode = String(row[3] || "").trim();

        if (!majorNameAr || !majorCode) {
          errors.push(`سطر ${rowNum}: اسم التخصص والرمز مطلوبان`);
          continue;
        }

        const colId = collegeMap.get(collegeName) || collegeMap.get(collegeName.toLowerCase());
        if (!colId) {
          errors.push(`سطر ${rowNum}: الكلية "${collegeName}" غير موجودة`);
          continue;
        }

        const payload = {
          name_ar: majorNameAr, name_en: majorNameEn, code: majorCode,
          college_id: colId, is_active: true, display_order: 0,
        };

        if (importMode === "update") {
          const existing = majors.find(m => m.college_id === colId && (m.code === majorCode || m.name_ar === majorNameAr));
          if (existing) {
            const { error } = await supabase.from("majors").update(payload).eq("id", existing.id);
            if (error) { errors.push(`سطر ${rowNum}: ${error.message}`); } else { updated++; }
            continue;
          }
        }

        const { error } = await supabase.from("majors").insert(payload);
        if (error) { errors.push(`سطر ${rowNum}: ${error.message}`); } else { added++; }
      }

      setImportResults({ added, updated, errors });
      if (added > 0 || updated > 0) {
        toast({ title: `تم استيراد ${added} تخصص جديد${updated > 0 ? ` وتحديث ${updated} تخصص` : ""}` });
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
            <h1 className="text-2xl font-bold">التخصصات</h1>
            <p className="text-sm text-muted-foreground">{filtered.length} تخصص</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={importDialogOpen} onOpenChange={(o) => { setImportDialogOpen(o); if (!o) setImportResults(null); }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5"><Upload className="w-4 h-4" />استيراد Excel</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>استيراد تخصصات من Excel</DialogTitle>
                  <DialogDescription>حمّل القالب واملأه ثم ارفعه لإضافة تخصصات بالجملة</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Button variant="outline" onClick={downloadTemplate} className="w-full gap-1.5">
                    <Download className="w-4 h-4" /> تحميل قالب Excel
                  </Button>
                  <div className="space-y-2">
                    <Label>وضع الاستيراد</Label>
                    <div className="flex gap-2">
                      <Button variant={importMode === "add" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setImportMode("add")}>
                        إضافة فقط
                      </Button>
                      <Button variant={importMode === "update" ? "default" : "outline"} size="sm" className="flex-1" onClick={() => setImportMode("update")}>
                        تحديث الموجود
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {importMode === "add" ? "سيتم إضافة جميع السطور كتخصصات جديدة" : "سيتم تحديث التخصصات الموجودة (بالرمز أو الاسم) وإضافة الجديدة"}
                    </p>
                  </div>
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
                        <p className="text-green-600 dark:text-green-400">✓ تم إضافة {importResults.added} تخصص جديد</p>
                      )}
                      {importResults.updated > 0 && (
                        <p className="text-blue-600 dark:text-blue-400">✓ تم تحديث {importResults.updated} تخصص موجود</p>
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
              <DialogContent>
                <DialogHeader><DialogTitle>{editing ? "تعديل تخصص" : "إضافة تخصص"}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>الكلية *</Label>
                    <select value={collegeId} onChange={(e) => setCollegeId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">اختر الكلية</option>
                      {colleges.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2"><Label>الاسم بالعربية *</Label><Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} /></div>
                  <div className="space-y-2"><Label>الاسم بالإنجليزية</Label><Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} dir="ltr" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>الرمز *</Label><Input value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" /></div>
                    <div className="space-y-2"><Label>ترتيب العرض</Label><Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} /></div>
                  </div>
                  <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>مفعّل</Label></div>
                  <Button onClick={handleSave} disabled={saving} className="w-full">{saving ? "جاري الحفظ..." : "حفظ"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <select value={filterUni} onChange={(e) => { setFilterUni(e.target.value); setFilterCollege(""); }} className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex-1 min-w-[150px]">
            <option value="">جميع الجامعات</option>
            {universities.map((u) => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
          </select>
          <select value={filterCollege} onChange={(e) => setFilterCollege(e.target.value)} className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm flex-1 min-w-[150px]">
            <option value="">جميع الكليات</option>
            {filteredColleges.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          {filtered.map((m) => (
            <Card key={m.id} className={!m.is_active ? "opacity-50" : ""}>
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div>
                  <p className="font-semibold text-sm">{m.name_ar}</p>
                  <p className="text-xs text-muted-foreground">{getCollegeName(m.college_id)} • {m.code}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="w-4 h-4" /></Button>
                  {isAdmin && <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
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

export default AdminMajors;