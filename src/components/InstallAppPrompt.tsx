import { useState, useEffect } from "react";
import { Download, X, Share, AlertTriangle, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { isNativePlatform } from "@/lib/capacitor";
import { detectAndroidBrowser, buildChromeIntentUrl } from "@/lib/browserDetect";
import { INSTALL_COPY } from "@/constants/installCopy";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const isMobile = useIsMobile();

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const androidSupport = detectAndroidBrowser();
  const isAndroidUnsupported = androidSupport === "android-other";
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

  if (isInStandalone || dismissed || !isMobile || isNativePlatform()) return null;
  // Show: (a) Chrome's native install prompt event, (b) iOS guide, (c) Android non-Chrome warning
  if (!deferredPrompt && !isIOS && !isAndroidUnsupported) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setDismissed(true);
      setDeferredPrompt(null);
    }
  };

  const openInChrome = () => {
    window.location.href = buildChromeIntentUrl();
  };

  return (
    <>
      {/* Android / Chrome install banner — only fires on real Chrome via beforeinstallprompt */}
      {deferredPrompt && (
        <div className="fixed bottom-16 inset-x-4 z-[60] bg-primary text-primary-foreground rounded-xl p-4 shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <Download className="w-8 h-8 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">ثبّت تطبيق مُفَاضَلَة</p>
            <p className="text-xs opacity-90">للوصول السريع من شاشتك الرئيسية</p>
          </div>
          <Button size="sm" variant="secondary" onClick={handleInstall}>
            تثبيت
          </Button>
          <button onClick={() => setDismissed(true)} className="p-1 opacity-70 hover:opacity-100" aria-label="إغلاق">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Android non-Chrome browser warning (Samsung Internet, Firefox, etc.) */}
      {!deferredPrompt && isAndroidUnsupported && (
        <div className="fixed bottom-16 inset-x-4 z-[60] bg-destructive text-destructive-foreground rounded-xl p-4 shadow-lg animate-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm mb-1">افتح التطبيق في Google Chrome</p>
              <p className="text-xs opacity-95 leading-relaxed mb-2">
                {INSTALL_COPY.android.short}
              </p>
              <Button size="sm" variant="secondary" onClick={openInChrome} className="gap-1.5 h-8">
                <Chrome className="w-3.5 h-3.5" />
                افتح في Chrome
              </Button>
            </div>
            <button onClick={() => setDismissed(true)} className="p-1 opacity-80 hover:opacity-100" aria-label="إغلاق">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* iOS guide */}
      {isIOS && !deferredPrompt && (
        <div className="fixed bottom-16 inset-x-4 z-[60] bg-primary text-primary-foreground rounded-xl p-4 shadow-lg animate-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3">
            <Share className="w-6 h-6 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-sm mb-1">أضف مُفَاضَلَة لشاشتك الرئيسية</p>
              <p className="text-xs opacity-90 leading-relaxed">
                {INSTALL_COPY.ios.short}
              </p>
            </div>
            <button onClick={() => setDismissed(true)} className="p-1 opacity-70 hover:opacity-100" aria-label="إغلاق">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
