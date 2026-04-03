import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, ShieldPlus, Trash2, UserCog } from "lucide-react";

type AppRole = "admin" | "moderator" | "student";

interface UserWithRoles {
  user_id: string;
  email: string;
  name: string;
  roles: AppRole[];
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

const AdminUsers = () => {
  const { loading: authLoading } = useAuth("admin");
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [newRole, setNewRole] = useState<AppRole>("moderator");
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    // Get all students with their roles
    const [{ data: students }, { data: allRoles }] = await Promise.all([
      supabase.from("students").select("user_id, first_name, second_name, third_name, fourth_name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    if (!students || !allRoles) { setLoading(false); return; }

    // Group roles by user
    const rolesMap = new Map<string, AppRole[]>();
    allRoles.forEach((r) => {
      const list = rolesMap.get(r.user_id) || [];
      list.push(r.role as AppRole);
      rolesMap.set(r.user_id, list);
    });

    // Build user list
    const userList: UserWithRoles[] = students.map((s) => ({
      user_id: s.user_id,
      email: "",
      name: [s.first_name, s.second_name, s.third_name, s.fourth_name].filter(Boolean).join(" ") || "بدون اسم",
      roles: rolesMap.get(s.user_id) || ["student"],
    }));

    // Also include users who have roles but no student record
    const studentUserIds = new Set(students.map((s) => s.user_id));
    rolesMap.forEach((roles, userId) => {
      if (!studentUserIds.has(userId)) {
        userList.push({ user_id: userId, email: "", name: "مستخدم", roles });
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
    return u.name.toLowerCase().includes(search.toLowerCase()) || u.user_id.includes(search);
  });

  const openAddRole = (user: UserWithRoles) => {
    setSelectedUser(user);
    // Default to a role user doesn't have
    const missing = (["admin", "moderator", "student"] as AppRole[]).find((r) => !user.roles.includes(r));
    setNewRole(missing || "moderator");
    setDialogOpen(true);
  };

  const handleAddRole = async () => {
    if (!selectedUser) return;
    setSaving(true);
    const { error } = await supabase.from("user_roles").insert({
      user_id: selectedUser.user_id,
      role: newRole,
    });
    if (error) {
      toast({ variant: "destructive", title: error.message.includes("duplicate") ? "هذا الدور موجود بالفعل" : error.message });
    } else {
      toast({ title: `تم إضافة دور "${ROLE_LABELS[newRole]}" بنجاح` });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchUsers();
  };

  const handleRemoveRole = async (userId: string, role: AppRole) => {
    if (!confirm(`هل أنت متأكد من إزالة دور "${ROLE_LABELS[role]}"؟`)) return;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) {
      toast({ variant: "destructive", title: error.message });
    } else {
      toast({ title: "تم إزالة الدور" });
      fetchUsers();
    }
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
          <Input
            placeholder="بحث بالاسم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
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
                            <button
                              onClick={() => handleRemoveRole(u.user_id, role)}
                              className="hover:opacity-70 mr-0.5"
                              title="إزالة الدور"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openAddRole(u)} className="shrink-0">
                    <ShieldPlus className="w-4 h-4 ml-1" />
                    إضافة دور
                  </Button>
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
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5" />
              إضافة دور لـ {selectedUser?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["admin", "moderator", "student"] as AppRole[])
                  .filter((r) => !selectedUser?.roles.includes(r))
                  .map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddRole} disabled={saving} className="w-full">
              {saving ? "جاري الحفظ..." : "إضافة الدور"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminUsers;
