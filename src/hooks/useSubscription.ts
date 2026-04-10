import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  const { data, isLoading } = useQuery({
    queryKey: ["subscription", userId],
    queryFn: async (): Promise<Omit<SubscriptionStatus, "loading">> => {
      const { data } = await supabase
        .from("subscriptions")
        .select("status, expires_at, plan_id, trial_ends_at, subscription_plans(slug, allowed_major_ids)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!data || data.length === 0) {
        return { ...defaultStatus, loading: false };
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
      };
    },
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 min — subscription rarely changes mid-session
  });

  if (isLoading || !data) {
    return { ...defaultStatus, loading: isLoading };
  }

  return { ...data, loading: false };
};
