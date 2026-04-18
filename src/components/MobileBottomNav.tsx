import React, { useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { Home, BookOpen, ClipboardCheck, Sparkles, Bell, Shield, MoreHorizontal, Settings as SettingsIcon, UserCircle, Trophy, LogOut } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { isNativePlatform } from "@/lib/capacitor";
import { useAuthContext } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";

const studentNavItems = [
  { path: "/dashboard", icon: Home, label: "الرئيسية" },
  { path: "/lessons", icon: BookOpen, label: "الدروس" },
  { path: "/quick-review", icon: Sparkles, label: "المراجعة" },
  { path: "/exam", icon: ClipboardCheck, label: "الاختبار" },
];

const adminNavItems = [
  { path: "/dashboard", icon: Home, label: "الرئيسية" },
  { path: "/admin/content", icon: BookOpen, label: "المحتوى" },
  { path: "/admin", icon: Shield, label: "الإدارة" },
  { path: "/notifications", icon: Bell, label: "الإشعارات" },
];

const studentMoreItems = [
  { path: "/settings", icon: SettingsIcon, label: "الإعدادات" },
  { path: "/profile", icon: UserCircle, label: "الملف الشخصي" },
  { path: "/achievements", icon: Trophy, label: "الإنجازات" },
  { path: "/notifications", icon: Bell, label: "الإشعارات" },
];

const MobileBottomNav = React.forwardRef<HTMLElement>((_, ref) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isNative = isNativePlatform();
  const { isAdmin } = useAuthContext();
  const [moreOpen, setMoreOpen] = useState(false);

  // Show nav bar on mobile screens OR when running inside Capacitor native app
  if (!isMobile && !isNative) return null;

  const publicPaths = ["/", "/login", "/register"];
  if (publicPaths.includes(location.pathname)) return null;

  const navItems = isAdmin ? adminNavItems : studentNavItems;
  const showMore = !isAdmin;

  const handleLogout = async () => {
    setMoreOpen(false);
    await supabase.auth.signOut();
    navigate("/login");
  };

  const moreActive = studentMoreItems.some(
    (i) => location.pathname === i.path || location.pathname.startsWith(i.path + "/")
  );

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

        {showMore && (
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                  moreActive ? "text-primary" : "text-muted-foreground"
                }`}
                aria-label="المزيد"
              >
                <MoreHorizontal className={`w-5 h-5 ${moreActive ? "stroke-[2.5]" : ""}`} />
                <span className="text-[10px] font-medium leading-none">المزيد</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl pb-safe" dir="rtl">
              <SheetHeader>
                <SheetTitle className="text-right">المزيد</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-1 divide-y divide-border mt-2">
                {studentMoreItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 py-3.5 text-foreground hover:bg-muted/50 px-2 rounded-md transition-colors"
                  >
                    <item.icon className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-3 py-3.5 text-destructive hover:bg-destructive/10 px-2 rounded-md transition-colors text-right"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-medium">تسجيل الخروج</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  );
});

MobileBottomNav.displayName = "MobileBottomNav";

export default MobileBottomNav;
