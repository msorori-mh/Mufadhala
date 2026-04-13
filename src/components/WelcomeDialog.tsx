import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, ClipboardCheck, Trophy, Building2, Sparkles, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const features = [
  {
    icon: BookOpen,
    title: "دروس تفاعلية",
    description: "محتوى تعليمي شامل يغطي جميع التخصصات",
  },
  {
    icon: ClipboardCheck,
    title: "اختبارات محاكاة",
    description: "تدرّب على اختبارات مشابهة للمفاضلة الحقيقية",
  },
  {
    icon: Trophy,
    title: "إنجازات ولوحة متصدرين",
    description: "تابع تقدمك ونافس زملاءك",
  },
  {
    icon: Building2,
    title: "دليل الكليات",
    description: "تعرّف على الكليات والتخصصات المتاحة",
  },
];

interface WelcomeDialogProps {
  userId: string;
}

const WelcomeDialog = ({ userId }: WelcomeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const key = `welcome_seen_${userId}`;
    if (!localStorage.getItem(key)) {
      setOpen(true);
      // Fetch student name and college
      supabase
        .from("students")
        .select("first_name, college_id")
        .eq("user_id", userId)
        .maybeSingle()
        .then(async ({ data }) => {
          if (data?.first_name) setStudentName(data.first_name);
          if (data?.college_id) {
            const { data: college } = await supabase
              .from("colleges")
              .select("name_ar")
              .eq("id", data.college_id)
              .maybeSingle();
            if (college?.name_ar) setCollegeName(college.name_ar);
          }
        });
    }
  }, [userId]);

  const handleClose = () => {
    localStorage.setItem(`welcome_seen_${userId}`, "true");
    setOpen(false);
  };

  const handleStartLearning = () => {
    handleClose();
    navigate("/lessons");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-xl">
            {studentName ? `مرحباً ${studentName}! 🎉` : "أهلاً بك في مُفَاضَلَة! 🎉"}
          </DialogTitle>
          <DialogDescription className="text-base">
            {collegeName
              ? `تم تجهيز محتوى خاص بك حسب كلية ${collegeName}`
              : "منصتك الذكية للتحضير لاختبارات المفاضلة الجامعية"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 my-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">{feature.title}</p>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Button onClick={handleStartLearning} className="w-full py-5 text-base font-bold gap-2">
            <Rocket className="w-5 h-5" />
            ابدأ التعلم الآن
          </Button>
          <Button variant="ghost" onClick={handleClose} className="w-full text-sm text-muted-foreground">
            تخطي
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeDialog;
