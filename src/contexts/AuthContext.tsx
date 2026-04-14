import { createContext, useContext, useEffect, useState, useRef } from "react";
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
  authLoading: boolean;
  rolesLoading: boolean;
  isAuthReady: boolean;
  isRolesReady: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isStaff: boolean;
  isRecoverySession: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  roles: [],
  loading: true,
  authLoading: true,
  rolesLoading: false,
  isAuthReady: false,
  isRolesReady: false,
  isAdmin: false,
  isModerator: false,
  isStaff: false,
  isRecoverySession: false,
});

export const useAuthContext = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isRolesReady, setIsRolesReady] = useState(false);
  const [isRecoverySession, setIsRecoverySession] = useState(
    () => sessionStorage.getItem("supabase_recovery_mode") === "true"
  );
  const initialized = useRef(false);
  const rolesFetchedForUser = useRef<string | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const fetchRoles = async (userId: string, attempt = 0): Promise<AppRole[]> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) {
        if (attempt < 1) {
          await new Promise((r) => setTimeout(r, 1000));
          return fetchRoles(userId, attempt + 1);
        }
        toast.error("تعذّر تحميل صلاحيات الحساب. يرجى إعادة تشغيل التطبيق.");
        return [];
      }
      return (data || []).map((r) => r.role as AppRole);
    };

    const completeAuth = async (sessionUser: User) => {
      setUser(sessionUser);
      setAuthLoading(false);
      setIsAuthReady(true);

      // Now fetch roles — block role readiness until done
      if (rolesFetchedForUser.current !== sessionUser.id) {
        setRolesLoading(true);
        rolesFetchedForUser.current = sessionUser.id;
        const userRoles = await fetchRoles(sessionUser.id);
        setRoles(userRoles);
        setRolesLoading(false);
        setIsRolesReady(true);
      }
    };

    const initSession = async () => {
      // 1. Try standard session restore
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        saveNativeSession(session.access_token, session.refresh_token);
        await completeAuth(session.user);
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
            saveNativeSession(restoredSession.access_token, restoredSession.refresh_token);
            await completeAuth(restoredSession.user);
            return;
          } else {
            await clearNativeSession();
          }
        }
      }

      // No session — mark everything as ready (no user, no roles needed)
      setAuthLoading(false);
      setIsAuthReady(true);
      setIsRolesReady(true);
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
          saveNativeSession(session.access_token, session.refresh_token);
          // Fetch roles on sign-in events
          if (rolesFetchedForUser.current !== session.user.id) {
            setRolesLoading(true);
            rolesFetchedForUser.current = session.user.id;
            const userRoles = await fetchRoles(session.user.id);
            setRoles(userRoles);
            setRolesLoading(false);
            setIsRolesReady(true);
          }
        }
      } else {
        setUser(null);
        setRoles([]);
        rolesFetchedForUser.current = null;
        setIsRolesReady(true);
        clearNativeSession();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = roles.includes("admin");
  const isModerator = roles.includes("moderator");
  const isStaff = isAdmin || isModerator;

  // Overall loading: true until BOTH auth and roles are resolved
  const loading = authLoading || rolesLoading || !isAuthReady || !isRolesReady;

  return (
    <AuthContext.Provider value={{
      user, roles, loading,
      authLoading, rolesLoading,
      isAuthReady, isRolesReady,
      isAdmin, isModerator, isStaff, isRecoverySession,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
