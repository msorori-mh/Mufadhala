import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/admin/AdminLayout";
import { Loader2, ScrollText, UserX } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface DeletionLog {
  id: string;
  deleted_user_id: string;
  deleted_user_name: string | null;
  deleted_by: string;
  deleted_by_name: string | null;
  reason: string | null;
  created_at: string;
}

const AdminDeletionLogs = () => {
  const { loading: authLoading } = useAuth("admin");
  const [logs, setLogs] = useState<DeletionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    const fetchLogs = async () => {
      const { data } = await supabase
        .from("deletion_logs")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setLogs(data as DeletionLog[]);
      setLoading(false);
    };
    fetchLogs();
  }, [authLoading]);

  if (authLoading || loading) {
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
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ScrollText className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">سجل عمليات الحذف</h1>
            <p className="text-sm text-muted-foreground">{logs.length} عملية مسجلة</p>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UserX className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">لا توجد عمليات حذف مسجلة</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const isSelfDelete = log.deleted_by === log.deleted_user_id;
              return (
                <Card key={log.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">
                          {log.deleted_user_name || "مستخدم غير معروف"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {isSelfDelete ? (
                            "حذف ذاتي بواسطة المستخدم"
                          ) : (
                            <>بواسطة: <span className="font-medium">{log.deleted_by_name || "مدير"}</span></>
                          )}
                        </p>
                        {log.reason && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            السبب: {log.reason}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant={isSelfDelete ? "secondary" : "destructive"} className="text-[10px]">
                          {isSelfDelete ? "حذف ذاتي" : "حذف إداري"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(log.created_at), "dd MMM yyyy • HH:mm", { locale: ar })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDeletionLogs;
