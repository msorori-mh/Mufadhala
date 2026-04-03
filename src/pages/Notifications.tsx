import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, ArrowRight, Bell, Check, Loader2 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const Notifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (data) setNotifications(data);
      setLoading(false);

      // Realtime
      const channel = supabase
        .channel("user-notifications")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${session.user.id}` }, (payload) => {
          setNotifications((prev) => [payload.new as any, ...prev]);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    };
    init();
  }, []);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", session.user.id).eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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
            <span className="text-lg font-bold">مفاضلة</span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild className="text-white hover:bg-white/20 hover:text-white">
              <Link to="/dashboard"><ArrowRight className="w-4 h-4 ml-1" />العودة</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
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
            {notifications.map((n) => (
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
