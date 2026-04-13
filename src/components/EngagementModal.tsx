import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, BookOpen, TrendingUp, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { trackFunnelEvent } from "@/lib/funnelTracking";

interface EngagementModalProps {
  completedLessons: number;
  examAttempts: number;
  hasSubscription: boolean;
}

const EngagementModal = ({ completedLessons, examAttempts, hasSubscription }: EngagementModalProps) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (hasSubscription) return;

    const key = "engagement_modal_shown";
    const alreadyShown = sessionStorage.getItem(key);
    if (alreadyShown) return;

    // Trigger after 2+ lessons OR 1+ exam
    if (completedLessons >= 2 || examAttempts >= 1) {
      const timer = setTimeout(() => {
        setOpen(true);
        sessionStorage.setItem(key, "1");
        trackFunnelEvent("engagement_modal_shown");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [completedLessons, examAttempts, hasSubscription]);

  const handleExam = () => {
    trackFunnelEvent("engagement_modal_clicked", { target: "exam" });
    setOpen(false);
    navigate("/exam");
  };

  const handleSubscribe = () => {
    trackFunnelEvent("engagement_modal_clicked", { target: "subscribe" });
    trackFunnelEvent("subscribe_clicked");
    setOpen(false);
    navigate("/subscription");
  };

  if (hasSubscription) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-xl">جاهز للاختبار الحقيقي؟ 🎯</DialogTitle>
          <DialogDescription className="text-sm mt-2">
            {completedLessons >= 2
              ? `أكملت ${completedLessons} دروس — حان وقت اختبار نفسك!`
              : "لقد بدأت رحلة التحضير — خطوتك التالية هي محاكاة الاختبار"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 my-3">
          {[
            { icon: ClipboardCheck, text: "45 سؤال في 90 دقيقة", sub: "محاكاة واقعية" },
            { icon: TrendingUp, text: "تحليل أداء فوري", sub: "نقاط القوة والضعف" },
            { icon: BookOpen, text: "أسئلة مشابهة للمفاضلة", sub: "من بنك الأسئلة" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{item.text}</p>
                <p className="text-[10px] text-muted-foreground">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Button onClick={handleExam} className="w-full py-5 text-base font-bold gap-2">
            <ClipboardCheck className="w-5 h-5" />
            ابدأ الاختبار
          </Button>
          <Button variant="outline" onClick={handleSubscribe} className="w-full text-sm">
            اشترك للوصول الكامل
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EngagementModal;
