import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { fetchLessonsBySubjects } from "@/lib/contentFilter";
import { Rocket, Users, AlertTriangle } from "lucide-react";
import logoImg from "@/assets/logo.png";


const Welcome = () => {
  const navigate = useNavigate();
  const { user, student, loading, subjectIds, canAccessContent } = useStudentAccess();
  const [firstLessonId, setFirstLessonId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);

  const studentName = student?.first_name || "";
  const [collegeName, setCollegeName] = useState("");

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
    }
  }, [loading, user, navigate]);

  // Check if student already started — skip welcome
  useEffect(() => {
    if (!student?.id) return;
    const welcomed = localStorage.getItem(`welcomed_${student.id}`);
    if (welcomed) {
      navigate("/dashboard", { replace: true });
      return;
    }
    // Check if they have any lesson progress
    supabase
      .from("lesson_progress")
      .select("id", { count: "exact", head: true })
      .eq("student_id", student.id)
      .then(({ count }) => {
        if (count && count > 0) {
          localStorage.setItem(`welcomed_${student.id}`, "true");
          navigate("/dashboard", { replace: true });
        }
      });
  }, [student?.id, navigate]);

  // Fetch college name
  useEffect(() => {
    if (!student?.college_id) return;
    supabase
      .from("colleges")
      .select("name_ar")
      .eq("id", student.college_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.name_ar) setCollegeName(data.name_ar);
      });
  }, [student?.college_id]);

  // Resolve first lesson
  useEffect(() => {
    if (subjectIds.length === 0) {
      setResolving(false);
      return;
    }
    fetchLessonsBySubjects(supabase, subjectIds).then((lessons) => {
      if (lessons.length > 0) {
        const sorted = [...lessons].sort((a, b) => a.display_order - b.display_order);
        setFirstLessonId(sorted[0].id);
      }
      setResolving(false);
    });
  }, [subjectIds]);

  const handleStart = () => {
    if (student?.id) {
      localStorage.setItem(`welcomed_${student.id}`, "true");
    }
    if (firstLessonId) {
      navigate(`/lessons/${firstLessonId}`);
    } else {
      navigate("/lessons");
    }
  };

  const handleSkip = () => {
    if (student?.id) {
      localStorage.setItem(`welcomed_${student.id}`, "true");
    }
    navigate("/dashboard", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Hero section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        {/* Logo */}
        <div className="w-20 h-20 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center mb-6 animate-scale-in">
          <img src={logoImg} alt="مُفَاضَلَة" className="w-full h-full object-cover" />
        </div>

        {/* Urgency message */}
        <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-full mb-4">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-bold">
            موسم المفاضلات اقترب — لا تضيّع وقتك
          </span>
        </div>

        {/* Personalized heading */}
        <h1 className="text-2xl font-bold text-foreground text-center mb-2">
          {studentName
            ? `${studentName}، استعدادك يبدأ الآن`
            : "استعدادك يبدأ الآن"}
        </h1>

        {collegeName && (
          <p className="text-base text-primary font-semibold text-center mb-1">
            {collegeName} تنتظرك
          </p>
        )}

        {/* Social proof */}
        <div className="flex items-center gap-2 text-muted-foreground mt-3 mb-6">
          <Users className="w-4 h-4" />
          <span className="text-sm">بدأ طلاب كثيرون التحضير لنفس مسارك</span>
        </div>

        {/* CTA */}
        <Button
          onClick={handleStart}
          disabled={resolving}
          size="lg"
          className="w-full max-w-xs py-6 text-lg font-bold gap-3 shadow-lg"
        >
          <Rocket className="w-5 h-5" />
          ابدأ أول درس الآن
        </Button>

        {/* Urgency microcopy */}
        <div className="flex items-center gap-1.5 mt-4 text-destructive/80">
          <AlertTriangle className="w-3.5 h-3.5" />
          <p className="text-xs font-medium">
            كل يوم تأخير = فرصة أقل للقبول
          </p>
        </div>

        {/* Skip */}
        <button
          onClick={handleSkip}
          className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          تصفح لوحة التحكم
        </button>
      </div>
    </div>
  );
};

export default Welcome;
