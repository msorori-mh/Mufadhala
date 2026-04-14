import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bug, Copy, ChevronDown, ChevronUp, Wifi, WifiOff } from "lucide-react";
import { isNativePlatform } from "@/lib/capacitor";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { toast } from "sonner";

export default function DebugPanel() {
  const [expanded, setExpanded] = useState(false);
  const { user } = useAuth();
  const isOffline = useOfflineStatus();
  const isNative = isNativePlatform();

  const info = {
    "المنصة": isNative ? "تطبيق أصلي (Capacitor)" : "متصفح ويب",
    "الحالة": isOffline ? "غير متصل" : "متصل",
    "معرف المستخدم": user?.id?.slice(0, 12) + "..." || "غير مسجل",
    "البريد/الهاتف": user?.phone || user?.email || "—",
    "عرض الشاشة": `${window.innerWidth}×${window.innerHeight}`,
    "DPR": window.devicePixelRatio,
    "User-Agent": navigator.userAgent.slice(0, 80) + "...",
    "الوقت المحلي": new Date().toLocaleString("ar-SA"),
    "المنطقة الزمنية": Intl.DateTimeFormat().resolvedOptions().timeZone,
    "اللغة": navigator.language,
    "Service Worker": "serviceWorker" in navigator ? "مدعوم" : "غير مدعوم",
    "الذاكرة": (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : "غير متاح",
  };

  const copyAll = () => {
    const text = Object.entries(info).map(([k, v]) => `${k}: ${v}`).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("تم نسخ معلومات التصحيح");
  };

  if (!expanded) {
    return (
      <Card className="border-dashed border-amber-500/50">
        <button
          onClick={() => setExpanded(true)}
          className="w-full p-3 flex items-center justify-between text-sm text-muted-foreground"
        >
          <span className="flex items-center gap-2">
            <Bug className="w-4 h-4 text-amber-500" />
            لوحة التصحيح (Debug)
          </span>
          <ChevronDown className="w-4 h-4" />
        </button>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bug className="w-4 h-4 text-amber-500" />
            لوحة التصحيح
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyAll}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(false)}>
              <ChevronUp className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2 mt-1">
          <Badge variant={isOffline ? "destructive" : "default"} className="text-xs">
            {isOffline ? <WifiOff className="w-3 h-3 ml-1" /> : <Wifi className="w-3 h-3 ml-1" />}
            {isOffline ? "غير متصل" : "متصل"}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {isNative ? "Native" : "Web"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 text-xs">
        <Separator />
        {Object.entries(info).map(([key, value]) => (
          <div key={key} className="flex justify-between gap-2">
            <span className="text-muted-foreground shrink-0">{key}</span>
            <span className="text-foreground text-left truncate font-mono" dir="ltr">{value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
