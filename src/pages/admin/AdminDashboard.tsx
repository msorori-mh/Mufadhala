import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import { Building2, BookOpen, Users, Loader2, MessageCircle, Save, Bot, Type, FileText, BarChart3, TrendingUp, UserCheck, Unlock, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const AI_MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (سريع - افتراضي)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (متوازن)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (دقيق - أبطأ)" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (أسرع - أقل دقة)" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini (متوازن)" },
  { value: "openai/gpt-5", label: "GPT-5 (دقيق جداً - مكلف)" },
];

const AdminDashboard = () => {
  const { loading: authLoading, isAdmin } = useAuth("moderator");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: loading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const [u, c, m, s] = await Promise.all([
        supabase.from("universities").select("id", { count: "exact", head: true }),
        supabase.from("colleges").select("id", { count: "exact", head: true }),
        supabase.from("majors").select("id", { count: "exact", head: true }),
        supabase.from("students").select("id", { count: "exact", head: true }),
      ]);
      return {
        universities: u.count || 0,
        colleges: c.count || 0,
        majors: m.count || 0,
        students: s.count || 0,
      };
    },
    enabled: !authLoading,
    staleTime: 2 * 60 * 1000,
  });

  // Chat usage stats
  const { data: chatStats } = useQuery({
    queryKey: ["chat-usage-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_chat_stats", { _days: 30 });
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !authLoading && isAdmin,
    staleTime: 60 * 1000,
  });

  const chartData = useMemo(() => {
    if (!chatStats?.daily_breakdown) return [];
    const breakdown = typeof chatStats.daily_breakdown === "string"
      ? JSON.parse(chatStats.daily_breakdown)
      : chatStats.daily_breakdown;
    return (breakdown as any[]).map((d: any) => ({
      date: new Date(d.date).toLocaleDateString("ar-EG", { month: "short", day: "numeric" }),
      messages: d.messages,
      users: d.users,
    }));
  }, [chatStats]);

  // Chat settings from cache
  const { data: chatSettings } = useQuery({
    queryKey: ["chat-settings"],
    queryFn: async () => {
      const [limitRes, modelRes, welcomeRes, promptRes, freeLessonsRes, freeExamRes] = await Promise.all([
        supabase.rpc("get_cache", { _key: "chat_daily_limit" }),
        supabase.rpc("get_cache", { _key: "chat_ai_model" }),
        supabase.rpc("get_cache", { _key: "chat_welcome_text" }),
        supabase.rpc("get_cache", { _key: "chat_system_prompt" }),
        supabase.rpc("get_cache", { _key: "free_lessons_count" }),
        supabase.rpc("get_cache", { _key: "free_exam_minutes" }),
      ]);
      return {
        limit: limitRes.data != null ? Number(limitRes.data) : 30,
        model: typeof modelRes.data === "string" ? modelRes.data : "google/gemini-3-flash-preview",
        welcome: typeof welcomeRes.data === "string" ? welcomeRes.data : "مرحباً! أنا مساعد مُفَاضَلَة الذكي 👋",
        systemPrompt: typeof promptRes.data === "string" ? promptRes.data : "",
        freeLessonsCount: freeLessonsRes.data != null ? Number(freeLessonsRes.data) : 3,
        freeExamMinutes: freeExamRes.data != null ? Number(freeExamRes.data) : 5,
      };
    },
    enabled: !authLoading && isAdmin,
  });

  const [limitInput, setLimitInput] = useState("");
  const [modelInput, setModelInput] = useState("");
  const [welcomeInput, setWelcomeInput] = useState("");
  const [promptInput, setPromptInput] = useState<string | null>(null);
  const [freeLessonsInput, setFreeLessonsInput] = useState("");
  const [freeExamInput, setFreeExamInput] = useState("");

  const currentLimit = limitInput || String(chatSettings?.limit ?? 30);
  const currentModel = modelInput || chatSettings?.model || "google/gemini-3-flash-preview";
  const currentWelcome = welcomeInput !== "" ? welcomeInput : (chatSettings?.welcome ?? "");
  const currentPrompt = promptInput !== null ? promptInput : (chatSettings?.systemPrompt ?? "");
  const currentFreeLessons = freeLessonsInput || String(chatSettings?.freeLessonsCount ?? 3);
  const currentFreeExam = freeExamInput || String(chatSettings?.freeExamMinutes ?? 5);

  const saveCacheMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase.rpc("set_cache", {
        _key: key,
        _value: value as any,
        _ttl_seconds: 315360000,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "تم حفظ الإعداد بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["chat-settings"] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "فشل حفظ الإعداد", description: err.message });
    },
  });

  const saveLimit = () => {
    const val = Number(limitInput);
    if (val >= 1 && val <= 500) {
      saveCacheMutation.mutate({ key: "chat_daily_limit", value: val });
      setLimitInput("");
    }
  };

  const saveModel = () => {
    if (modelInput && modelInput !== chatSettings?.model) {
      saveCacheMutation.mutate({ key: "chat_ai_model", value: modelInput });
      setModelInput("");
    }
  };

  const saveWelcome = () => {
    if (welcomeInput && welcomeInput !== chatSettings?.welcome) {
      saveCacheMutation.mutate({ key: "chat_welcome_text", value: welcomeInput });
      setWelcomeInput("");
    }
  };

  const savePrompt = () => {
    if (promptInput !== null && promptInput !== chatSettings?.systemPrompt) {
      saveCacheMutation.mutate({ key: "chat_system_prompt", value: promptInput });
      setPromptInput(null);
    }
  };

  const saveFreeLessons = () => {
    const val = Number(freeLessonsInput);
    if (val >= 0 && val <= 50) {
      saveCacheMutation.mutate({ key: "free_lessons_count", value: val });
      setFreeLessonsInput("");
    }
  };

  const saveFreeExam = () => {
    const val = Number(freeExamInput);
    if (val >= 0 && val <= 90) {
      saveCacheMutation.mutate({ key: "free_exam_minutes", value: val });
      setFreeExamInput("");
    }
  };

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const cards = [
    { label: "الجامعات", value: stats?.universities ?? 0, icon: Building2, color: "text-primary" },
    { label: "الكليات", value: stats?.colleges ?? 0, icon: Building2, color: "text-accent" },
    { label: "التخصصات", value: stats?.majors ?? 0, icon: BookOpen, color: "text-secondary" },
    { label: "الطلاب", value: stats?.students ?? 0, icon: Users, color: "text-primary" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>
          <p className="text-sm text-muted-foreground">نظرة عامة على النظام</p>
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.label}>
              <CardHeader className="pb-2">
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chat Usage Stats — admin only */}
        {isAdmin && chatStats && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-5 h-5 text-primary" />
                إحصائيات المساعد الذكي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                <div className="rounded-lg bg-primary/5 p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{chatStats.total_messages ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1"><MessageCircle className="w-3 h-3" />إجمالي الرسائل</p>
                </div>
                <div className="rounded-lg bg-green-500/10 p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{chatStats.today_messages ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3" />رسائل اليوم</p>
                </div>
                <div className="rounded-lg bg-blue-500/10 p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{chatStats.unique_users ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1"><Users className="w-3 h-3" />مستخدمين فريدين</p>
                </div>
                <div className="rounded-lg bg-orange-500/10 p-3 text-center">
                  <p className="text-2xl font-bold text-orange-600">{chatStats.today_users ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1"><UserCheck className="w-3 h-3" />مستخدمو اليوم</p>
                </div>
              </div>

              {chartData.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">الرسائل اليومية (آخر 30 يوم)</p>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ fontSize: 12, direction: "rtl" }}
                          formatter={(value: number, name: string) => [value, name === "messages" ? "رسائل" : "مستخدمين"]}
                        />
                        <Bar dataKey="messages" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="messages" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Chat Settings — admin only */}
        {isAdmin && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="w-5 h-5 text-primary" />
                إعدادات المساعد الذكي
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Daily limit */}
              <div className="flex items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="chat-limit" className="text-sm flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5" />
                    حد الرسائل اليومي
                  </Label>
                  <Input
                    id="chat-limit"
                    type="number"
                    min={1}
                    max={500}
                    value={currentLimit}
                    onChange={(e) => setLimitInput(e.target.value)}
                    className="max-w-[120px]"
                  />
                  <p className="text-[10px] text-muted-foreground">الحالي: {chatSettings?.limit ?? 30} رسالة</p>
                </div>
                <Button
                  size="sm"
                  disabled={saveCacheMutation.isPending || !limitInput || Number(limitInput) === chatSettings?.limit}
                  onClick={saveLimit}
                >
                  {saveCacheMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 ml-1" />}
                  حفظ
                </Button>
              </div>

              {/* AI Model */}
              <div className="flex items-end gap-3">
                <div className="space-y-1.5 flex-1 max-w-sm">
                  <Label htmlFor="chat-model" className="text-sm flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5" />
                    نموذج الذكاء الاصطناعي
                  </Label>
                  <Select value={currentModel} onValueChange={(v) => setModelInput(v)}>
                    <SelectTrigger id="chat-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AI_MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    الحالي: {AI_MODELS.find(m => m.value === chatSettings?.model)?.label || chatSettings?.model}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={saveCacheMutation.isPending || !modelInput || modelInput === chatSettings?.model}
                  onClick={saveModel}
                >
                  {saveCacheMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 ml-1" />}
                  حفظ
                </Button>
              </div>

              {/* Welcome text */}
              <div className="space-y-1.5 max-w-lg">
                <Label htmlFor="chat-welcome" className="text-sm flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5" />
                  نص الترحيب
                </Label>
                <div className="flex gap-2">
                  <Textarea
                    id="chat-welcome"
                    value={currentWelcome}
                    onChange={(e) => setWelcomeInput(e.target.value)}
                    rows={2}
                    className="text-sm"
                    placeholder="مرحباً! أنا مساعد مُفَاضَلَة الذكي 👋"
                  />
                  <Button
                    size="sm"
                    className="shrink-0 self-end"
                    disabled={saveCacheMutation.isPending || !welcomeInput || welcomeInput === chatSettings?.welcome}
                    onClick={saveWelcome}
                  >
                    {saveCacheMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 ml-1" />}
                    حفظ
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">يظهر للطالب عند فتح المحادثة لأول مرة</p>
              </div>

              {/* System Prompt */}
              <div className="space-y-1.5 max-w-lg">
                <Label htmlFor="chat-prompt" className="text-sm flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  تعليمات المساعد (System Prompt)
                </Label>
                <div className="flex gap-2">
                  <Textarea
                    id="chat-prompt"
                    value={currentPrompt}
                    onChange={(e) => setPromptInput(e.target.value)}
                    rows={6}
                    className="text-sm font-mono text-xs"
                    placeholder="اتركه فارغاً لاستخدام التعليمات الافتراضية..."
                    dir="auto"
                  />
                  <Button
                    size="sm"
                    className="shrink-0 self-end"
                    disabled={saveCacheMutation.isPending || promptInput === null || promptInput === chatSettings?.systemPrompt}
                    onClick={savePrompt}
                  >
                    {saveCacheMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 ml-1" />}
                    حفظ
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">تعليمات توجّه المساعد الذكي في ردوده. اتركها فارغة لاستخدام التعليمات الافتراضية المدمجة.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;