import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "moderator" | "student";

// Module-level cache for profile check results per user
const profileCheckCache = new Map<string, boolean>();

export const useAuth = (requiredRole?: AppRole) => {
  const navigate = useNavigate();
  const { user, roles, loading: authLoading, isAdmin, isModerator, isStaff } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;

    // No session → redirect to login
    if (!user) {
      navigate("/login");
      setLoading(false);
      return;
    }

    // Check required role
    if (requiredRole && !roles.includes(requiredRole) && !roles.includes("admin")) {
      navigate("/dashboard");
      setLoading(false);
      return;
    }

    // Check profile completeness for students only (once per user, cached)
    if (
      roles.includes("student") &&
      !roles.includes("admin") &&
      !roles.includes("moderator") &&
      !checkedRef.current
    ) {
      checkedRef.current = true;
      const currentPath = window.location.pathname;
      if (currentPath !== "/complete-profile") {
        // Check module-level cache first
        const cached = profileCheckCache.get(user.id);
        if (cached !== undefined) {
          if (!cached && !localStorage.getItem("profile_skipped")) {
            navigate("/complete-profile");
          }
          setLoading(false);
          return;
        }

        supabase
          .from("students")
          .select("major_id")
          .eq("user_id", user.id)
          .maybeSingle()
          .then(({ data: student }) => {
            const hasProfile = !!student?.major_id;
            profileCheckCache.set(user.id, hasProfile);
            if (!hasProfile && !localStorage.getItem("profile_skipped")) {
              navigate("/complete-profile");
            }
            setLoading(false);
          });
        return;
      }
    }

    setLoading(false);
  }, [authLoading, user, roles, requiredRole, navigate]);

  return { user, roles, loading: loading || authLoading, isAdmin, isModerator, isStaff };
};
