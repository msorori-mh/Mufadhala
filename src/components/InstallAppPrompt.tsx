import { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const isMobile = useIsMobile();

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isInStandalone = window.matchMedia("(display-mode: standalone)").matches
    || (navigator as any).standalone === true;

  useEffect(() => {
    if (isInStandalone) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isInStandalone]);

  if (isInStandalone || dismissed || !isMobile) return null;
  if (!deferredPrompt && !isIOS) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setDismissed(true);
      setDeferredPrompt(null);
    }
  };

  return (
    <>
      {/* Android / Chrome install banner */}
      {deferredPrompt && (
        <div className="fixed bottom-16 inset-x-4 z-[60] bg-primary text-primary-foreground rounded-xl p-4 shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <Download className="w-8 h-8 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">ثبّت تطبيق قَبُول</p>
            <p className="text-xs opacity-90">للوصول السريع من شاشتك الرئيسية</p>
          </div>
          <Button size="sm" variant="secondary" onClick={handleInstall}>
            تثبيت
          </Button>
          <button onClick={() => setDismissed(true)} className="p-1 opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* iOS guide */}
      {isIOS && !deferredPrompt && (
        <div className="fixed bottom-16 inset-x-4 z-[60] bg-primary text-primary-foreground rounded-xl p-4 shadow-lg animate-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3">
            <Share className="w-6 h-6 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-sm mb-1">أضف قَبُول لشاشتك الرئيسية</p>
              <p className="text-xs opacity-90 leading-relaxed">
                اضغط على زر المشاركة
                <Share className="w-3 h-3 inline mx-1" />
                ثم اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong>
              </p>
            </div>
            <button onClick={() => setDismissed(true)} className="p-1 opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
