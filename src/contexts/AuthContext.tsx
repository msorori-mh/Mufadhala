import { createContext, useContext, useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { saveNativeSession, getNativeSession, clearNativeSession } from "@/lib/nativeSessionStorage";
import { toast } from "sonner";
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
  isRecoverySession: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  roles: [],
  loading: true,
  isAdmin: false,
  isModerator: false,
  isStaff: false,
  isRecoverySession: false,
});

export const useAuthContext = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRecoverySession, setIsRecoverySession] = useState(
    () => sessionStorage.getItem("supabase_recovery_mode") === "true"
  );
  const initialized = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const fetchRoles = async (userId: string, attempt = 0) => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) {
        if (attempt < 1) {
          // Retry once after 1 second
          setTimeout(() => fetchRoles(userId, attempt + 1), 1000);
          return;
        }
        toast.error("تعذّر تحميل صلاحيات الحساب. يرجى إعادة تشغيل التطبيق.");
        return;
      }
      const userRoles = (data || []).map((r) => r.role as AppRole);
      setRoles(userRoles);
    };

    const initSession = async () => {
      // 1. Try standard session restore
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setUser(session.user);
        setLoading(false); // Unblock UI immediately
        // Fetch roles in background — doesn't block first paint
        fetchRoles(session.user.id);
        saveNativeSession(session.access_token, session.refresh_token);
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
            setLoading(false); // Unblock UI immediately
            fetchRoles(restoredSession.user.id);
            saveNativeSession(restoredSession.access_token, restoredSession.refresh_token);
            return;
          } else {
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

      if (event === "PASSWORD_RECOVERY") {
        setIsRecoverySession(true);
        sessionStorage.setItem("supabase_recovery_mode", "true");
      }

      if (session) {
        setUser(session.user);
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          fetchRoles(session.user.id);
          saveNativeSession(session.access_token, session.refresh_token);
          // Refresh student-related data so admin updates appear without logout/login
          queryClient.invalidateQueries({ queryKey: ["student"] });
          queryClient.invalidateQueries({ queryKey: ["subscription"] });
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
    <AuthContext.Provider value={{ user, roles, loading, isAdmin, isModerator, isStaff, isRecoverySession }}>
      {children}
    </AuthContext.Provider>
  );
}
