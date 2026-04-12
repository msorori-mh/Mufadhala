import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";

type AppRole = "admin" | "moderator" | "student";

export const useAuth = (requiredRole?: AppRole) => {
  const navigate = useNavigate();
  const { user, roles, loading: authLoading, isAdmin, isModerator, isStaff } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate("/login");
      setLoading(false);
      return;
    }

    if (requiredRole && !roles.includes(requiredRole) && !roles.includes("admin")) {
      navigate("/dashboard");
      setLoading(false);
      return;
    }

    setLoading(false);
  }, [authLoading, user, roles, requiredRole, navigate]);

  return { user, roles, loading: loading || authLoading, isAdmin, isModerator, isStaff };
};
