import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { isNativePlatform } from "@/lib/capacitor";
import { useOfflineExamSync } from "./hooks/useOfflineExamSync";
import { useEffect } from "react";
import { initializeCapacitor } from "./lib/capacitor";

// Eager imports — critical student pages (no spinner on navigation)
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import LessonsList from "./pages/LessonsList";
import LessonDetail from "./pages/LessonDetail";
import ExamSimulator from "./pages/ExamSimulator";
import Notifications from "./pages/Notifications";

// Eager — always needed
import MobileBottomNav from "./components/MobileBottomNav";

// Lazy imports — secondary pages


const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminResetPassword = lazy(() => import("./pages/AdminResetPassword"));
const StudentProfile = lazy(() => import("./pages/StudentProfile"));
const ExamHistory = lazy(() => import("./pages/ExamHistory"));
const StudentPerformance = lazy(() => import("./pages/StudentPerformance"));
const Subscription = lazy(() => import("./pages/Subscription"));
const SearchContent = lazy(() => import("./pages/SearchContent"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const Achievements = lazy(() => import("./pages/Achievements"));
const CollegeGuide = lazy(() => import("./pages/CollegeGuide"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUniversities = lazy(() => import("./pages/admin/AdminUniversities"));
const AdminColleges = lazy(() => import("./pages/admin/AdminColleges"));
const AdminMajors = lazy(() => import("./pages/admin/AdminMajors"));
const AdminStudents = lazy(() => import("./pages/admin/AdminStudents"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminReportsStudents = lazy(() => import("./pages/admin/AdminReportsStudents"));
const AdminReportsPayments = lazy(() => import("./pages/admin/AdminReportsPayments"));
const AdminReportsSubscriptions = lazy(() => import("./pages/admin/AdminReportsSubscriptions"));
const AdminReportsExams = lazy(() => import("./pages/admin/AdminReportsExams"));
const AdminReportsComparison = lazy(() => import("./pages/admin/AdminReportsComparison"));
const AdminContent = lazy(() => import("./pages/admin/AdminContent"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminSubscriptionPlans = lazy(() => import("./pages/admin/AdminSubscriptionPlans"));
const AdminPaymentMethods = lazy(() => import("./pages/admin/AdminPaymentMethods"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminPromoCodes = lazy(() => import("./pages/admin/AdminPromoCodes"));
const AdminSubjects = lazy(() => import("./pages/admin/AdminSubjects"));
const AdminDeletionLogs = lazy(() => import("./pages/admin/AdminDeletionLogs"));
const AdminProfile = lazy(() => import("./pages/admin/AdminProfile"));
const Settings = lazy(() => import("./pages/Settings"));
const DeleteAccount = lazy(() => import("./pages/DeleteAccount"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Lazy load non-critical components
const ChatWidget = lazy(() => import("./components/ChatWidget"));
const InstallAppPrompt = lazy(() => import("./components/InstallAppPrompt"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-3">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-6 w-1/3" />
      <div className="space-y-2 mt-4">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    </div>
  );
}

function OfflineExamSyncProvider({ children }: { children: React.ReactNode }) {
  useOfflineExamSync();
  return <>{children}</>;
}

const isNative = isNativePlatform();

function App() {
  useEffect(() => {
    initializeCapacitor();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <OfflineExamSyncProvider>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/complete-profile" element={<Navigate to="/profile" replace />} />
                  <Route path="/admin-login" element={<AdminLogin />} />
                  <Route path="/admin-reset-password" element={<AdminResetPassword />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/profile" element={<StudentProfile />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/lessons" element={<LessonsList />} />
                  <Route path="/lessons/:id" element={<LessonDetail />} />
                  <Route path="/exam" element={<ExamSimulator />} />
                  <Route path="/exam-history" element={<ExamHistory />} />
                  <Route path="/performance" element={<StudentPerformance />} />
                  <Route path="/subscription" element={<Subscription />} />
                  <Route path="/search" element={<SearchContent />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/achievements" element={<Achievements />} />
                  <Route path="/college-guide" element={<CollegeGuide />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/delete-account" element={<DeleteAccount />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-service" element={<TermsOfService />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/universities" element={<AdminUniversities />} />
                  <Route path="/admin/colleges" element={<AdminColleges />} />
                  <Route path="/admin/majors" element={<AdminMajors />} />
                  <Route path="/admin/students" element={<AdminStudents />} />
                  <Route path="/admin/reports" element={<AdminReports />} />
                  <Route path="/admin/reports/students" element={<AdminReportsStudents />} />
                  <Route path="/admin/reports/payments" element={<AdminReportsPayments />} />
                  <Route path="/admin/reports/subscriptions" element={<AdminReportsSubscriptions />} />
                  <Route path="/admin/reports/exams" element={<AdminReportsExams />} />
                  <Route path="/admin/reports/comparison" element={<AdminReportsComparison />} />
                  <Route path="/admin/content" element={<AdminContent />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/subscription-plans" element={<AdminSubscriptionPlans />} />
                  <Route path="/admin/payment-methods" element={<AdminPaymentMethods />} />
                  <Route path="/admin/promo-codes" element={<AdminPromoCodes />} />
                  <Route path="/admin/payments" element={<AdminPayments />} />
                  <Route path="/admin/subjects" element={<AdminSubjects />} />
                  <Route path="/admin/deletion-logs" element={<AdminDeletionLogs />} />
                  <Route path="/admin/profile" element={<AdminProfile />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <MobileBottomNav />
              <Suspense fallback={null}>
                {!isNative && <ChatWidget />}
                <InstallAppPrompt />
              </Suspense>
            </OfflineExamSyncProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
