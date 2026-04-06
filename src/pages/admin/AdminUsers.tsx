import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, ShieldPlus, Trash2, UserCog, Settings2, KeyRound } from "lucide-react";
import { ALL_PERMISSIONS, PERMISSION_LABELS, type ModeratorPermission } from "@/hooks/useModeratorPermissions";

type AppRole = "admin" | "moderator" | "student";

interface ScopeRow {
  id: string;
  scope_type: string;
  scope_id: string | null;
  is_global: boolean;
}

interface UserWithRoles {
  user_id: string;
  name: string;
  roles: AppRole[];
  scopes: ScopeRow[];
  permissions: ModeratorPermission[];
}

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "مدير",
  moderator: "مشرف",
  student: "طالب",
};

const ROLE_COLORS: Record<AppRole, "default" | "secondary" | "destructive"> = {
  admin: "destructive",
  moderator: "default",
  student: "secondary",
};

const SCOPE_TYPE_LABELS: Record<string, string> = {
  global: "عام",
  university: "جامعة",
  college: "كلية",
  major: "تخصص",
};

const AdminUsers = () => {
  const { loading: authLoading } = useAuth("admin");
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add role dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [newRole, setNewRole] = useState<AppRole>("moderator");
  const [saving, setSaving] = useState(false);

  // Scope dialog
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [scopeUser, setScopeUser] = useState<UserWithRoles | null>(null);
  const [scopeIsGlobal, setScopeIsGlobal] = useState(false);
  const [scopeType, setScopeType] = useState<string>("university");
  const [scopeId, setScopeId] = useState("");
  const [scopeUniFilter, setScopeUniFilter] = useState("");

  // Permissions dialog
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [permUser, setPermUser] = useState<UserWithRoles | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<ModeratorPermission[]>([]);
  const [permSaving, setPermSaving] = useState(false);

  const fetchUsers = async () => {
    const [{ data: students }, { data: allRoles }, { data: allScopes }, { data: allPerms }, { data: u }, { data: c }, { data: m }] = await Promise.all([
      supabase.from("students").select("user_id, first_name, second_name, third_name, fourth_name"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("moderator_scopes").select("*"),
      supabase.from("moderator_permissions").select("user_id, permission"),
      supabase.from("universities").select("*").order("display_order"),
      supabase.from("colleges").select("*").order("display_order"),
      supabase.from("majors").select("*").order("display_order"),
    ]);

    if (u) setUniversities(u);
    if (c) setColleges(c);
    if (m) setMajors(m);
    if (!students || !allRoles) { setLoading(false); return; }

    const rolesMap = new Map<string, AppRole[]>();
    allRoles.forEach((r) => {
      const list = rolesMap.get(r.user_id) || [];
      list.push(r.role as AppRole);
      rolesMap.set(r.user_id, list);
    });

    const scopesMap = new Map<string, ScopeRow[]>();
    (allScopes || []).forEach((s: any) => {
      const list = scopesMap.get(s.user_id) || [];
      list.push(s);
      scopesMap.set(s.user_id, list);
    });

    const permsMap = new Map<string, ModeratorPermission[]>();
    (allPerms || []).forEach((p: any) => {
      const list = permsMap.get(p.user_id) || [];
      list.push(p.permission as ModeratorPermission);
      permsMap.set(p.user_id, list);
    });

    const userList: UserWithRoles[] = students.map((s) => ({
      user_id: s.user_id,
      name: [s.first_name, s.second_name, s.third_name, s.fourth_name].filter(Boolean).join(" ") || "بدون اسم",
      roles: rolesMap.get(s.user_id) || ["student"],
      scopes: scopesMap.get(s.user_id) || [],
      permissions: permsMap.get(s.user_id) || [],
    }));

    const studentUserIds = new Set(students.map((s) => s.user_id));
    rolesMap.forEach((roles, userId) => {
      if (!studentUserIds.has(userId)) {
        userList.push({ user_id: userId, name: "مستخدم", roles, scopes: scopesMap.get(userId) || [], permissions: permsMap.get(userId) || [] });
      }
    });

    setUsers(userList);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) fetchUsers();
  }, [authLoading]);

  const filtered = users.filter((u) => {
    if (!search) return true;
    return u.name.toLowerCase().includes(search.toLowerCase());
  });

  // Role management
  const openAddRole = (user: UserWithRoles) => {
    setSelectedUser(user);
    const missing = (["admin", "moderator", "student"] as AppRole[]).find((r) => !user.roles.includes(r));
    setNewRole(missing || "moderator");
    setDialogOpen(true);
  };

  const handleAddRole = async () => {
    if (!selectedUser) return;
    setSaving(true);
    const { error } = await supabase.from("user_roles").insert({ user_id: selectedUser.user_id, role: newRole });
    if (error) toast({ variant: "destructive", title: error.message.includes("duplicate") ? "هذا الدور موجود بالفعل" : error.message });
    else toast({ title: `تم إضافة دور "${ROLE_LABELS[newRole]}" بنجاح` });
    setSaving(false);
    setDialogOpen(false);
    fetchUsers();
  };

  const handleRemoveRole = async (userId: string, role: AppRole) => {
    if (!confirm(`هل أنت متأكد من إزالة دور "${ROLE_LABELS[role]}"؟`)) return;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) toast({ variant: "destructive", title: error.message });
    else { toast({ title: "تم إزالة الدور" }); fetchUsers(); }
  };

  // Scope management
  const openScopeDialog = (user: UserWithRoles) => {
    setScopeUser(user);
    setScopeIsGlobal(user.scopes.some((s) => s.is_global));
    setScopeType("university");
    setScopeId("");
    setScopeUniFilter("");
    setScopeDialogOpen(true);
  };

  const handleAddScope = async () => {
    if (!scopeUser) return;
    setSaving(true);

    if (scopeIsGlobal) {
      await supabase.from("moderator_scopes").delete().eq("user_id", scopeUser.user_id);
      const { error } = await supabase.from("moderator_scopes").insert({
        user_id: scopeUser.user_id,
        scope_type: "global",
        is_global: true,
      });
      if (error) toast({ variant: "destructive", title: error.message });
      else toast({ title: "تم تعيين المشرف كعام" });
    } else {
      if (!scopeId) { setSaving(false); return; }
      await supabase.from("moderator_scopes").delete().eq("user_id", scopeUser.user_id).eq("is_global", true);
      const { error } = await supabase.from("moderator_scopes").insert({
        user_id: scopeUser.user_id,
        scope_type: scopeType,
        scope_id: scopeId,
        is_global: false,
      });
      if (error) toast({ variant: "destructive", title: error.message.includes("duplicate") ? "هذا النطاق موجود بالفعل" : error.message });
      else toast({ title: "تم إضافة النطاق" });
    }

    setSaving(false);
    fetchUsers();
  };

  const handleRemoveScope = async (scopeId: string) => {
    const { error } = await supabase.from("moderator_scopes").delete().eq("id", scopeId);
    if (error) toast({ variant: "destructive", title: error.message });
    else { toast({ title: "تم إزالة النطاق" }); fetchUsers(); }
  };

  const getScopeName = (scope: ScopeRow) => {
    if (scope.is_global) return "مشرف عام - جميع المحتوى";
    if (scope.scope_type === "university") return universities.find((u) => u.id === scope.scope_id)?.name_ar || "جامعة";
    if (scope.scope_type === "college") return colleges.find((c) => c.id === scope.scope_id)?.name_ar || "كلية";
    if (scope.scope_type === "major") return majors.find((m) => m.id === scope.scope_id)?.name_ar || "تخصص";
    return "";
  };

  const scopeFilteredColleges = scopeUniFilter ? colleges.filter((c: any) => c.university_id === scopeUniFilter) : colleges;
  const scopeFilteredMajors = scopeUniFilter
    ? majors.filter((m: any) => scopeFilteredColleges.some((c: any) => c.id === m.college_id))
    : majors;

  const scopeOptions = () => {
    if (scopeType === "university") return universities.map((u: any) => ({ id: u.id, label: u.name_ar }));
    if (scopeType === "college") return scopeFilteredColleges.map((c: any) => ({ id: c.id, label: c.name_ar }));
    if (scopeType === "major") return scopeFilteredMajors.map((m: any) => ({ id: m.id, label: m.name_ar }));
    return [];
  };

  // Permissions management
  const openPermDialog = (user: UserWithRoles) => {
    setPermUser(user);
    setSelectedPerms([...user.permissions]);
    setPermDialogOpen(true);
  };

  const handleTogglePerm = (perm: ModeratorPermission) => {
    setSelectedPerms((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleSavePerms = async () => {
    if (!permUser) return;
    setPermSaving(true);

    // Delete all existing permissions for this user
    await supabase.from("moderator_permissions").delete().eq("user_id", permUser.user_id);

    // Insert selected permissions
    if (selectedPerms.length > 0) {
      const rows = selectedPerms.map((p) => ({
        user_id: permUser.user_id,
        permission: p,
      }));
      const { error } = await supabase.from("moderator_permissions").insert(rows);
      if (error) {
        toast({ variant: "destructive", title: error.message });
        setPermSaving(false);
        return;
      }
    }

    toast({ title: "تم حفظ الصلاحيات بنجاح" });
    setPermSaving(false);
    setPermDialogOpen(false);
    fetchUsers();
  };

  if (authLoading || loading) {
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
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">إدارة المستخدمين والأدوار</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} مستخدم</p>
        </div>

        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
        </div>

        <div className="space-y-2">
          {filtered.map((u) => (
            <Card key={u.user_id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{u.name}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {u.roles.map((role) => (
                        <Badge key={role} variant={ROLE_COLORS[role]} className="text-xs gap-1">
                          {ROLE_LABELS[role]}
                          {role !== "student" && (
                            <button onClick={() => handleRemoveRole(u.user_id, role)} className="hover:opacity-70 mr-0.5" title="إزالة الدور">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                    {/* Show scopes for moderators */}
                    {u.roles.includes("moderator") && u.scopes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {u.scopes.map((scope) => (
                          <Badge key={scope.id} variant="outline" className="text-[10px] gap-1">
                            {scope.is_global ? "🌐" : SCOPE_TYPE_LABELS[scope.scope_type]} {getScopeName(scope)}
                            <button onClick={() => handleRemoveScope(scope.id)} className="hover:opacity-70 mr-0.5">
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    {u.roles.includes("moderator") && u.scopes.length === 0 && (
                      <p className="text-[10px] text-amber-500 mt-1">⚠️ مشرف بدون نطاق محدد</p>
                    )}
                    {/* Show permissions for moderators */}
                    {u.roles.includes("moderator") && u.permissions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {u.permissions.map((perm) => (
                          <Badge key={perm} variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                            🔑 {PERMISSION_LABELS[perm]}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {u.roles.includes("moderator") && u.permissions.length === 0 && (
                      <p className="text-[10px] text-amber-500 mt-0.5">⚠️ مشرف بدون صلاحيات محددة</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openAddRole(u)}>
                      <ShieldPlus className="w-4 h-4 ml-1" />دور
                    </Button>
                    {u.roles.includes("moderator") && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => openScopeDialog(u)}>
                          <Settings2 className="w-4 h-4 ml-1" />نطاق
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openPermDialog(u)}>
                          <KeyRound className="w-4 h-4 ml-1" />صلاحيات
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Add Role Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserCog className="w-5 h-5" />إضافة دور لـ {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["admin", "moderator", "student"] as AppRole[])
                  .filter((r) => !selectedUser?.roles.includes(r))
                  .map((r) => (<SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddRole} disabled={saving} className="w-full">{saving ? "جاري الحفظ..." : "إضافة الدور"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scope Dialog */}
      <Dialog open={scopeDialogOpen} onOpenChange={setScopeDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings2 className="w-5 h-5" />نطاق المشرف: {scopeUser?.name}</DialogTitle>
            <DialogDescription>حدد نطاق صلاحيات المشرف - عام أو مقيّد بجامعات/كليات/تخصصات</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {scopeUser && scopeUser.scopes.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">النطاقات الحالية:</Label>
                <div className="flex flex-wrap gap-1">
                  {scopeUser.scopes.map((scope) => (
                    <Badge key={scope.id} variant="outline" className="text-xs gap-1">
                      {SCOPE_TYPE_LABELS[scope.scope_type]}: {getScopeName(scope)}
                      <button onClick={() => handleRemoveScope(scope.id)} className="hover:opacity-70"><Trash2 className="w-3 h-3" /></button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t pt-4 space-y-4">
              <Label className="font-semibold">إضافة نطاق جديد</Label>

              <div className="flex items-center gap-3">
                <Switch checked={scopeIsGlobal} onCheckedChange={setScopeIsGlobal} />
                <Label>مشرف عام (كل المحتوى)</Label>
              </div>

              {!scopeIsGlobal && (
                <>
                  <div className="space-y-2">
                    <Label>نوع النطاق</Label>
                    <Select value={scopeType} onValueChange={(v) => { setScopeType(v); setScopeId(""); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="university">جامعة</SelectItem>
                        <SelectItem value="college">كلية</SelectItem>
                        <SelectItem value="major">تخصص</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(scopeType === "college" || scopeType === "major") && (
                    <div className="space-y-2">
                      <Label>فلترة حسب الجامعة</Label>
                      <select
                        value={scopeUniFilter}
                        onChange={(e) => { setScopeUniFilter(e.target.value); setScopeId(""); }}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">جميع الجامعات</option>
                        {universities.map((u: any) => <option key={u.id} value={u.id}>{u.name_ar}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>اختر {SCOPE_TYPE_LABELS[scopeType]}</Label>
                    <select
                      value={scopeId}
                      onChange={(e) => setScopeId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">اختر...</option>
                      {scopeOptions().map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
                    </select>
                  </div>
                </>
              )}

              <Button onClick={handleAddScope} disabled={saving || (!scopeIsGlobal && !scopeId)} className="w-full">
                {saving ? "جاري الحفظ..." : "إضافة النطاق"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5" />صلاحيات المشرف: {permUser?.name}</DialogTitle>
            <DialogDescription>حدد الصفحات والوظائف التي يمكن لهذا المشرف الوصول إليها</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              {ALL_PERMISSIONS.map((perm) => (
                <div key={perm} className="flex items-center gap-3">
                  <Checkbox
                    id={`perm-${perm}`}
                    checked={selectedPerms.includes(perm)}
                    onCheckedChange={() => handleTogglePerm(perm)}
                  />
                  <Label htmlFor={`perm-${perm}`} className="text-sm cursor-pointer">
                    {PERMISSION_LABELS[perm]}
                  </Label>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPerms([...ALL_PERMISSIONS])}
                className="flex-1"
              >
                تحديد الكل
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPerms([])}
                className="flex-1"
              >
                إلغاء الكل
              </Button>
            </div>

            <Button onClick={handleSavePerms} disabled={permSaving} className="w-full">
              {permSaving ? "جاري الحفظ..." : "حفظ الصلاحيات"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminUsers;
