import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User, Shield, Calendar, Clock, FileText, CreditCard,
  Users, BookOpen, Bell, Activity,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const AdminProfile = () => {
  const { user, isAdmin } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["admin-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Get role info
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role, created_at")
        .eq("user_id", user!.id);

      // Get student record if exists (for name)
      const { data: student } = await supabase
        .from("students")
        .select("first_name, second_name, third_name, fourth_name")
        .eq("user_id", user!.id)
        .maybeSingle();

      const fullName = [student?.first_name, student?.second_name, student?.third_name, student?.fourth_name]
        .filter(Boolean)
        .join(" ") || user?.email?.split("@")[0] || "مدير";

      return {
        email: user?.email || "",
        fullName,
        roles: roles || [],
        createdAt: user?.created_at || "",
        lastSignIn: user?.last_sign_in_at || "",
      };
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-usage-stats", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      // Payment reviews by this admin
      const { count: reviewedPayments } = await supabase
        .from("payment_requests")
        .select("*", { count: "exact", head: true })
        .eq("reviewed_by", user!.id);

      // Notifications sent (approximate - notifications created by system for this admin)
      const { count: notificationsCount } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);

      // Deletion logs by this admin
      const { count: deletionsCount } = await supabase
        .from("deletion_logs")
        .select("*", { count: "exact", head: true })
        .eq("deleted_by", user!.id);

      // Permissions count (for moderators)
      const { data: permissions } = await supabase
        .from("moderator_permissions")
        .select("permission")
        .eq("user_id", user!.id);

      // Content managed - lessons count
      const { count: lessonsCount } = await supabase
        .from("lessons")
        .select("*", { count: "exact", head: true });

      // Total students
      const { count: studentsCount } = await supabase
        .from("students")
        .select("*", { count: "exact", head: true });

      return {
        reviewedPayments: reviewedPayments || 0,
        notificationsCount: notificationsCount || 0,
        deletionsCount: deletionsCount || 0,
        permissions: permissions?.map((p) => p.permission) || [],
        lessonsCount: lessonsCount || 0,
        studentsCount: studentsCount || 0,
      };
    },
  });

  const isLoading = profileLoading || statsLoading;

  const roleLabel = (role: string) => {
    switch (role) {
      case "admin": return "مدير";
      case "moderator": return "مشرف";
      case "student": return "طالب";
      default: return role;
    }
  };

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "default" as const;
      case "moderator": return "secondary" as const;
      default: return "outline" as const;
    }
  };

  const permissionLabel = (p: string) => {
    const map: Record<string, string> = {
      content: "المحتوى",
      students: "الطلاب",
      universities: "الجامعات",
      payments: "المدفوعات",
      payment_methods: "طرق الدفع",
      subscriptions: "الاشتراكات",
      reports: "التقارير",
    };
    return map[p] || p;
  };

  const activityStats = [
    { label: "مدفوعات تمت مراجعتها", value: stats?.reviewedPayments || 0, icon: CreditCard, color: "text-green-500" },
    { label: "إشعارات مستلمة", value: stats?.notificationsCount || 0, icon: Bell, color: "text-blue-500" },
    { label: "عمليات حذف منفذة", value: stats?.deletionsCount || 0, icon: Activity, color: "text-red-500" },
  ];

  const platformStats = [
    { label: "إجمالي الطلاب", value: stats?.studentsCount || 0, icon: Users, color: "text-primary" },
    { label: "إجمالي الدروس", value: stats?.lessonsCount || 0, icon: BookOpen, color: "text-amber-500" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold">الملف الشخصي</h1>
          <p className="text-muted-foreground text-sm">معلومات حسابك وإحصائيات نشاطك على المنصة</p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Profile Info Card */}
            <Card className="md:col-span-2">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h2 className="text-xl font-bold">{profile?.fullName}</h2>
                    <p className="text-muted-foreground text-sm">{profile?.email}</p>
                    <div className="flex flex-wrap gap-2">
                      {profile?.roles.map((r) => (
                        <Badge key={r.role} variant={roleBadgeVariant(r.role)}>
                          <Shield className="w-3 h-3 ml-1" />
                          {roleLabel(r.role)}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2">
                      {profile?.createdAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          تاريخ الإنشاء: {format(new Date(profile.createdAt), "dd MMM yyyy", { locale: ar })}
                        </span>
                      )}
                      {profile?.lastSignIn && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          آخر دخول: {format(new Date(profile.lastSignIn), "dd MMM yyyy, HH:mm", { locale: ar })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  نشاطك على المنصة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activityStats.map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                      {stat.label}
                    </span>
                    <span className="font-bold text-lg">{stat.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Platform Overview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  نظرة عامة على المنصة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {platformStats.map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                      {stat.label}
                    </span>
                    <span className="font-bold text-lg">{stat.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Permissions Card (for moderators) */}
            {!isAdmin && stats?.permissions && stats.permissions.length > 0 && (
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    صلاحياتك
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {stats.permissions.map((p) => (
                      <Badge key={p} variant="outline">
                        {permissionLabel(p)}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminProfile;
