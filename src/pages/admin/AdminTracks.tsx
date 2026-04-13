import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import PermissionGate from "@/components/admin/PermissionGate";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, Loader2, Route, FlaskConical,
  Building2, AlertTriangle, Check,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  getTracks, createTrack, updateTrack,
  getTrackSubjects, addSubjectToTrack, removeSubjectFromTrack,
  getCollegesWithTracks, assignTrackToCollege,
  type Track, type TrackSubject, type CollegeWithTrack,
} from "@/services/trackService";

// ── Helpers ────────────────────────────────────────────────
interface Subject {
  id: string;
  name_ar: string;
  name_en: string | null;
  code: string;
  is_active: boolean;
}

interface University {
  id: string;
  name_ar: string;
}

// ── Main Component ─────────────────────────────────────────
const AdminTracks = () => {
  const { loading: authLoading, isAdmin } = useAuth("admin");
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── Data queries ──
  const { data: tracks = [], isLoading: tracksLoading } = useQuery({
    queryKey: ["admin-tracks"],
    queryFn: getTracks,
  });

  const { data: trackSubjects = [] } = useQuery({
    queryKey: ["admin-track-subjects"],
    queryFn: getTrackSubjects,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["admin-subjects-list"],
    queryFn: async () => {
      const { data } = await supabase.from("subjects").select("id, name_ar, name_en, code, is_active").order("display_order");
      return (data ?? []) as Subject[];
    },
  });

  const { data: colleges = [] } = useQuery({
    queryKey: ["admin-colleges-tracks"],
    queryFn: getCollegesWithTracks,
  });

  const { data: universities = [] } = useQuery({
    queryKey: ["admin-universities-list"],
    queryFn: async () => {
      const { data } = await supabase.from("universities").select("id, name_ar").order("display_order");
      return (data ?? []) as University[];
    },
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-tracks"] });
    qc.invalidateQueries({ queryKey: ["admin-track-subjects"] });
    qc.invalidateQueries({ queryKey: ["admin-colleges-tracks"] });
  };

  const loading = tracksLoading;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {isAdmin ? (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold">إدارة المسارات الأكاديمية</h1>
            <p className="text-sm text-muted-foreground">
              إدارة المسارات (طبي، هندسي، إداري) وربط المواد والكليات بها
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} dir="rtl">
            <TabsList>
              <TabsTrigger value="tracks" className="gap-1.5">
                <Route className="w-4 h-4" />
                المسارات والمواد
              </TabsTrigger>
              <TabsTrigger value="colleges" className="gap-1.5">
                <Building2 className="w-4 h-4" />
                تعيين الكليات
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tracks" className="mt-4">
              <TracksTab
                tracks={tracks}
                trackSubjects={trackSubjects}
                subjects={subjects}
                onInvalidate={invalidateAll}
              />
            </TabsContent>

            <TabsContent value="colleges" className="mt-4">
              <CollegesTab
                colleges={colleges}
                tracks={tracks}
                universities={universities}
                trackSubjects={trackSubjects}
                subjects={subjects}
                onInvalidate={invalidateAll}
              />
            </TabsContent>
          </Tabs>
        </div>
      </PermissionGate>
    </AdminLayout>
  );
};

// ═══════════════════════════════════════════════════════════
// TRACKS TAB
// ═══════════════════════════════════════════════════════════
function TracksTab({
  tracks, trackSubjects, subjects, onInvalidate,
}: {
  tracks: Track[];
  trackSubjects: TrackSubject[];
  subjects: Subject[];
  onInvalidate: () => void;
}) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Track | null>(null);
  const [form, setForm] = useState({ name_ar: "", name_en: "", slug: "", is_active: true, display_order: 0 });
  const [saving, setSaving] = useState(false);

  // Subject mapping dialog
  const [subjectDialogTrack, setSubjectDialogTrack] = useState<Track | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm({ name_ar: "", name_en: "", slug: "", is_active: true, display_order: tracks.length });
    setDialogOpen(true);
  };

  const openEdit = (t: Track) => {
    setEditing(t);
    setForm({
      name_ar: t.name_ar,
      name_en: t.name_en || "",
      slug: t.slug,
      is_active: t.is_active,
      display_order: t.display_order,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name_ar.trim() || !form.slug.trim()) {
      toast({ variant: "destructive", title: "يرجى ملء الاسم والرمز المختصر" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateTrack(editing.id, {
          name_ar: form.name_ar.trim(),
          name_en: form.name_en.trim() || null,
          slug: form.slug.trim(),
          is_active: form.is_active,
          display_order: form.display_order,
        });
        toast({ title: "تم تحديث المسار" });
      } else {
        await createTrack({
          name_ar: form.name_ar.trim(),
          name_en: form.name_en.trim() || null,
          slug: form.slug.trim(),
          is_active: form.is_active,
          display_order: form.display_order,
        });
        toast({ title: "تم إنشاء المسار" });
      }
      setDialogOpen(false);
      onInvalidate();
    } catch (e: any) {
      toast({ variant: "destructive", title: e.message || "خطأ" });
    }
    setSaving(false);
  };

  const getSubjectsForTrack = (trackId: string) =>
    trackSubjects.filter((ts) => ts.track_id === trackId);

  const handleToggleSubject = async (track: Track, subject: Subject) => {
    const existing = trackSubjects.find(
      (ts) => ts.track_id === track.id && ts.subject_id === subject.id,
    );
    try {
      if (existing) {
        await removeSubjectFromTrack(existing.id);
        toast({ title: `تمت إزالة "${subject.name_ar}" من "${track.name_ar}"` });
      } else {
        await addSubjectToTrack(track.id, subject.id);
        toast({ title: `تمت إضافة "${subject.name_ar}" إلى "${track.name_ar}"` });
      }
      onInvalidate();
    } catch (e: any) {
      toast({ variant: "destructive", title: e.message });
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{tracks.length} مسار</p>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 ml-1" />
          إضافة مسار
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tracks.map((track) => {
          const linkedSubjects = getSubjectsForTrack(track.id);
          const subjectNames = linkedSubjects
            .map((ts) => subjects.find((s) => s.id === ts.subject_id)?.name_ar)
            .filter(Boolean);
          const hasNoSubjects = linkedSubjects.length === 0;

          return (
            <Card key={track.id} className={!track.is_active ? "opacity-60" : ""}>
              <CardContent className="py-4 px-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-lg">{track.name_ar}</p>
                    <p className="text-xs text-muted-foreground">
                      {track.name_en || track.slug}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setSubjectDialogTrack(track)} title="إدارة المواد">
                      <FlaskConical className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(track)} title="تعديل">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  <Badge variant={track.is_active ? "default" : "secondary"} className="text-[10px]">
                    {track.is_active ? "نشط" : "غير نشط"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    slug: {track.slug}
                  </Badge>
                </div>

                {/* Subjects list */}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">المواد المرتبطة:</p>
                  {hasNoSubjects ? (
                    <div className="flex items-center gap-1 text-xs text-destructive">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      لا توجد مواد — يجب إضافة مادة واحدة على الأقل
                    </div>
                  ) : (
                    <div className="flex gap-1 flex-wrap">
                      {subjectNames.map((name) => (
                        <Badge key={name} variant="outline" className="text-[10px]">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Track Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل المسار" : "إضافة مسار جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>الاسم بالعربي *</Label>
              <Input
                value={form.name_ar}
                onChange={(e) => setForm((p) => ({ ...p, name_ar: e.target.value }))}
                placeholder="المسار الطبي"
              />
            </div>
            <div className="space-y-2">
              <Label>الاسم بالإنجليزي</Label>
              <Input
                value={form.name_en}
                onChange={(e) => setForm((p) => ({ ...p, name_en: e.target.value }))}
                placeholder="Medical Track"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>الرمز المختصر (slug) *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                  placeholder="medical"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>ترتيب العرض</Label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm((p) => ({ ...p, display_order: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
              />
              <Label>نشط</Label>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : null}
              {saving ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subject Mapping Dialog */}
      <Dialog open={!!subjectDialogTrack} onOpenChange={(open) => !open && setSubjectDialogTrack(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>مواد "{subjectDialogTrack?.name_ar}"</DialogTitle>
            <DialogDescription>
              اختر المواد الدراسية المرتبطة بهذا المسار. المواد المختارة ستظهر لطلاب الكليات المنتمية لهذا المسار.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 max-h-[50vh] overflow-y-auto">
            {subjects.filter((s) => s.is_active).map((subject) => {
              const isLinked = trackSubjects.some(
                (ts) => ts.track_id === subjectDialogTrack?.id && ts.subject_id === subject.id,
              );
              return (
                <div
                  key={subject.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                    isLinked ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50 border border-transparent"
                  }`}
                  onClick={() => subjectDialogTrack && handleToggleSubject(subjectDialogTrack, subject)}
                >
                  <div>
                    <p className="text-sm font-medium">{subject.name_ar}</p>
                    <p className="text-[10px] text-muted-foreground">{subject.code}</p>
                  </div>
                  {isLinked ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : (
                    <Plus className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// COLLEGES TAB
// ═══════════════════════════════════════════════════════════
function CollegesTab({
  colleges, tracks, universities, trackSubjects, subjects, onInvalidate,
}: {
  colleges: CollegeWithTrack[];
  tracks: Track[];
  universities: University[];
  trackSubjects: TrackSubject[];
  subjects: Subject[];
  onInvalidate: () => void;
}) {
  const { toast } = useToast();
  const [filterUni, setFilterUni] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    college: CollegeWithTrack;
    newTrackId: string | null;
  } | null>(null);

  const filtered = filterUni
    ? colleges.filter((c) => c.university_id === filterUni)
    : colleges;

  const getTrackName = (trackId: string | null) =>
    tracks.find((t) => t.id === trackId)?.name_ar ?? "—";

  const handleTrackChange = (college: CollegeWithTrack, newTrackId: string) => {
    const val = newTrackId === "__none__" ? null : newTrackId;
    if (val === college.admission_track_id) return;
    setConfirmDialog({ college, newTrackId: val });
  };

  const confirmAssignment = async () => {
    if (!confirmDialog) return;
    try {
      await assignTrackToCollege(confirmDialog.college.id, confirmDialog.newTrackId);
      toast({ title: `تم تعيين المسار لـ "${confirmDialog.college.name_ar}"` });
      onInvalidate();
    } catch (e: any) {
      toast({ variant: "destructive", title: e.message });
    }
    setConfirmDialog(null);
  };

  const getSubjectsForTrack = (trackId: string | null) => {
    if (!trackId) return [];
    return trackSubjects
      .filter((ts) => ts.track_id === trackId)
      .map((ts) => subjects.find((s) => s.id === ts.subject_id)?.name_ar)
      .filter(Boolean);
  };

  const noTrackColleges = colleges.filter((c) => !c.admission_track_id);

  return (
    <>
      {noTrackColleges.length > 0 && (
        <Card className="mb-4 border-destructive/30 bg-destructive/5">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-destructive text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              {noTrackColleges.length} كلية بدون مسار محدد
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              الكليات بدون مسار لن يظهر لطلابها أي محتوى تعليمي
            </p>
          </CardContent>
        </Card>
      )}

      <div className="mb-4">
        <select
          value={filterUni}
          onChange={(e) => setFilterUni(e.target.value)}
          className="flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="">جميع الجامعات ({colleges.length})</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name_ar} ({colleges.filter((c) => c.university_id === u.id).length})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map((college) => {
          const uni = universities.find((u) => u.id === college.university_id);
          const currentSubjects = getSubjectsForTrack(college.admission_track_id);
          const hasNoTrack = !college.admission_track_id;

          return (
            <Card key={college.id} className={hasNoTrack ? "border-destructive/30" : ""}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{college.name_ar}</p>
                    <p className="text-[10px] text-muted-foreground">{uni?.name_ar}</p>
                    {currentSubjects.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1">
                        {currentSubjects.map((name) => (
                          <Badge key={name} variant="outline" className="text-[9px]">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={college.admission_track_id ?? "__none__"}
                      onChange={(e) => handleTrackChange(college, e.target.value)}
                      className={`flex h-8 rounded-md border px-2 text-xs ${
                        hasNoTrack
                          ? "border-destructive text-destructive bg-destructive/5"
                          : "border-input bg-background"
                      }`}
                    >
                      <option value="__none__">— بدون مسار —</option>
                      {tracks.filter((t) => t.is_active).map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name_ar}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد تغيير المسار</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                هل تريد تغيير مسار <strong>"{confirmDialog?.college.name_ar}"</strong> من{" "}
                <strong>{getTrackName(confirmDialog?.college.admission_track_id ?? null)}</strong>{" "}
                إلى <strong>{confirmDialog?.newTrackId ? getTrackName(confirmDialog.newTrackId) : "بدون مسار"}</strong>؟
              </p>
              <div className="flex items-start gap-2 bg-destructive/5 text-destructive p-3 rounded-lg text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>سيؤدي هذا إلى تغيير المحتوى التعليمي المرئي لطلاب هذه الكلية</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAssignment}>
              تأكيد التغيير
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default AdminTracks;
