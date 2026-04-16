import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  ALL_PERMISSIONS,
  PERMISSION_LABELS,
  type ModeratorPermission,
} from "@/hooks/useModeratorPermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Check, X, ShieldCheck, Search, Users, Globe, MapPin } from "lucide-react";

interface ScopeLabel {
  type: "global" | "university" | "college" | "major";
  label: string;
}

interface ModeratorRow {
  user_id: string;
  display_name: string;
  permissions: Set<ModeratorPermission>;
  scopes: ScopeLabel[];
}

const AdminPermissionsOverview = () => {
  const { loading: authLoading } = useAuth("admin");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ModeratorRow[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [authLoading]);

  const load = async () => {
    setLoading(true);
    try {
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "moderator");

      const moderatorIds = Array.from(new Set((roleRows || []).map((r) => r.user_id)));
      if (moderatorIds.length === 0) {
        setRows([]);
        return;
      }

      const [
        { data: students },
        { data: perms },
        { data: scopes },
        { data: universities },
        { data: colleges },
        { data: majors },
      ] = await Promise.all([
        supabase
          .from("students")
          .select("user_id, first_name, second_name, third_name, fourth_name, phone")
          .in("user_id", moderatorIds),
        supabase
          .from("moderator_permissions")
          .select("user_id, permission")
          .in("user_id", moderatorIds),
        supabase
          .from("moderator_scopes")
          .select("user_id, scope_type, scope_id, is_global")
          .in("user_id", moderatorIds),
        supabase.from("universities").select("id, name_ar"),
        supabase.from("colleges").select("id, name_ar"),
        supabase.from("majors").select("id, name_ar"),
      ]);

      const nameMap = new Map<string, string>();
      (students || []).forEach((s: any) => {
        const name = [s.first_name, s.second_name, s.third_name, s.fourth_name]
          .filter(Boolean)
          .join(" ")
          .trim();
        nameMap.set(s.user_id, name || s.phone || s.user_id.slice(0, 8));
      });

      const permMap = new Map<string, Set<ModeratorPermission>>();
      (perms || []).forEach((p: any) => {
        if (!permMap.has(p.user_id)) permMap.set(p.user_id, new Set());
        permMap.get(p.user_id)!.add(p.permission as ModeratorPermission);
      });

      const uMap = new Map((universities || []).map((u: any) => [u.id, u.name_ar]));
      const cMap = new Map((colleges || []).map((c: any) => [c.id, c.name_ar]));
      const mMap = new Map((majors || []).map((m: any) => [m.id, m.name_ar]));

      const scopeMap = new Map<string, ScopeLabel[]>();
      (scopes || []).forEach((s: any) => {
        if (!scopeMap.has(s.user_id)) scopeMap.set(s.user_id, []);
        const list = scopeMap.get(s.user_id)!;
        if (s.is_global || s.scope_type === "global") {
          list.push({ type: "global", label: "كل الجامعات" });
        } else if (s.scope_type === "university") {
          list.push({ type: "university", label: uMap.get(s.scope_id) || "جامعة?" });
        } else if (s.scope_type === "college") {
          list.push({ type: "college", label: cMap.get(s.scope_id) || "كلية?" });
        } else if (s.scope_type === "major") {
          list.push({ type: "major", label: mMap.get(s.scope_id) || "تخصص?" });
        }
      });

      const built: ModeratorRow[] = moderatorIds.map((id) => ({
        user_id: id,
        display_name: nameMap.get(id) || id.slice(0, 8),
        permissions: permMap.get(id) || new Set(),
        scopes: scopeMap.get(id) || [],
      }));

      built.sort((a, b) => b.permissions.size - a.permissions.size);
      setRows(built);
    } finally {
      setLoading(false);
    }
  };

  const filtered = rows.filter((r) =>
    r.display_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalMods = rows.length;
  const fullyEmpowered = rows.filter((r) => r.permissions.size === ALL_PERMISSIONS.length).length;
  const noPerms = rows.filter((r) => r.permissions.size === 0).length;

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
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">مصفوفة صلاحيات المشرفين</h1>
            <p className="text-sm text-muted-foreground">نظرة شاملة على من يملك أي صلاحية ونطاقه الأكاديمي</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">إجمالي المشرفين</p>
                  <p className="text-2xl font-bold">{totalMods}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-secondary" />
                <div>
                  <p className="text-xs text-muted-foreground">صلاحيات كاملة</p>
                  <p className="text-2xl font-bold">{fullyEmpowered}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <X className="w-5 h-5 text-destructive" />
                <div>
                  <p className="text-xs text-muted-foreground">بدون صلاحيات</p>
                  <p className="text-2xl font-bold">{noPerms}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">المصفوفة</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث باسم المشرف..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا يوجد مشرفون</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right sticky right-0 bg-card z-10 min-w-[180px]">
                        المشرف
                      </TableHead>
                      <TableHead className="text-right min-w-[200px]">النطاق الأكاديمي</TableHead>
                      {ALL_PERMISSIONS.map((p) => (
                        <TableHead key={p} className="text-center text-xs whitespace-nowrap">
                          {PERMISSION_LABELS[p]}
                        </TableHead>
                      ))}
                      <TableHead className="text-center">الإجمالي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((row) => (
                      <TableRow key={row.user_id}>
                        <TableCell className="font-medium sticky right-0 bg-card">
                          {row.display_name}
                        </TableCell>
                        <TableCell>
                          {row.scopes.length === 0 ? (
                            <Badge variant="outline" className="text-muted-foreground">
                              <X className="w-3 h-3 ml-1" />
                              بدون نطاق
                            </Badge>
                          ) : row.scopes.some((s) => s.type === "global") ? (
                            <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
                              <Globe className="w-3 h-3 ml-1" />
                              عام (كل الجامعات)
                            </Badge>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-[280px]">
                              {row.scopes.map((s, i) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="text-xs"
                                  title={`${s.type === "university" ? "جامعة" : s.type === "college" ? "كلية" : "تخصص"}: ${s.label}`}
                                >
                                  <MapPin className="w-3 h-3 ml-1" />
                                  {s.label}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        {ALL_PERMISSIONS.map((p) => {
                          const has = row.permissions.has(p);
                          return (
                            <TableCell key={p} className="text-center">
                              {has ? (
                                <div className="inline-flex w-7 h-7 rounded-full bg-secondary/15 items-center justify-center">
                                  <Check className="w-4 h-4 text-secondary" />
                                </div>
                              ) : (
                                <div className="inline-flex w-7 h-7 rounded-full bg-muted items-center justify-center">
                                  <X className="w-4 h-4 text-muted-foreground/50" />
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">
                          <Badge variant={row.permissions.size === ALL_PERMISSIONS.length ? "default" : "secondary"}>
                            {row.permissions.size} / {ALL_PERMISSIONS.length}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminPermissionsOverview;
