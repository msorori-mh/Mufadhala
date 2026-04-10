import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "moderator" | "student";

export interface AuthDestination {
  path: string;
  roles: AppRole[];
}

/**
 * Determines where to send a user after authentication.
 * Does NOT navigate — just returns the target path.
 */
export async function resolveAuthDestination(userId: string): Promise<AuthDestination> {
  // Fetch roles
  const { data: rolesData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const roles = (rolesData || []).map((r) => r.role as AppRole);

  const isAdmin = roles.includes("admin");
  const isModerator = roles.includes("moderator");

  // Admin/moderator go straight to admin or dashboard
  if (isAdmin) return { path: "/admin", roles };
  if (isModerator) return { path: "/dashboard", roles };

  // Student: check profile completeness
  const { data: student } = await supabase
    .from("students")
    .select("college_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!student?.college_id && !localStorage.getItem("profile_skipped")) {
    return { path: "/complete-profile", roles };
  }

  return { path: "/dashboard", roles };
}
