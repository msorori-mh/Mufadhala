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
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUniversities from "./pages/admin/AdminUniversities";
import AdminColleges from "./pages/admin/AdminColleges";
import AdminMajors from "./pages/admin/AdminMajors";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminReports from "./pages/admin/AdminReports";
import AdminContent from "./pages/admin/AdminContent";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<StudentProfile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/lessons" element={<LessonsList />} />
          <Route path="/lessons/:id" element={<LessonDetail />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/universities" element={<AdminUniversities />} />
          <Route path="/admin/colleges" element={<AdminColleges />} />
          <Route path="/admin/majors" element={<AdminMajors />} />
          <Route path="/admin/students" element={<AdminStudents />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/content" element={<AdminContent />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
