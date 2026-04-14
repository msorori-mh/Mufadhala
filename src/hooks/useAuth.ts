import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";

type AppRole = "admin" | "moderator" | "student";

export const useAuth = (requiredRole?: AppRole) => {
  const navigate = useNavigate();
  const {
    user, roles,
    loading: contextLoading,
    authLoading, rolesLoading,
    isAuthReady, isRolesReady,
    isAdmin, isModerator, isStaff, isRecoverySession,
  } = useAuthContext();
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    // Wait until both auth AND roles are fully resolved
    if (!isAuthReady || !isRolesReady) return;

    // Don't redirect during password recovery flow
    if (isRecoverySession) return;

    // Prevent duplicate redirects
    if (redirected) return;

    if (!user) {
      setRedirected(true);
      navigate("/register");
      return;
    }

    if (requiredRole && !roles.includes(requiredRole) && !roles.includes("admin")) {
      setRedirected(true);
      navigate("/dashboard");
      return;
    }
  }, [isAuthReady, isRolesReady, user, roles, requiredRole, navigate, isRecoverySession, redirected]);

  return {
    user, roles,
    loading: contextLoading,
    authLoading, rolesLoading,
    isAuthReady, isRolesReady,
    isAdmin, isModerator, isStaff,
  };
};
