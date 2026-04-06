import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
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
import NotFound from "./pages/NotFound";
import MobileBottomNav from "./components/MobileBottomNav";
import ChatWidget from "./components/ChatWidget";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
          <Route path="/admin/payments" element={<AdminPayments />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <MobileBottomNav />
        <ChatWidget />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
