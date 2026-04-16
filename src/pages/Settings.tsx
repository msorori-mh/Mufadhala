import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, User, Moon, Sun, Bell, LogOut, Trash2, Info, MessageCircle, HelpCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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

        {/* FAQ */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              الأسئلة الشائعة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="q1">
                <AccordionTrigger className="text-sm text-right">كيف أبدأ الاستفادة من المنصة؟</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  بعد إكمال بياناتك في الملف الشخصي، توجّه للوحة التحكم وابدأ بمشاهدة الدروس المتاحة لتخصصك، ثم جرّب اختبار نهاية الدرس لتقييم فهمك.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q2">
                <AccordionTrigger className="text-sm text-right">ما الفرق بين الحساب المجاني والمشترك؟</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  الحساب المجاني يتيح لك الوصول إلى عدد محدود من الدروس والأسئلة يومياً. الاشتراك يفتح كامل المحتوى ومحاكي الاختبار الحقيقي ومولّد الأسئلة الذكي بدون حدود.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q3">
                <AccordionTrigger className="text-sm text-right">كيف أشترك في المنصة؟</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  من القائمة الرئيسية اختر "الاشتراك"، اختر الباقة المناسبة، حوّل المبلغ عبر إحدى طرق الدفع المعروضة، ثم ارفع صورة سند التحويل وسيتم تفعيل اشتراكك خلال وقت قصير.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q4">
                <AccordionTrigger className="text-sm text-right">لم يتم تفعيل اشتراكي بعد الدفع، ماذا أفعل؟</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  تأكد من رفع صورة واضحة لسند التحويل. يتم مراجعة السندات يدوياً خلال ساعات قليلة. إذا تأخر التفعيل أكثر من 24 ساعة، تواصل معنا عبر واتساب من قسم "تواصل معنا" أدناه.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q5">
                <AccordionTrigger className="text-sm text-right">كيف يعمل محاكي الاختبار الحقيقي؟</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  محاكي الاختبار يقدم 50 سؤالاً خلال 50 دقيقة بدون إظهار الإجابات الصحيحة أثناء الاختبار، لمحاكاة ظروف اختبار القبول الفعلي. تظهر النتيجة التفصيلية بعد التسليم.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q6">
                <AccordionTrigger className="text-sm text-right">هل يمكنني استخدام التطبيق بدون إنترنت؟</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  نعم، يدعم التطبيق وضع الأوفلاين للدروس التي تم تصفحها سابقاً. تحتاج إلى الإنترنت في المرة الأولى فقط لتحميل المحتوى ولاحقاً لمزامنة نتائج اختباراتك.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q7">
                <AccordionTrigger className="text-sm text-right">كيف أغيّر رقم جوالي أو بياناتي؟</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  من إعدادات الحساب اضغط "تعديل الملف الشخصي". تغيير رقم الجوال يتطلب التحقق عبر رمز يصلك على الرقم الجديد.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="q8">
                <AccordionTrigger className="text-sm text-right">كيف أحذف حسابي؟</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  من قسم "إدارة الحساب" في الأعلى اضغط "حذف الحساب" واتبع الخطوات. يرجى الانتباه أن هذا الإجراء نهائي ولا يمكن التراجع عنه.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact Us — last section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              تواصل معنا
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={`https://wa.me/967780060056?text=${encodeURIComponent("السلام عليكم، أحتاج مساعدة من فريق الدعم الفني لتطبيق مُفَاضَلَة 🎓")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full p-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              <MessageCircle className="w-5 h-5" />
              <span>تواصل معنا عبر واتساب</span>
            </a>
            <p className="text-xs text-muted-foreground text-center mt-2" dir="ltr">+967 780 060 056</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
