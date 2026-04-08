import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, ClipboardCheck, Trophy, Building2, Sparkles } from "lucide-react";

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

  useEffect(() => {
    const key = `welcome_seen_${userId}`;
    if (!localStorage.getItem(key)) {
      setOpen(true);
    }
  }, [userId]);

  const handleClose = () => {
    localStorage.setItem(`welcome_seen_${userId}`, "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-xl">أهلاً بك في مُفَاضَلَة! 🎉</DialogTitle>
          <DialogDescription className="text-base">
            منصتك الذكية للتحضير لاختبارات المفاضلة الجامعية
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

        <Button onClick={handleClose} className="w-full py-5 text-base font-bold">
          ابدأ الآن
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeDialog;
