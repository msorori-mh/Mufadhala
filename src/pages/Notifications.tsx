import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { GraduationCap, ArrowRight, Bell, Check, Loader2 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const Notifications = () => {
  const { user, loading: authLoading } = useAuthContext();
  const queryClient = useQueryClient();

  // Polling every 30s instead of dedicated realtime channel
  const { data: notifications = [], isLoading: loading } = useQuery({
    queryKey: ["notifications-list", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user && !authLoading,
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000, // poll every 30s
  });

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    queryClient.setQueryData<any[]>(["notifications-list", user?.id], (old) =>
      (old ?? []).map((n: any) => n.id === id ? { ...n, is_read: true } : n)
    );
    queryClient.setQueryData<number>(["unread-count", user?.id], (old) => Math.max((old ?? 1) - 1, 0));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    queryClient.setQueryData<any[]>(["notifications-list", user?.id], (old) =>
      (old ?? []).map((n: any) => ({ ...n, is_read: true }))
    );
    queryClient.setQueryData<number>(["unread-count", user?.id], () => 0);
  };

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  const typeColors: Record<string, string> = {
    info: "border-r-primary",
    success: "border-r-accent",
    warning: "border-r-secondary",
    error: "border-r-destructive",
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-primary text-white px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6" />
            <span className="text-lg font-bold">مُفَاضَلَة</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20 hover:text-white">
              <Link to="/dashboard"><ArrowRight className="w-4 h-4 ml-1" />العودة</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-20 md:pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">الإشعارات</h1>
            <p className="text-sm text-muted-foreground">{unreadCount > 0 ? `${unreadCount} إشعار جديد` : "لا توجد إشعارات جديدة"}</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <Check className="w-3 h-3 ml-1" />تعليم الكل كمقروء
            </Button>
          )}
        </div>

        {notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map((n: any) => (
              <Card key={n.id} className={`border-r-4 ${typeColors[n.type] || typeColors.info} ${!n.is_read ? "bg-primary/5" : ""}`}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className={`text-sm ${!n.is_read ? "font-bold" : "font-medium"}`}>{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString("ar")}</p>
                    </div>
                    {!n.is_read && (
                      <Button variant="ghost" size="icon" onClick={() => markAsRead(n.id)} className="shrink-0">
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="py-12 text-center"><Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">لا توجد إشعارات</p></CardContent></Card>
        )}
      </main>
    </div>
  );
};

export default Notifications;
