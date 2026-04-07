import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type AppRole = "admin" | "moderator" | "student";

export const useAuth = (requiredRole?: AppRole) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!session) {
          navigate("/login");
          return;
        }
        setUser(session.user);
        // Fetch roles
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);
        const userRoles = (data || []).map((r) => r.role as AppRole);
        setRoles(userRoles);

        if (requiredRole && !userRoles.includes(requiredRole) && !userRoles.includes("admin")) {
          navigate("/dashboard");
          setLoading(false);
          return;
        }

        // Check profile completeness for students
        if (userRoles.includes("student") && !userRoles.includes("admin") && !userRoles.includes("moderator")) {
          const currentPath = window.location.pathname;
          if (currentPath !== "/complete-profile") {
            const { data: student } = await supabase
              .from("students")
              .select("major_id")
              .eq("user_id", session.user.id)
              .maybeSingle();
            if (!student?.major_id && !localStorage.getItem("profile_skipped")) {
              navigate("/complete-profile");
              setLoading(false);
              return;
            }
          }
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate("/login");
        return;
      }
      setUser(session.user);
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      const userRoles = (data || []).map((r) => r.role as AppRole);
      setRoles(userRoles);

      if (requiredRole && !userRoles.includes(requiredRole) && !userRoles.includes("admin")) {
        navigate("/dashboard");
        setLoading(false);
        return;
      }

      // Check profile completeness for students
      if (userRoles.includes("student") && !userRoles.includes("admin") && !userRoles.includes("moderator")) {
        const currentPath = window.location.pathname;
        if (currentPath !== "/complete-profile") {
          const { data: student } = await supabase
            .from("students")
            .select("major_id")
            .eq("user_id", session.user.id)
            .maybeSingle();
          if (!student?.major_id) {
            navigate("/complete-profile");
            setLoading(false);
            return;
          }
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate, requiredRole]);

  const isAdmin = roles.includes("admin");
  const isModerator = roles.includes("moderator");
  const isStaff = isAdmin || isModerator;

  return { user, roles, loading, isAdmin, isModerator, isStaff };
};
