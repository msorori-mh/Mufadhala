import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { Home, BookOpen, ClipboardCheck, Bell, Settings, Shield } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { isNativePlatform } from "@/lib/capacitor";
import { supabase } from "@/integrations/supabase/client";

const studentNavItems = [
  { path: "/dashboard", icon: Home, label: "الرئيسية" },
  { path: "/lessons", icon: BookOpen, label: "الدروس" },
  { path: "/exam", icon: ClipboardCheck, label: "الاختبار" },
  { path: "/notifications", icon: Bell, label: "الإشعارات" },
  { path: "/settings", icon: Settings, label: "الإعدادات" },
];

const adminNavItems = [
  { path: "/dashboard", icon: Home, label: "الرئيسية" },
  { path: "/admin/content", icon: BookOpen, label: "المحتوى" },
  { path: "/admin", icon: Shield, label: "الإدارة" },
  { path: "/notifications", icon: Bell, label: "الإشعارات" },
];

const MobileBottomNav = React.forwardRef<HTMLElement>((_, ref) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const isNative = isNativePlatform();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .then(({ data }) => {
          if (data?.some((r) => r.role === "admin")) setIsAdmin(true);
        });
    });
  }, []);

  // Show nav bar on mobile screens OR when running inside Capacitor native app
  if (!isMobile && !isNative) return null;

  const publicPaths = ["/", "/login", "/register"];
  if (publicPaths.includes(location.pathname)) return null;

  const navItems = isAdmin ? adminNavItems : studentNavItems;

  return (
    <nav ref={ref} className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border pb-safe">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
});

MobileBottomNav.displayName = "MobileBottomNav";

export default MobileBottomNav;
