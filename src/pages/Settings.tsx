import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, User, Moon, Sun, Bell, LogOut, Trash2, Globe, ChevronLeft, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { isNativePlatform } from "@/lib/capacitor";

const Settings = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { theme, setTheme } = useTheme();

  const [language, setLanguage] = useState(() => localStorage.getItem("app_language") || "ar");
  const [notifInApp, setNotifInApp] = useState(() => localStorage.getItem("notif_in_app") !== "false");
  const [notifExamResults, setNotifExamResults] = useState(() => localStorage.getItem("notif_exam_results") !== "false");
  const [notifSubscription, setNotifSubscription] = useState(() => localStorage.getItem("notif_subscription") !== "false");

  useEffect(() => { localStorage.setItem("app_language", language); }, [language]);
  useEffect(() => { localStorage.setItem("notif_in_app", String(notifInApp)); }, [notifInApp]);
  useEffect(() => { localStorage.setItem("notif_exam_results", String(notifExamResults)); }, [notifExamResults]);
  useEffect(() => { localStorage.setItem("notif_subscription", String(notifSubscription)); }, [notifSubscription]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const [checking, setChecking] = useState(false);
  const handleCheckUpdate = async () => {
    setChecking(true);
    toast.info("جارٍ البحث عن تحديثات...");
    try {
      // Clear caches and reload to fetch latest version from server
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(n => caches.delete(n)));
      }
      await new Promise(r => setTimeout(r, 1500));
      window.location.reload();
    } catch {
      setChecking(false);
      toast.error("تعذر البحث عن تحديثات. تحقق من اتصالك بالإنترنت.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const phone = user?.phone || user?.user_metadata?.phone || "غير محدد";

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">الإعدادات</h1>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Account Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              إدارة الحساب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">رقم الجوال</span>
              <span className="text-sm font-medium" dir="ltr">{phone}</span>
            </div>
            <Separator />
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => navigate("/profile")}
            >
              <User className="w-4 h-4" />
              تعديل الملف الشخصي
            </Button>
            {isNativePlatform() && (
              <>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={handleCheckUpdate}
                  disabled={checking}
                >
                  <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
                  البحث عن تحديثات
                </Button>
                <Separator />
              </>
            )}
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => navigate("/delete-account")}
            >
              <Trash2 className="w-4 h-4" />
              حذف الحساب
            </Button>
          </CardContent>
        </Card>

        {/* Appearance & Language */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4" />
              المظهر واللغة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                <span className="text-sm">الوضع المظلم</span>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm">اللغة</span>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4" />
              الإشعارات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">إشعارات التطبيق</span>
              <Switch checked={notifInApp} onCheckedChange={setNotifInApp} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm">نتائج الاختبارات</span>
              <Switch checked={notifExamResults} onCheckedChange={setNotifExamResults} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm">تحديثات الاشتراك</span>
              <Switch checked={notifSubscription} onCheckedChange={setNotifSubscription} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
