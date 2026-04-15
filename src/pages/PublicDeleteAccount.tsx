import { useState } from "react";
import { Trash2, AlertTriangle, Loader2, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PublicDeleteAccount = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const isConfirmed = confirmText === "حذف حسابي" && email.trim() !== "" && password.trim() !== "";

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Sign in first
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError || !signInData.session) {
        toast.error("بيانات الدخول غير صحيحة. تأكد من البريد الإلكتروني وكلمة المرور.");
        setDeleting(false);
        return;
      }

      // Call delete-account edge function
      const { error } = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${signInData.session.access_token}` },
      });

      if (error) throw error;

      await supabase.auth.signOut();
      setDeleted(true);
      toast.success("تم حذف حسابك وجميع بياناتك بنجاح.");
    } catch {
      toast.error("حدث خطأ أثناء حذف الحساب. يرجى المحاولة مرة أخرى.");
    } finally {
      setDeleting(false);
    }
  };

  if (deleted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-foreground">تم حذف الحساب بنجاح</h2>
            <p className="text-sm text-muted-foreground">
              تم حذف حسابك وجميع بياناتك الشخصية بشكل نهائي من أنظمتنا.
            </p>
            <a href="/" className="inline-block text-sm text-primary hover:underline mt-4">
              العودة إلى الصفحة الرئيسية
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="bg-destructive py-8 px-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-destructive-foreground" />
            <h1 className="text-2xl font-bold text-destructive-foreground">حذف الحساب</h1>
          </div>
          <p className="text-destructive-foreground/70 mt-2 text-sm">
            مُفَاضَلَة | Mufadhala — طلب حذف الحساب والبيانات
          </p>
        </div>
      </header>

      <div className="p-4 space-y-6 max-w-lg mx-auto">
        {/* Warning */}
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6">
            <h2 className="font-bold text-foreground text-lg mb-2">تحذير: هذا الإجراء لا يمكن التراجع عنه</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              عند حذف حسابك، سيتم إزالة جميع بياناتك بشكل نهائي وفوري من النظام. لا يمكن استعادة أي بيانات بعد الحذف.
            </p>
          </CardContent>
        </Card>

        {/* What will be deleted */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold text-foreground mb-4">ما الذي سيتم حذفه؟</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[
                "الملف الشخصي وجميع المعلومات المسجلة (الاسم، رقم الجوال، المعدل)",
                "سجل الاختبارات وجميع النتائج والإنجازات",
                "تقدم الدروس والملخصات المحفوظة",
                "بيانات الاشتراك وسجل المدفوعات",
                "جميع الإشعارات والمحادثات",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Trash2 className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Login & Confirm */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-bold text-foreground">تسجيل الدخول وتأكيد الحذف</h3>
            <p className="text-sm text-muted-foreground">
              لحماية حسابك، يرجى إدخال بيانات الدخول للتحقق من هويتك:
            </p>

            <div className="space-y-3">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="البريد الإلكتروني"
                dir="ltr"
                className="text-left"
              />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="كلمة المرور"
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="border-t pt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                للتأكيد، اكتب <span className="font-bold text-destructive">"حذف حسابي"</span> في الحقل أدناه:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="اكتب: حذف حسابي"
                className="text-center"
                dir="rtl"
              />
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  disabled={!isConfirmed || deleting}
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  حذف حسابي نهائياً
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent dir="rtl">
                <AlertDialogHeader>
                  <AlertDialogTitle>تأكيد نهائي</AlertDialogTitle>
                  <AlertDialogDescription>
                    هل أنت متأكد تماماً؟ سيتم حذف جميع بياناتك نهائياً من النظام ولا يمكن التراجع عن هذا الإجراء.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-row-reverse gap-2">
                  <AlertDialogCancel>تراجع</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    نعم، احذف حسابي
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Privacy link */}
        <div className="text-center space-y-2 pb-8">
          <p className="text-xs text-muted-foreground">
            لمعرفة المزيد عن كيفية تعاملنا مع بياناتك، اطلع على{" "}
            <a href="/privacy-policy" className="text-primary hover:underline">سياسة الخصوصية</a>.
          </p>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} مُفَاضَلَة | Mufadhala
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicDeleteAccount;
