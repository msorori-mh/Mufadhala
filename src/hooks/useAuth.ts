import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";

type AppRole = "admin" | "moderator" | "student";

export const useAuth = (requiredRole?: AppRole) => {
  const navigate = useNavigate();
  const { user, roles, loading: authLoading, isAdmin, isModerator, isStaff, isRecoverySession } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;

    // Don't redirect during password recovery flow
    if (isRecoverySession) {
      setLoading(false);
      return;
    }

    if (!user) {
      navigate("/register");
      setLoading(false);
      return;
    }

    if (requiredRole && !roles.includes(requiredRole) && !roles.includes("admin")) {
      navigate("/dashboard");
      setLoading(false);
      return;
    }

    setLoading(false);
  }, [authLoading, user, roles, requiredRole, navigate, isRecoverySession]);

  return { user, roles, loading: loading || authLoading, isAdmin, isModerator, isStaff };
};
