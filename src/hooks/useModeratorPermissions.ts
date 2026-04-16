import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ModeratorPermission =
  | "content"
  | "students"
  | "payments"
  | "payment_methods"
  | "subscriptions"
  | "reports"
  | "universities"
  | "past_exams";

export const PERMISSION_LABELS: Record<ModeratorPermission, string> = {
  content: "المحتوى التعليمي",
  students: "إدارة الطلاب",
  payments: "طلبات الدفع",
  payment_methods: "طرق الدفع",
  subscriptions: "إعدادات الاشتراك",
  reports: "التقارير",
  universities: "الجامعات والكليات والتخصصات",
  past_exams: "نماذج الاختبارات السابقة",
};

export const ALL_PERMISSIONS: ModeratorPermission[] = [
  "content",
  "students",
  "payments",
  "payment_methods",
  "subscriptions",
  "reports",
  "universities",
  "past_exams",
];

export const useModeratorPermissions = (
  userId: string | undefined,
  isAdmin: boolean,
  authLoading: boolean = false
) => {
  const [permissions, setPermissions] = useState<ModeratorPermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!userId) return;
    if (isAdmin) {
      setPermissions([...ALL_PERMISSIONS]);
      setLoading(false);
      return;
    }

    supabase
      .from("moderator_permissions")
      .select("permission")
      .eq("user_id", userId)
      .then(({ data }) => {
        setPermissions(
          (data || []).map((d: any) => d.permission as ModeratorPermission)
        );
        setLoading(false);
      });
  }, [userId, isAdmin, authLoading]);

  const hasPermission = (permission: ModeratorPermission): boolean => {
    if (isAdmin) return true;
    return permissions.includes(permission);
  };

  return { permissions, loading, hasPermission };
};
