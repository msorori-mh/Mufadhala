import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SubscriptionStatus {
  hasSubscription: boolean;
  isActive: boolean;
  isPending: boolean;
  isTrial: boolean;
  trialEndsAt: string | null;
  expiresAt: string | null;
  planId: string | null;
  planSlug: string | null;
  allowedMajorIds: string[] | null;
  loading: boolean;
}

const defaultStatus: SubscriptionStatus = {
  hasSubscription: false, isActive: false, isPending: false,
  isTrial: false, trialEndsAt: null,
  expiresAt: null, planId: null, planSlug: null, allowedMajorIds: null, loading: true,
};

export const useSubscription = (userId: string | undefined): SubscriptionStatus => {
  const prevStatusRef = useRef<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["subscription", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("status, expires_at, plan_id, trial_ends_at, subscription_plans(slug, allowed_major_ids)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!data || data.length === 0) {
        return {
          hasSubscription: false, isActive: false, isPending: false,
          isTrial: false, trialEndsAt: null as string | null, expiresAt: null as string | null,
          planId: null as string | null, planSlug: null as string | null,
          allowedMajorIds: null as string[] | null, rawStatus: null as string | null,
        };
      }

      const sub = data[0];
      const isActive = sub.status === "active" && (!sub.expires_at || new Date(sub.expires_at) > new Date());
      const isTrial = sub.status === "trial" && !!sub.trial_ends_at && new Date(sub.trial_ends_at) > new Date();
      const plan = sub.subscription_plans as { slug: string; allowed_major_ids: string[] | null } | null;

      return {
        hasSubscription: true,
        isActive: isActive || isTrial,
        isPending: sub.status === "pending",
        isTrial,
        trialEndsAt: sub.trial_ends_at,
        expiresAt: sub.expires_at,
        planId: sub.plan_id,
        planSlug: plan?.slug ?? null,
        allowedMajorIds: plan?.allowed_major_ids ?? null,
        rawStatus: sub.status,
      };
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 60_000,
  });

  // Show toast when status transitions from pending → active/rejected
  useEffect(() => {
    if (!data) return;
    const current = data.rawStatus;
    const prev = prevStatusRef.current;
    prevStatusRef.current = current;

    if (prev === "pending" && current === "active") {
      toast.success("تم قبول الدفع وتفعيل اشتراكك بنجاح! 🎉");
    } else if (prev === "pending" && current === "rejected") {
      toast.error("تم رفض طلب الدفع. يرجى المحاولة مرة أخرى.");
    }
  }, [data]);

  if (isLoading || !data) {
    return { ...defaultStatus, loading: isLoading };
  }

  const { rawStatus: _, ...rest } = data;
  return { ...rest, loading: false };
};
