import { useState, useCallback } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { getMotivationalMessage } from "@/data/motivationalMessages";

interface MotivationalBannerProps {
  collegeName: string | null;
  avgScore: number;
}

const MotivationalBanner = ({ collegeName, avgScore }: MotivationalBannerProps) => {
  const [message, setMessage] = useState(() => getMotivationalMessage(collegeName, avgScore));

  const refresh = useCallback(() => {
    setMessage(getMotivationalMessage(collegeName, avgScore));
  }, [collegeName, avgScore]);

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-l from-primary/10 via-accent/10 to-primary/5 border border-primary/20 p-3 sm:p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <p className="text-sm sm:text-base font-medium text-foreground leading-relaxed flex-1">
          {message}
        </p>
        <button
          onClick={refresh}
          className="w-8 h-8 rounded-full hover:bg-primary/10 flex items-center justify-center transition-colors shrink-0"
          aria-label="رسالة جديدة"
        >
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

export default MotivationalBanner;
