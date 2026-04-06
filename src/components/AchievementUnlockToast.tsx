import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { X, PartyPopper } from "lucide-react";

interface AchievementUnlockToastProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  onDismiss: () => void;
}

const AchievementUnlockToast = ({
  title,
  description,
  icon: Icon,
  color,
  bgColor,
  onDismiss,
}: AchievementUnlockToastProps) => {
  const [visible, setVisible] = useState(false);
  const [confetti, setConfetti] = useState(true);

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setVisible(true));

    // Auto dismiss after 4s
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 400);
    }, 4000);

    // Stop confetti after 2s
    const confettiTimer = setTimeout(() => setConfetti(false), 2000);

    return () => {
      clearTimeout(timer);
      clearTimeout(confettiTimer);
    };
  }, [onDismiss]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 400);
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-start justify-center">
      {/* Confetti particles */}
      {confetti && (
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `-5%`,
                backgroundColor: [
                  "hsl(var(--primary))",
                  "hsl(var(--accent))",
                  "#fbbf24",
                  "#f472b6",
                  "#34d399",
                  "#60a5fa",
                ][i % 6],
                animation: `confetti-fall ${1.5 + Math.random() * 1.5}s ease-in forwards`,
                animationDelay: `${Math.random() * 0.8}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Toast card */}
      <div
        className={`pointer-events-auto mt-16 mx-4 max-w-sm w-full transition-all duration-400 ${
          visible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 -translate-y-4 scale-95"
        }`}
      >
        <div className="bg-card border-2 border-primary/30 rounded-2xl shadow-2xl p-4 relative overflow-hidden">
          {/* Glow background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />

          <div className="relative flex items-center gap-3">
            {/* Icon */}
            <div
              className={`w-14 h-14 rounded-xl ${bgColor} flex items-center justify-center shrink-0 animate-scale-in`}
            >
              <Icon className={`w-7 h-7 ${color}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <PartyPopper className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-primary">إنجاز جديد!</span>
              </div>
              <p className="font-bold text-foreground text-sm">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>

            {/* Close */}
            <button
              onClick={handleDismiss}
              className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center shrink-0 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AchievementUnlockToast;
