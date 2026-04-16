import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, User, Moon, Sun, Bell, LogOut, Trash2, Info, MessageCircle, Mail, Headphones, Phone, Clock, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { theme, setTheme } = useTheme();

  const [notifInApp, setNotifInApp] = useState(() => localStorage.getItem("notif_in_app") !== "false");
  const [notifExamResults, setNotifExamResults] = useState(() => localStorage.getItem("notif_exam_results") !== "false");
  const [notifSubscription, setNotifSubscription] = useState(() => localStorage.getItem("notif_subscription") !== "false");
  useEffect(() => { localStorage.setItem("notif_in_app", String(notifInApp)); }, [notifInApp]);
  useEffect(() => { localStorage.setItem("notif_exam_results", String(notifExamResults)); }, [notifExamResults]);
  useEffect(() => { localStorage.setItem("notif_subscription", String(notifSubscription)); }, [notifSubscription]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
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

        {/* Appearance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              المظهر
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-4 h-4" />
              حول التطبيق
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">اسم المنصة</span>
              <span className="text-sm font-medium">مُفَاضَلَة</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">الإصدار</span>
              <span className="text-sm font-medium" dir="ltr">v5.0.1</span>
            </div>
            <Separator />
            <div className="flex flex-col gap-2">
              <Link to="/privacy-policy" className="text-sm text-primary hover:underline">
                سياسة الخصوصية
              </Link>
              <Link to="/terms-of-service" className="text-sm text-primary hover:underline">
                شروط الاستخدام
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Technical Support */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Headphones className="w-4 h-4" />
              الدعم الفني
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <a
              href={`https://wa.me/967780060056?text=${encodeURIComponent("السلام عليكم، أحتاج مساعدة من فريق الدعم الفني لتطبيق مُفَاضَلَة 🎓")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg bg-[#25D366]/10 border border-[#25D366]/20 hover:bg-[#25D366]/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">واتساب</p>
                <p className="text-xs text-muted-foreground" dir="ltr">+967 780 060 056</p>
              </div>
            </a>

            <a
              href="tel:+967780060056"
              className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">اتصال مباشر</p>
                <p className="text-xs text-muted-foreground" dir="ltr">+967 780 060 056</p>
              </div>
            </a>

            <a
              href="mailto:info@mufadhala.com"
              className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">البريد الإلكتروني</p>
                <p className="text-xs text-muted-foreground">info@mufadhala.com</p>
              </div>
            </a>

            <Separator />

            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs">أوقات الدعم: السبت - الخميس، 8 صباحاً - 10 مساءً</span>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground">
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="text-xs">يمكنك أيضاً استخدام المساعد الذكي داخل التطبيق للإجابة الفورية</span>
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
