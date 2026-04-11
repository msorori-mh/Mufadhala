import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { isNativePlatform } from "@/lib/capacitor";
import { useOfflineExamSync } from "./hooks/useOfflineExamSync";
import { useEffect } from "react";
import { initializeCapacitor } from "./lib/capacitor";

// Eager imports — critical path
import Index from "./pages/Index";
import Login from "./pages/Login";

// Lazy imports — all other pages
const Register = lazy(() => import("./pages/Register"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminResetPassword = lazy(() => import("./pages/AdminResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const StudentProfile = lazy(() => import("./pages/StudentProfile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const LessonsList = lazy(() => import("./pages/LessonsList"));
const LessonDetail = lazy(() => import("./pages/LessonDetail"));
const ExamSimulator = lazy(() => import("./pages/ExamSimulator"));
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
const Settings = lazy(() => import("./pages/Settings"));
const DeleteAccount = lazy(() => import("./pages/DeleteAccount"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Lazy load non-critical components
const MobileBottomNav = lazy(() => import("./components/MobileBottomNav"));
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
    <div className="min-h-screen bg-background p-4 space-y-4">
      <Skeleton className="h-12 w-3/4" />
      <Skeleton className="h-8 w-1/2" />
      <div className="space-y-3 mt-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
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
                  <Route path="/complete-profile" element={<CompleteProfile />} />
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
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <Suspense fallback={null}>
                <MobileBottomNav />
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
