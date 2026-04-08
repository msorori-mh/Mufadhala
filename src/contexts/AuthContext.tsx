import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

type AppRole = "admin" | "moderator" | "student";

interface AuthState {
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  roles: [],
  loading: true,
  isAdmin: false,
  isModerator: false,
  isStaff: false,
});

export const useAuthContext = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const fetchRoles = async (userId: string) => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      const userRoles = (data || []).map((r) => r.role as AppRole);
      setRoles(userRoles);
    };

    // 1. Restore session from storage
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        await fetchRoles(session.user.id);
      }
      setLoading(false);
    });

    // 2. Listen for subsequent changes (ignore INITIAL_SESSION)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;

      if (session) {
        setUser(session.user);
        if (event === "SIGNED_IN") {
          fetchRoles(session.user.id);
        }
      } else {
        setUser(null);
        setRoles([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = roles.includes("admin");
  const isModerator = roles.includes("moderator");
  const isStaff = isAdmin || isModerator;

  return (
    <AuthContext.Provider value={{ user, roles, loading, isAdmin, isModerator, isStaff }}>
      {children}
    </AuthContext.Provider>
  );
}
