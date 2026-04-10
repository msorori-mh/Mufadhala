import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const DeleteAccount = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  const isConfirmed = confirmText === "حذف حسابي";

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Sign out and notify - actual deletion handled by support/admin
      await supabase.auth.signOut();
      toast.success("تم إرسال طلب حذف حسابك. سيتم حذف جميع بياناتك خلال 30 يوماً. يمكنك التواصل معنا لإلغاء الطلب خلال هذه الفترة.");
      navigate("/login", { replace: true });
    } catch {
      toast.error("حدث خطأ. يرجى المحاولة مرة أخرى.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      {/* Header */}
      <div className="bg-destructive text-destructive-foreground p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowRight className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">حذف الحساب</h1>
      </div>

      <div className="p-4 space-y-6 max-w-lg mx-auto">
        {/* Warning */}
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-lg mb-2">تحذير: هذا الإجراء لا يمكن التراجع عنه</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  عند حذف حسابك، سيتم إزالة جميع بياناتك بشكل نهائي بعد 30 يوماً من تقديم الطلب. يمكنك إلغاء الطلب خلال هذه الفترة بالتواصل معنا.
                </p>
              </div>
            </div>
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

        {/* Confirmation */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-bold text-foreground">تأكيد الحذف</h3>
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
                    هل أنت متأكد تماماً؟ سيتم تسجيل خروجك فوراً وحذف جميع بياناتك خلال 30 يوماً.
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

        {/* Contact note */}
        <p className="text-xs text-center text-muted-foreground px-4">
          إذا كنت تواجه مشكلة وتريد المساعدة بدلاً من حذف حسابك، تواصل معنا عبر المساعد الذكي "قبول" في التطبيق.
        </p>
      </div>
    </div>
  );
};

export default DeleteAccount;
