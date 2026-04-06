import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GraduationCap, Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({ variant: "destructive", title: "حدث خطأ", description: error.message });
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">قَبُول</span>
          </Link>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">استعادة كلمة المرور</CardTitle>
            <CardDescription>أدخل بريدك الإلكتروني لإرسال رابط إعادة التعيين</CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center py-6 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
                <p className="font-semibold text-foreground">تم إرسال رابط الاستعادة</p>
                <p className="text-sm text-muted-foreground">تحقق من بريدك الإلكتروني <span className="font-medium" dir="ltr">{email}</span> واتبع الرابط لإعادة تعيين كلمة المرور</p>
                <Button variant="outline" asChild className="mt-4">
                  <Link to="/login"><ArrowRight className="w-4 h-4 ml-1" />العودة لتسجيل الدخول</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pr-10 text-left"
                      dir="ltr"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full py-5 text-base font-bold" disabled={loading}>
                  {loading ? "جاري الإرسال..." : "إرسال رابط الاستعادة"}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center text-sm">
              <Link to="/login" className="text-primary font-semibold hover:underline">
                <ArrowRight className="w-3 h-3 inline ml-1" />العودة لتسجيل الدخول
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;