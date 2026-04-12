import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import { Building2, BookOpen, Users, Loader2, MessageCircle, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  // Chat daily limit setting
  const { data: chatLimit } = useQuery({
    queryKey: ["chat-daily-limit"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_cache", { _key: "chat_daily_limit" });
      return data != null ? Number(data) : 30;
    },
    enabled: !authLoading && isAdmin,
  });

  const [limitInput, setLimitInput] = useState<string>("");
  const limitValue = limitInput || String(chatLimit ?? 30);

  const saveLimitMutation = useMutation({
    mutationFn: async (newLimit: number) => {
      const { error } = await supabase.rpc("set_cache", {
        _key: "chat_daily_limit",
        _value: newLimit as any,
        _ttl_seconds: 315360000, // 10 years
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "تم حفظ حد الرسائل اليومي بنجاح" });
      setLimitInput("");
      queryClient.invalidateQueries({ queryKey: ["chat-daily-limit"] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "فشل حفظ الإعداد", description: err.message });
    },
  });

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

        {/* Chat Settings — admin only */}
        {isAdmin && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="w-5 h-5 text-primary" />
                إعدادات المساعد الذكي
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 max-w-sm">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="chat-limit" className="text-sm">حد الرسائل اليومي لكل طالب</Label>
                  <Input
                    id="chat-limit"
                    type="number"
                    min={1}
                    max={500}
                    value={limitValue}
                    onChange={(e) => setLimitInput(e.target.value)}
                    className="max-w-[120px]"
                  />
                </div>
                <Button
                  size="sm"
                  disabled={saveLimitMutation.isPending || !limitInput || Number(limitInput) === chatLimit}
                  onClick={() => {
                    const val = Number(limitInput);
                    if (val >= 1 && val <= 500) saveLimitMutation.mutate(val);
                  }}
                >
                  {saveLimitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 ml-1" />}
                  حفظ
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                الحد الحالي: {chatLimit ?? 30} رسالة يومياً
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
