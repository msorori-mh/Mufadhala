import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap, LayoutDashboard, Building2, BookOpen, Users, UserCog,
  LogOut, ChevronDown, ChevronUp, BarChart3, FileText,
  CreditCard, Wallet, ListChecks, DollarSign, ClipboardCheck, ArrowRight, ArrowLeft, Tag, FlaskConical, ScrollText,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useModeratorPermissions, type ModeratorPermission } from "@/hooks/useModeratorPermissions";

interface NavItem {
  path: string;
  label: string;
  icon: any;
  permission?: ModeratorPermission | "admin_only";
}

const mainNavItems: NavItem[] = [
  { path: "/admin", label: "لوحة التحكم", icon: LayoutDashboard },
  { path: "/admin/universities", label: "الجامعات", icon: Building2, permission: "universities" },
  { path: "/admin/colleges", label: "الكليات", icon: Building2, permission: "universities" },
  { path: "/admin/majors", label: "التخصصات", icon: BookOpen, permission: "universities" },
  { path: "/admin/students", label: "الطلاب", icon: Users, permission: "students" },
  { path: "/admin/content", label: "المحتوى", icon: FileText, permission: "content" },
  { path: "/admin/subjects", label: "المواد الدراسية", icon: FlaskConical, permission: "content" },
  { path: "/admin/users", label: "المستخدمون", icon: UserCog, permission: "admin_only" },
  { path: "/admin/subscription-plans", label: "خطط الاشتراك", icon: ListChecks, permission: "subscriptions" },
  { path: "/admin/promo-codes", label: "أكواد الخصم", icon: Tag, permission: "subscriptions" },
  { path: "/admin/payment-methods", label: "طرق الدفع", icon: Wallet, permission: "payment_methods" },
  { path: "/admin/payments", label: "طلبات الدفع", icon: CreditCard, permission: "payments" },
  { path: "/admin/deletion-logs", label: "سجل الحذف", icon: ScrollText, permission: "admin_only" },
];

const reportSubItems: NavItem[] = [
  { path: "/admin/reports/students", label: "الطلاب", icon: Users },
  { path: "/admin/reports/payments", label: "الدفع والإيرادات", icon: DollarSign },
  { path: "/admin/reports/subscriptions", label: "الاشتراكات", icon: ListChecks },
  { path: "/admin/reports/exams", label: "الاختبارات", icon: ClipboardCheck },
  { path: "/admin/reports/comparison", label: "مقارنة الفترات", icon: BarChart3 },
];

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { hasPermission } = useModeratorPermissions(user?.id, isAdmin, authLoading);
  const isReportsRoute = location.pathname.startsWith("/admin/reports");
  const [reportsOpen, setReportsOpen] = useState(isReportsRoute);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const canSeeItem = (item: NavItem): boolean => {
    if (!item.permission) return true;
    if (item.permission === "admin_only") return isAdmin;
    return hasPermission(item.permission);
  };

  const canSeeReports = isAdmin || hasPermission("reports");

  const visibleMainItems = mainNavItems.filter(canSeeItem);
  const visibleReportItems = canSeeReports ? reportSubItems : [];

  const renderNavLink = (item: NavItem) => {
    const isActive = location.pathname === item.path;
    return (
      <Link
        key={item.path}
        to={item.path}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <item.icon className="w-4 h-4" />
        {item.label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-l hidden md:flex flex-col">
        <div className="p-4 border-b">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-foreground text-sm">مُفَاضَلَة</span>
              <p className="text-[10px] text-muted-foreground">لوحة الإدارة</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleMainItems.map(renderNavLink)}

          {/* Reports collapsible */}
          {canSeeReports && (
            <>
              <button
                onClick={() => setReportsOpen(!reportsOpen)}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                  isReportsRoute ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  التقارير
                </div>
                {reportsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {reportsOpen && (
                <div className="mr-4 space-y-0.5 border-r-2 border-border pr-2">
                  {visibleReportItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                          isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <item.icon className="w-3.5 h-3.5" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </nav>

        <div className="p-3 border-t space-y-1">
          <ThemeToggle variant="sidebar" />
          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 w-full">
            <LogOut className="w-4 h-4" /> تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex-1 flex flex-col">
        <header className="md:hidden gradient-primary text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            <span className="font-bold text-sm">لوحة الإدارة</span>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate(1)} className="text-white hover:bg-white/20 hover:text-white">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-white hover:bg-white/20 hover:text-white">
              <ArrowRight className="w-4 h-4" />
            </Button>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-white/20 hover:text-white">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Mobile nav */}
        <div className="md:hidden overflow-x-auto border-b bg-card">
          <div className="flex px-2 py-2 gap-1 min-w-max">
            {visibleMainItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                  {item.label}
                </Link>
              );
            })}
            {visibleReportItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                  📊 {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Desktop top bar */}
        <div className="hidden md:flex items-center justify-between px-6 py-3 border-b bg-card">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive hover:bg-destructive/10">
            <LogOut className="w-4 h-4 ml-1" />
            تسجيل الخروج
          </Button>
        </div>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
