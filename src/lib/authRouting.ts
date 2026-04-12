import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "moderator" | "student";

export interface AuthDestination {
  path: string;
  roles: AppRole[];
}

/**
 * Determines where to send a user after authentication.
 * Simplified: no profile completeness check.
 */
export async function resolveAuthDestination(userId: string): Promise<AuthDestination> {
  const { data: rolesData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const roles = (rolesData || []).map((r) => r.role as AppRole);

  if (roles.includes("admin")) return { path: "/admin", roles };
  return { path: "/dashboard", roles };
}
