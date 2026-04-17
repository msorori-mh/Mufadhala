import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, Sparkles, RotateCcw, FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { AI_GENERATION_LIMITS } from "@/domain/constants";

const AdminAIGenerationLimits = () => {
  const { isAdmin, loading: authLoading } = useAuth("admin");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [free, setFree] = useState<number>(AI_GENERATION_LIMITS.DEFAULT_FREE_DAILY);
  const [subscribed, setSubscribed] = useState<number>(AI_GENERATION_LIMITS.DEFAULT_SUBSCRIBED_DAILY);
  const [usingDefaults, setUsingDefaults] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    hasSubscription: boolean;
    limit: number;
    used: number;
    remaining: number;
    freeLimit: number;
    subscribedLimit: number;
    source: string;
    userId: string;
  } | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast({ variant: "destructive", title: "غير مصرح لك بالوصول إلى هذه الصفحة" });
      navigate("/admin", { replace: true });
    }
  }, [authLoading, isAdmin, navigate, toast]);

  const loadLimits = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_cache", {
      _key: AI_GENERATION_LIMITS.CACHE_KEY,
    });
    if (error) {
      toast({ variant: "destructive", title: "تعذّر تحميل الإعدادات", description: error.message });
    } else if (data && typeof data === "object") {
      const v = data as { free?: number; subscribed?: number };
      if (typeof v.free === "number") setFree(v.free);
      if (typeof v.subscribed === "number") setSubscribed(v.subscribed);
      setUsingDefaults(false);
    } else {
      setUsingDefaults(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) loadLimits();
  }, [isAdmin]);

  const handleSave = async () => {
    if (free < 1 || subscribed < 1) {
      toast({ variant: "destructive", title: "القيم يجب أن تكون 1 أو أكثر" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("set_cache", {
      _key: AI_GENERATION_LIMITS.CACHE_KEY,
      _value: { free: Math.floor(free), subscribed: Math.floor(subscribed) },
      _ttl_seconds: AI_GENERATION_LIMITS.CACHE_TTL_SECONDS,
    });
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "تعذّر الحفظ", description: error.message });
      return;
    }
    setUsingDefaults(false);
    toast({ title: "تم الحفظ", description: "ستُطبَّق الحدود الجديدة فوراً على كل المستخدمين." });
  };

  const handleResetToDefaults = () => {
    setFree(AI_GENERATION_LIMITS.DEFAULT_FREE_DAILY);
    setSubscribed(AI_GENERATION_LIMITS.DEFAULT_SUBSCRIBED_DAILY);
  };

  const handleQuickTest = async () => {
    setTesting(true);
    setTestResult(null);
    const { data, error } = await supabase.functions.invoke("generate-questions", {
      body: { dry_run: true },
    });
    setTesting(false);
    if (error) {
      toast({
        variant: "destructive",
        title: "فشل الاختبار",
        description: error.message,
      });
      return;
    }
    setTestResult(data);
    toast({
      title: "اكتمل الاختبار",
      description: `الحد: ${data.limit} | المتبقي: ${data.remaining}`,
    });
  };

  if (authLoading || !isAdmin) {
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
      <div className="max-w-2xl mx-auto space-y-4" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">حدود مولّد الأسئلة الذكي</h1>
            <p className="text-sm text-muted-foreground">
              تحكّم في عدد مرات الاستخدام اليومي بدون إعادة نشر.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">الحدود اليومية</CardTitle>
            <CardDescription>
              تُطبَّق فوراً على جميع المستخدمين عبر <code className="text-xs">app_cache</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {usingDefaults && (
                  <Alert>
                    <AlertDescription className="text-xs">
                      لم يُحفظ أي تخصيص بعد — يتم استخدام القيم الافتراضية.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="free">الحد المجاني اليومي (لغير المشتركين)</Label>
                  <Input
                    id="free"
                    type="number"
                    min={1}
                    value={free}
                    onChange={(e) => setFree(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    الافتراضي: {AI_GENERATION_LIMITS.DEFAULT_FREE_DAILY}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subscribed">الحد اليومي للمشتركين</Label>
                  <Input
                    id="subscribed"
                    type="number"
                    min={1}
                    value={subscribed}
                    onChange={(e) => setSubscribed(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    الافتراضي: {AI_GENERATION_LIMITS.DEFAULT_SUBSCRIBED_DAILY}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Button onClick={handleSave} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    حفظ التغييرات
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleResetToDefaults}
                    disabled={saving}
                    className="gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    استعادة الافتراضي
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-primary" />
              اختبار سريع
            </CardTitle>
            <CardDescription>
              يستدعي <code className="text-xs">generate-questions</code> بوضع dry-run بحسابك
              الحالي للتحقق من الحد الفعّال والاشتراك. <strong>لا يستهلك رصيد توليد.</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleQuickTest} disabled={testing} variant="secondary" className="gap-2">
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
              تشغيل الاختبار
            </Button>

            {testResult && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-xs font-mono" dir="ltr">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">hasSubscription:</span>
                  <span className={testResult.hasSubscription ? "text-primary font-bold" : "text-muted-foreground"}>
                    {String(testResult.hasSubscription)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">limit (effective):</span>
                  <span className="font-bold text-foreground">{testResult.limit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">used today:</span>
                  <span className="font-bold text-foreground">{testResult.used}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">remaining:</span>
                  <span className={testResult.remaining === 0 ? "text-destructive font-bold" : "font-bold text-foreground"}>
                    {testResult.remaining}
                  </span>
                </div>
                <div className="border-t pt-1.5 mt-1.5 flex justify-between">
                  <span className="text-muted-foreground">freeLimit:</span>
                  <span>{testResult.freeLimit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">subscribedLimit:</span>
                  <span>{testResult.subscribedLimit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">source:</span>
                  <span className={testResult.source === "cache" ? "text-primary" : "text-muted-foreground"}>
                    {testResult.source}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Alert>
          <AlertDescription className="text-xs leading-relaxed">
            💡 لا حاجة لإعادة نشر دالة <code>generate-questions</code> — تُقرأ القيم من الكاش
            عند كل طلب توليد، وأي تعديل يُطبَّق على المحاولة التالية مباشرة.
          </AlertDescription>
        </Alert>
      </div>
    </AdminLayout>
  );
};

export default AdminAIGenerationLimits;
