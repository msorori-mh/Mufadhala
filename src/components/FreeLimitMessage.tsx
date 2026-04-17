import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { trackSubscriptionClick, type ConversionSource } from "@/lib/conversionTracking";
import { isPaymentUIEnabled } from "@/lib/platformGate";

interface FreeLimitMessageProps {
  className?: string;
  source?: ConversionSource;
}

const FreeLimitMessage = ({ className = "", source }: FreeLimitMessageProps) => {
  const navigate = useNavigate();
  const paymentsVisible = isPaymentUIEnabled();

  const handleClick = () => {
    if (source) trackSubscriptionClick(source);
    navigate("/subscription");
  };

  return (
    <div className={`min-h-screen bg-background flex items-center justify-center ${className}`} dir="rtl">
      <div className="text-center px-6 space-y-5 max-w-xs">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Lock className="w-10 h-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">
            {paymentsVisible ? "وصلت للحد المجاني" : "هذه الميزة غير متاحة في هذه النسخة"}
          </h2>
          {paymentsVisible && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              لو تريد ترفع مستواك أكثر — اشترك الآن
            </p>
          )}
        </div>
        {paymentsVisible ? (
          <Button size="lg" className="w-full text-base font-bold" onClick={handleClick}>
            اشترك الآن
          </Button>
        ) : (
          <Button size="lg" variant="outline" className="w-full text-base" onClick={() => navigate("/dashboard")}>
            رجوع للرئيسية
          </Button>
        )}
      </div>
    </div>
  );
};

export default FreeLimitMessage;

