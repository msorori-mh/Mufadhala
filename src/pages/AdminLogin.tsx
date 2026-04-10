import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/admin-reset-password`,
    });
    if (error) {
      toast({ variant: "destructive", title: "خطأ", description: error.message });
    } else {
      setResetSent(true);
      toast({ title: "تم الإرسال", description: "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني" });
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({
        variant: "destructive",
        title: "خطأ في تسجيل الدخول",
        description: error.message === "Invalid login credentials"
          ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
          : error.message,
      });
    } else {
      toast({ title: "تم تسجيل الدخول بنجاح" });
      navigate("/admin");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold">
            {forgotMode ? "استعادة كلمة المرور" : "دخول الإدارة"}
          </h1>
        </div>

        <Card className="shadow-xl border-0">
          {forgotMode ? (
            <>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg">
                  {resetSent ? "تم إرسال الرابط" : "أدخل بريدك الإلكتروني"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {resetSent ? (
                  <div className="text-center space-y-4 py-4">
                    <CheckCircle className="w-16 h-16 text-primary mx-auto" />
                    <p className="text-muted-foreground">
                      تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => { setForgotMode(false); setResetSent(false); setResetEmail(""); }}
                    >
                      العودة لتسجيل الدخول
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setForgotMode(false)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </button>
                      <span className="text-sm text-muted-foreground">
                        سنرسل لك رابطاً لإعادة تعيين كلمة المرور
                      </span>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resetEmail">البريد الإلكتروني</Label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="resetEmail"
                          type="email"
                          placeholder="admin@example.com"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
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
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-lg">تسجيل دخول المدير</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pr-10 text-left"
                        dir="ltr"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">كلمة المرور</Label>
                    <div className="relative">
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10 pl-10"
                        dir="ltr"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full py-5 text-base font-bold" disabled={loading}>
                    {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setForgotMode(true)}
                    className="w-full text-sm text-center text-primary hover:underline"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
