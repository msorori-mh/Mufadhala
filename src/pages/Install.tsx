import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, GraduationCap, Smartphone, Share2, Plus, MoreVertical, ArrowLeft, Globe, FileText, Loader2 } from "lucide-react";
import { generateBrochurePDF } from "@/lib/generateBrochurePDF";
import { toast } from "sonner";

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

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform("ios");
    else if (/android/.test(ua)) setPlatform("android");

    document.title = "ثبّت تطبيق مُفَاضَلَة — امسح وابدأ";
  }, []);

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

  const downloadBrochure = async () => {
    const canvas = qrRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    setGeneratingPDF(true);
    try {
      await generateBrochurePDF(canvas);
      toast.success("تم تنزيل البروشور بنجاح");
    } catch (err) {
      console.error(err);
      toast.error("تعذر إنشاء البروشور، حاول مرة أخرى");
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background pt-safe">
      <div className="container max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <header className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-lg">
            <GraduationCap className="w-9 h-9 text-primary-foreground" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">
            مُفَاضَلَة | Mufadhala
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
            منصتك الذكية للتحضير لاختبارات القبول الجامعي في اليمن
          </p>
          <Badge variant="secondary" className="text-sm">امسح • ثبّت • ابدأ التحضير</Badge>
        </header>

        {/* QR Card */}
        <Card className="border-primary/20 shadow-xl">
          <CardContent className="p-6 sm:p-8 flex flex-col items-center gap-5">
            <div
              ref={qrRef}
              className="bg-white p-4 rounded-2xl shadow-md ring-1 ring-border"
            >
              <QRCodeCanvas
                value={canonicalUrl}
                size={220}
                level="H"
                includeMargin={false}
                bgColor="#FFFFFF"
                fgColor="#1A237E"
              />
            </div>

            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span dir="ltr">mufadhala.com/install</span>
              </p>
              <p className="text-xs text-muted-foreground">
                وجّه كاميرا جوالك نحو الرمز لفتح التطبيق فوراً
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-center w-full">
              <Button onClick={downloadBrochure} variant="default" className="gap-2" disabled={generatingPDF}>
                {generatingPDF ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                {generatingPDF ? "جاري الإنشاء..." : "تنزيل بروشور PDF (A4)"}
              </Button>
              <Button onClick={downloadQR} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                تنزيل QR (PNG)
              </Button>
              <Button asChild variant="ghost" className="gap-2">
                <Link to="/">
                  <ArrowLeft className="w-4 h-4" />
                  دخول الموقع
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Install Instructions */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-center flex items-center justify-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            ثبّت التطبيق على شاشتك الرئيسية
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Android */}
            <Card className={platform === "android" ? "ring-2 ring-primary" : ""}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base">Android</h3>
                  <Badge variant={platform === "android" ? "default" : "outline"} className="text-xs">
                    أندرويد
                  </Badge>
                </div>
                <ol className="space-y-2.5 text-sm text-foreground/90">
                  <li className="flex gap-2.5">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">1</span>
                    <span>افتح الموقع في متصفح Chrome</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">2</span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      اضغط على قائمة الخيارات
                      <MoreVertical className="w-3.5 h-3.5 inline text-muted-foreground" />
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">3</span>
                    <span>اختر <strong>«تثبيت التطبيق»</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong></span>
                  </li>
                </ol>
              </CardContent>
            </Card>

            {/* iOS */}
            <Card className={platform === "ios" ? "ring-2 ring-primary" : ""}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base">iPhone / iPad</h3>
                  <Badge variant={platform === "ios" ? "default" : "outline"} className="text-xs">
                    آيفون
                  </Badge>
                </div>
                <ol className="space-y-2.5 text-sm text-foreground/90">
                  <li className="flex gap-2.5">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">1</span>
                    <span>افتح الموقع في متصفح Safari</span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">2</span>
                    <span className="flex items-center gap-1.5 flex-wrap">
                      اضغط على زر المشاركة
                      <Share2 className="w-3.5 h-3.5 inline text-muted-foreground" />
                    </span>
                  </li>
                  <li className="flex gap-2.5">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">3</span>
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

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground pt-4 pb-bottom-nav">
          <p>© {new Date().getFullYear()} مُفَاضَلَة • هندسة النجاح في اختبارات القبول</p>
        </footer>
      </div>
    </div>
  );
}
