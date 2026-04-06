import { useEffect, useState } from "react";
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
  loading: boolean;
}

export const useSubscription = (userId: string | undefined): SubscriptionStatus => {
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasSubscription: false, isActive: false, isPending: false,
    isTrial: false, trialEndsAt: null,
    expiresAt: null, planId: null, planSlug: null, loading: true,
  });

  useEffect(() => {
    if (!userId) return;

    const fetchSub = async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("status, expires_at, plan_id, trial_ends_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!data || data.length === 0) {
        setStatus((prev) => ({ ...prev, loading: false }));
        return;
      }

      const sub = data[0];
      const isActive = sub.status === "active" && (!sub.expires_at || new Date(sub.expires_at) > new Date());
      const isTrial = sub.status === "trial" && !!sub.trial_ends_at && new Date(sub.trial_ends_at) > new Date();

      let planSlug: string | null = null;
      if (sub.plan_id) {
        const { data: plan } = await supabase
          .from("subscription_plans")
          .select("slug")
          .eq("id", sub.plan_id)
          .single();
        if (plan) planSlug = plan.slug;
      }

      setStatus({
        hasSubscription: true,
        isActive: isActive || isTrial,
        isPending: sub.status === "pending",
        isTrial,
        trialEndsAt: sub.trial_ends_at,
        expiresAt: sub.expires_at,
        planId: sub.plan_id,
        planSlug,
        loading: false,
      });
    };

    fetchSub();
  }, [userId]);

  return status;
};
