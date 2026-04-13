import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  User, Shield, Calendar, Clock, FileText, CreditCard,
  Users, BookOpen, Bell, Activity, Pencil, Save, X, Mail, Lock, Eye, EyeOff,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const AdminProfile = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordFields, setPasswordFields] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [nameFields, setNameFields] = useState({
    first_name: "",
    second_name: "",
    third_name: "",
    fourth_name: "",
  });
  const [newEmail, setNewEmail] = useState("");

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["admin-profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role, created_at")
        .eq("user_id", user!.id);

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
        student,
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
      const { count: reviewedPayments } = await supabase
        .from("payment_requests")
        .select("*", { count: "exact", head: true })
        .eq("reviewed_by", user!.id);

      const { count: notificationsCount } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);

      const { count: deletionsCount } = await supabase
        .from("deletion_logs")
        .select("*", { count: "exact", head: true })
        .eq("deleted_by", user!.id);

      const { data: permissions } = await supabase
        .from("moderator_permissions")
        .select("permission")
        .eq("user_id", user!.id);

      const { count: lessonsCount } = await supabase
        .from("lessons")
        .select("*", { count: "exact", head: true });

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

  const startEditingName = () => {
    setNameFields({
      first_name: profile?.student?.first_name || "",
      second_name: profile?.student?.second_name || "",
      third_name: profile?.student?.third_name || "",
      fourth_name: profile?.student?.fourth_name || "",
    });
    setEditingName(true);
  };

  const startEditingEmail = () => {
    setNewEmail(profile?.email || "");
    setEditingEmail(true);
  };

  const handleSaveName = async () => {
    if (!nameFields.first_name.trim()) {
      toast.error("الاسم الأول مطلوب");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("students")
        .update({
          first_name: nameFields.first_name.trim(),
          second_name: nameFields.second_name.trim() || null,
          third_name: nameFields.third_name.trim() || null,
          fourth_name: nameFields.fourth_name.trim() || null,
        })
        .eq("user_id", user!.id);

      if (error) throw error;
      toast.success("تم تحديث الاسم بنجاح");
      setEditingName(false);
      queryClient.invalidateQueries({ queryKey: ["admin-profile"] });
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء التحديث");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmail = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      toast.error("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }
    if (newEmail.trim() === profile?.email) {
      setEditingEmail(false);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      toast.success("تم إرسال رابط التأكيد إلى البريد الإلكتروني الجديد. يرجى التحقق من صندوق الوارد.");
      setEditingEmail(false);
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء تحديث البريد الإلكتروني");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (!passwordFields.newPassword || passwordFields.newPassword.length < 8) {
      toast.error("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (passwordFields.newPassword !== passwordFields.confirmPassword) {
      toast.error("كلمة المرور الجديدة وتأكيدها غير متطابقتين");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordFields.newPassword });
      if (error) throw error;
      toast.success("تم تغيير كلمة المرور بنجاح");
      setEditingPassword(false);
      setPasswordFields({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ أثناء تغيير كلمة المرور");
    } finally {
      setSaving(false);
    }
  };

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
                  <div className="flex-1 space-y-3">
                    {/* Name section */}
                    {editingName ? (
                      <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium">تعديل الاسم</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">الاسم الأول *</Label>
                            <Input
                              value={nameFields.first_name}
                              onChange={(e) => setNameFields({ ...nameFields, first_name: e.target.value })}
                              className="h-8 text-sm"
                              maxLength={50}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">الاسم الثاني</Label>
                            <Input
                              value={nameFields.second_name}
                              onChange={(e) => setNameFields({ ...nameFields, second_name: e.target.value })}
                              className="h-8 text-sm"
                              maxLength={50}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">الاسم الثالث</Label>
                            <Input
                              value={nameFields.third_name}
                              onChange={(e) => setNameFields({ ...nameFields, third_name: e.target.value })}
                              className="h-8 text-sm"
                              maxLength={50}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">الاسم الرابع</Label>
                            <Input
                              value={nameFields.fourth_name}
                              onChange={(e) => setNameFields({ ...nameFields, fourth_name: e.target.value })}
                              className="h-8 text-sm"
                              maxLength={50}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveName} disabled={saving}>
                            <Save className="w-3.5 h-3.5 ml-1" />
                            حفظ
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingName(false)} disabled={saving}>
                            <X className="w-3.5 h-3.5 ml-1" />
                            إلغاء
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold">{profile?.fullName}</h2>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={startEditingName}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}

                    {/* Email section */}
                    {editingEmail ? (
                      <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium">تعديل البريد الإلكتروني</p>
                        <Input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="h-8 text-sm max-w-sm"
                          dir="ltr"
                          maxLength={255}
                        />
                        <p className="text-xs text-muted-foreground">سيتم إرسال رابط تأكيد إلى البريد الجديد</p>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveEmail} disabled={saving}>
                            <Save className="w-3.5 h-3.5 ml-1" />
                            حفظ
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingEmail(false)} disabled={saving}>
                            <X className="w-3.5 h-3.5 ml-1" />
                            إلغاء
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <p className="text-muted-foreground text-sm">{profile?.email}</p>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={startEditingEmail}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}

                    {/* Password section */}
                    {editingPassword ? (
                      <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm font-medium">تغيير كلمة المرور</p>
                        <div className="space-y-2 max-w-sm">
                          <div>
                            <Label className="text-xs">كلمة المرور الجديدة *</Label>
                            <div className="relative">
                              <Input
                                type={showNewPassword ? "text" : "password"}
                                value={passwordFields.newPassword}
                                onChange={(e) => setPasswordFields({ ...passwordFields, newPassword: e.target.value })}
                                className="h-8 text-sm pr-9"
                                dir="ltr"
                                minLength={8}
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="absolute left-0 top-0 h-8 w-8"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                              >
                                {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </Button>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">تأكيد كلمة المرور *</Label>
                            <Input
                              type="password"
                              value={passwordFields.confirmPassword}
                              onChange={(e) => setPasswordFields({ ...passwordFields, confirmPassword: e.target.value })}
                              className="h-8 text-sm"
                              dir="ltr"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">يجب أن تكون 8 أحرف على الأقل</p>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSavePassword} disabled={saving}>
                            <Save className="w-3.5 h-3.5 ml-1" />
                            حفظ
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingPassword(false); setPasswordFields({ currentPassword: "", newPassword: "", confirmPassword: "" }); }} disabled={saving}>
                            <X className="w-3.5 h-3.5 ml-1" />
                            إلغاء
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        <p className="text-muted-foreground text-sm">كلمة المرور</p>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingPassword(true)}>
                          تغيير
                        </Button>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {profile?.roles.map((r) => (
                        <Badge key={r.role} variant={roleBadgeVariant(r.role)}>
                          <Shield className="w-3 h-3 ml-1" />
                          {roleLabel(r.role)}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
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
