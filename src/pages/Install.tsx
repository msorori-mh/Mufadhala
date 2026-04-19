import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Smartphone, Share2, Plus, MoreVertical, ArrowLeft, FileText, Loader2, Send, AlertTriangle, Chrome } from "lucide-react";
import { generateBrochurePDF, generateBrochurePDFA5 } from "@/lib/generateBrochurePDF";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { detectAndroidBrowser, buildChromeIntentUrl } from "@/lib/browserDetect";
import { INSTALL_COPY } from "@/constants/installCopy";

/**
 * Install page — Public landing for QR brochure scans.
 * Strategy: QR points here. Page guides users to add the web app to home screen
 * on Android/iOS. Also offers a downloadable QR PNG and a print-ready A4 brochure PDF.
 */
export default function Install() {
  // Always link QR to the canonical public URL (so brochure works regardless of origin)
  const canonicalUrl = "https://mufadhala.com/install";
  const qrRef = useRef<HTMLDivElement>(null);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [shareCount, setShareCount] = useState<number | null>(null);
  // Android browser support: only Chrome can perform a true PWA install.
  const androidSupport = detectAndroidBrowser();
  const isAndroidNonChrome = androidSupport === "android-other";
  const openInChrome = () => {
    window.location.href = buildChromeIntentUrl(canonicalUrl);
  };

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform("ios");
    else if (/android/.test(ua)) setPlatform("android");

    document.title = "ثبّت تطبيق مُفَاضَلَة — امسح وابدأ";

    // Fetch lifetime share count for social proof
    (async () => {
      try {
        const { count } = await supabase
          .from("conversion_events")
          .select("id", { count: "exact", head: true })
          .eq("source", "install_share")
          .eq("event_type", "click");
        if (typeof count === "number") setShareCount(count);
      } catch {
        // silent — counter is optional UX
      }
    })();
  }, []);

  /** Fire-and-forget: log a share click + optimistically bump the counter. */
  const trackShare = async (channel: "whatsapp" | "telegram" | "native") => {
    setShareCount((prev) => (typeof prev === "number" ? prev + 1 : prev));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("conversion_events").insert({
        user_id: user?.id ?? null,
        source: "install_share",
        event_type: "click",
        metadata: { channel } as never,
      });
    } catch {
      // silent — never block sharing
    }
  };

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "mufadhala-qr.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadBrochure = async (size: "A4" | "A5" = "A4") => {
    const canvas = qrRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    setGeneratingPDF(true);
    try {
      if (size === "A5") {
        await generateBrochurePDFA5();
      } else {
        await generateBrochurePDF(canvas);
      }
      toast.success(`تم تنزيل البروشور (${size}) بنجاح`);
      // Track brochure download as a conversion event (fire-and-forget)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("conversion_events").insert({
          user_id: user?.id ?? null,
          source: "brochure_download",
          event_type: "click",
          metadata: { format: size === "A5" ? "pdf_a5" : "pdf_a4" } as never,
        });
      } catch {
        // silent — analytics never blocks UX
      }
    } catch (err) {
      console.error(err);
      toast.error("تعذر إنشاء البروشور، حاول مرة أخرى");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const shareMessage = `📚 منصة مُفَاضَلَة | Mufadhala\nمنصتك الذكية للتحضير لاختبارات القبول الجامعي في اليمن\n\nثبّت التطبيق وابدأ التحضير الآن:\n${canonicalUrl}`;

  const shareNative = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "مُفَاضَلَة | Mufadhala",
          text: shareMessage,
          url: canonicalUrl,
        });
        void trackShare("native");
      } else {
        await navigator.clipboard.writeText(shareMessage);
        toast.success("تم نسخ الرابط، الصقه في أي تطبيق");
        void trackShare("native");
      }
    } catch (err) {
      // user cancelled or error — silent
    }
  };

  const shareWhatsApp = () => {
    void trackShare("whatsapp");
    const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const shareTelegram = () => {
    void trackShare("telegram");
    const url = `https://t.me/share/url?url=${encodeURIComponent(canonicalUrl)}&text=${encodeURIComponent(shareMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background pt-safe">
      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 1) PLATFORM FEATURES — first thing the student reads */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <h3 className="text-sm font-bold text-foreground mb-3">✨ ما الذي يميّز مُفَاضَلَة؟</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { emoji: "🤖", label: "مساعد مفاضلة الذكي", sub: "يجيب عن أي سؤال فوراً" },
                { emoji: "✨", label: "مولد الأسئلة الذكي", sub: "أسئلة مخصصة لنقاط ضعفك" },
                { emoji: "📝", label: "نماذج اختبارات سابقة", sub: "مع إجابات نموذجية" },
                { emoji: "⏱️", label: "محاكاة واقعية", sub: "لبيئة الاختبار الفعلية" },
                { emoji: "📚", label: "5000+ سؤال تدريبي", sub: "مراجع ومعتمد" },
                { emoji: "🧠", label: "شرح علمي مفصّل", sub: "لكل إجابة" },
                { emoji: "📶", label: "يعمل أوفلاين", sub: "بدون إنترنت" },
              ].map((f, i) => {
                const isSmart = i < 4;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-2 rounded-lg p-2 transition-all duration-200 ${
                      isSmart
                        ? "bg-accent/10 border border-accent/30 hover:bg-accent/15 hover:border-accent/50 hover:scale-[1.02] hover:shadow-sm"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <span className="text-lg">{f.emoji}</span>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold ${isSmart ? "text-accent" : "text-foreground"}`}>{f.label}</p>
                      <p className="text-[10px] text-muted-foreground">{f.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 2) QR SECTION */}
        <Card className="border-primary/20 shadow-xl">
          <CardContent className="p-6 sm:p-8 flex flex-col items-center gap-4">
            <div
              ref={qrRef}
              className="bg-white p-4 rounded-2xl shadow-md ring-1 ring-border"
            >
              <QRCodeCanvas
                value={canonicalUrl}
                size={240}
                level="H"
                includeMargin={false}
                bgColor="#FFFFFF"
                fgColor="#1A237E"
              />
            </div>
            <p className="text-base font-medium text-foreground text-center">
              امسح الكود لفتح المنصة مباشرة
            </p>
            <Button onClick={downloadQR} variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <Download className="w-4 h-4" />
              تنزيل QR (PNG)
            </Button>
          </CardContent>
        </Card>

        {/* 2) INSTALL ACTION — directly below QR */}
        <div className="space-y-2">
          {isAndroidNonChrome ? (
            // Unsupported Android browser (Samsung Internet, Firefox, etc.) — block install path.
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-sm text-foreground mb-1">
                    افتح التطبيق في Google Chrome
                  </p>
                  <p className="text-xs text-foreground/80 leading-relaxed">
                    {INSTALL_COPY.android.full}
                  </p>
                </div>
              </div>
              <Button onClick={openInChrome} size="lg" className="w-full h-12 gap-2">
                <Chrome className="w-5 h-5" />
                افتح في Chrome
              </Button>
            </div>
          ) : (
            <Button asChild size="lg" className="w-full h-14 text-base font-bold gap-2 shadow-lg">
              <a href="/">
                <ArrowLeft className="w-5 h-5" />
                افتح المنصة وثبّت التطبيق
              </a>
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => downloadBrochure("A4")}
              variant="outline"
              className="w-full gap-2"
              disabled={generatingPDF}
            >
              {generatingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              بروشور A4
            </Button>
            <Button
              onClick={() => downloadBrochure("A5")}
              variant="outline"
              className="w-full gap-2"
              disabled={generatingPDF}
            >
              {generatingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              ملصق A5
            </Button>
          </div>
        </div>

        {/* 3) INSTALL INSTRUCTIONS — directly below install action */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-center flex items-center justify-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            ثبّت التطبيق على شاشتك الرئيسية
          </h2>

          <div className="grid sm:grid-cols-2 gap-3">
            {/* Android */}
            <Card className={platform === "android" ? "ring-2 ring-primary" : ""}>
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm">Android</h3>
                  <Badge variant={platform === "android" ? "default" : "outline"} className="text-xs">
                    أندرويد
                  </Badge>
                </div>
                <ol className="space-y-2 text-sm text-foreground/90">
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">1</span>
                    <span>افتح الموقع في متصفح Chrome</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">2</span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      اضغط على قائمة الخيارات
                      <MoreVertical className="w-3.5 h-3.5 inline text-muted-foreground" />
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">3</span>
                    <span>اختر <strong>«تثبيت التطبيق»</strong></span>
                  </li>
                </ol>
              </CardContent>
            </Card>

            {/* iOS */}
            <Card className={platform === "ios" ? "ring-2 ring-primary" : ""}>
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm">iPhone / iPad</h3>
                  <Badge variant={platform === "ios" ? "default" : "outline"} className="text-xs">
                    آيفون
                  </Badge>
                </div>
                <ol className="space-y-2 text-sm text-foreground/90">
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">1</span>
                    <span>افتح الموقع في متصفح Safari</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">2</span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      اضغط على زر المشاركة
                      <Share2 className="w-3.5 h-3.5 inline text-muted-foreground" />
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">3</span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      اختر <strong>«إضافة إلى الشاشة الرئيسية»</strong>
                      <Plus className="w-3.5 h-3.5 inline text-muted-foreground" />
                    </span>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 4) PLATFORM FEATURES — short, grouped */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground">📚 التدريب</h3>
              <ul className="space-y-1 text-sm text-foreground/85 pr-1">
                <li>• نماذج الأعوام السابقة</li>
                <li>• محاكاة اختبار حقيقي</li>
                <li>• أسئلة متكررة</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground">🤖 الذكاء الاصطناعي</h3>
              <ul className="space-y-1 text-sm text-foreground/85 pr-1">
                <li>• مولد أسئلة</li>
                <li>• مفاضل</li>
                <li>• تحليل أداء</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 5) SHARE SECTION — last */}
        <section className="space-y-3">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-center">شارك مع أصدقائك</h2>
            {typeof shareCount === "number" && shareCount > 0 && (
              <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0 h-5">
                <Share2 className="w-3 h-3" />
                {shareCount.toLocaleString("ar-EG")} مرة
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button onClick={shareWhatsApp} variant="outline" size="sm" className="gap-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border-[#25D366]/30 text-[#128C7E]">
              <Share2 className="w-4 h-4" />
              واتساب
            </Button>
            <Button onClick={shareTelegram} variant="outline" size="sm" className="gap-1.5 bg-[#0088cc]/10 hover:bg-[#0088cc]/20 border-[#0088cc]/30 text-[#0088cc]">
              <Send className="w-4 h-4" />
              تيليجرام
            </Button>
            <Button onClick={shareNative} variant="outline" size="sm" className="gap-1.5">
              <Share2 className="w-4 h-4" />
              مشاركة
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground pt-2 pb-bottom-nav">
          <p>© {new Date().getFullYear()} مُفَاضَلَة</p>
        </footer>
      </div>
    </div>
  );
}
