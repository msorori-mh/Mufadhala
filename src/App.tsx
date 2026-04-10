import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import CompleteProfile from "./pages/CompleteProfile";
import AdminLogin from "./pages/AdminLogin";
import AdminResetPassword from "./pages/AdminResetPassword";
import Dashboard from "./pages/Dashboard";
import StudentProfile from "./pages/StudentProfile";
import Notifications from "./pages/Notifications";
import LessonsList from "./pages/LessonsList";
import LessonDetail from "./pages/LessonDetail";
import ExamSimulator from "./pages/ExamSimulator";
import ExamHistory from "./pages/ExamHistory";
import StudentPerformance from "./pages/StudentPerformance";
import Subscription from "./pages/Subscription";
import SearchContent from "./pages/SearchContent";
import Leaderboard from "./pages/Leaderboard";
import Achievements from "./pages/Achievements";
import CollegeGuide from "./pages/CollegeGuide";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUniversities from "./pages/admin/AdminUniversities";
import AdminColleges from "./pages/admin/AdminColleges";
import AdminMajors from "./pages/admin/AdminMajors";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminReports from "./pages/admin/AdminReports";
import AdminReportsStudents from "./pages/admin/AdminReportsStudents";
import AdminReportsPayments from "./pages/admin/AdminReportsPayments";
import AdminReportsSubscriptions from "./pages/admin/AdminReportsSubscriptions";
import AdminReportsExams from "./pages/admin/AdminReportsExams";
import AdminReportsComparison from "./pages/admin/AdminReportsComparison";
import AdminContent from "./pages/admin/AdminContent";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSubscriptionPlans from "./pages/admin/AdminSubscriptionPlans";
import AdminPaymentMethods from "./pages/admin/AdminPaymentMethods";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminPromoCodes from "./pages/admin/AdminPromoCodes";
import AdminSubjects from "./pages/admin/AdminSubjects";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import MobileBottomNav from "./components/MobileBottomNav";
import ChatWidget from "./components/ChatWidget";
import InstallAppPrompt from "./components/InstallAppPrompt";
import { useOfflineExamSync } from "./hooks/useOfflineExamSync";

const queryClient = new QueryClient();

function OfflineExamSyncProvider({ children }: { children: React.ReactNode }) {
  useOfflineExamSync();
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <OfflineExamSyncProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/complete-profile" element={<CompleteProfile />} />
                <Route path="/admin-login" element={<AdminLogin />} />
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
              <MobileBottomNav />
              <ChatWidget />
              <InstallAppPrompt />
            </OfflineExamSyncProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
