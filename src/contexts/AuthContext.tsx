import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { saveNativeSession, getNativeSession, clearNativeSession } from "@/lib/nativeSessionStorage";
import { isNativePlatform } from "@/lib/capacitor";
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

    const initSession = async () => {
      // 1. Try standard session restore
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setUser(session.user);
        await fetchRoles(session.user.id);
        // Persist to native storage for next cold start
        await saveNativeSession(session.access_token, session.refresh_token);
        setLoading(false);
        return;
      }

      // 2. On native: try restoring from Capacitor Preferences
      if (isNativePlatform()) {
        const stored = await getNativeSession();
        if (stored) {
          const { data: { session: restoredSession }, error } = await supabase.auth.setSession({
            access_token: stored.accessToken,
            refresh_token: stored.refreshToken,
          });

          if (restoredSession && !error) {
            setUser(restoredSession.user);
            await fetchRoles(restoredSession.user.id);
            // Update stored tokens (they may have been refreshed)
            await saveNativeSession(restoredSession.access_token, restoredSession.refresh_token);
            setLoading(false);
            return;
          } else {
            // Stored tokens are invalid — clear them
            await clearNativeSession();
          }
        }
      }

      setLoading(false);
    };

    initSession();

    // Listen for subsequent auth changes (ignore INITIAL_SESSION)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION") return;

      if (session) {
        setUser(session.user);
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          fetchRoles(session.user.id);
          // Persist updated tokens to native storage
          saveNativeSession(session.access_token, session.refresh_token);
        }
      } else {
        setUser(null);
        setRoles([]);
        clearNativeSession();
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
