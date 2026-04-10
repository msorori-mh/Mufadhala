import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "moderator" | "student";

export const useAuth = (requiredRole?: AppRole) => {
  const navigate = useNavigate();
  const { user, roles, loading: authLoading, isAdmin, isModerator, isStaff } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [profileChecked, setProfileChecked] = useState(false);

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

    // Check profile completeness for students only
    if (
      roles.includes("student") &&
      !roles.includes("admin") &&
      !roles.includes("moderator") &&
      !profileChecked
    ) {
      const currentPath = window.location.pathname;
      if (currentPath !== "/complete-profile") {
        supabase
          .from("students")
          .select("major_id")
          .eq("user_id", user.id)
          .maybeSingle()
          .then(({ data: student }) => {
            if (!student?.major_id && !localStorage.getItem("profile_skipped")) {
              navigate("/complete-profile");
            }
            setProfileChecked(true);
            setLoading(false);
          });
        return;
      }
    }

    setLoading(false);
  }, [authLoading, user, roles, requiredRole, navigate, profileChecked]);

  return { user, roles, loading: loading || authLoading, isAdmin, isModerator, isStaff };
};
