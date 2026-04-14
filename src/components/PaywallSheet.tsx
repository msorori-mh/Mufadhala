import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Lock, Sparkles, BookOpen, ClipboardCheck, TrendingUp, Brain,
  ShieldCheck, Clock, AlertTriangle,
} from "lucide-react";
import { trackFunnelEvent } from "@/lib/funnelTracking";

// ── Frequency control ────────────────────────────────
const PAYWALL_COOLDOWN_KEY = "paywall_last_shown";
const PAYWALL_COUNT_KEY = "paywall_session_count";
const COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes between full paywalls

function canShowPaywall(): boolean {
  try {
    const last = sessionStorage.getItem(PAYWALL_COOLDOWN_KEY);
    if (!last) return true;
    return Date.now() - Number(last) > COOLDOWN_MS;
  } catch {
    return true;
  }
}

function markPaywallShown() {
  try {
    sessionStorage.setItem(PAYWALL_COOLDOWN_KEY, String(Date.now()));
    const count = Number(sessionStorage.getItem(PAYWALL_COUNT_KEY) || "0") + 1;
    sessionStorage.setItem(PAYWALL_COUNT_KEY, String(count));
  } catch {}
}

function getSessionPaywallCount(): number {
  try {
    return Number(sessionStorage.getItem(PAYWALL_COUNT_KEY) || "0");
  } catch {
    return 0;
  }
}

// ── Types ────────────────────────────────────────────
export type PaywallTrigger =
  | "locked_lesson"
  | "locked_question"
  | "free_limit_reached"
  | "engagement"
  | "manual";

interface PaywallSheetProps {
  trigger: PaywallTrigger;
  /** Optional context like lesson title */
  context?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Skip frequency check (e.g. explicit locked content click) */
  bypassCooldown?: boolean;
}

const VALUE_ITEMS = [
  { icon: BookOpen, text: "جميع الدروس والشروحات", sub: "محتوى كامل بدون قيود" },
  { icon: ClipboardCheck, text: "بنك الأسئلة الكامل", sub: "أسئلة مشابهة للمفاضلة" },
  { icon: Brain, text: "محاكاة الاختبار الحقيقي", sub: "45 سؤال في 90 دقيقة" },
  { icon: TrendingUp, text: "تحليل الأداء المتقدم", sub: "اكتشف نقاط ضعفك" },
];

const PaywallSheet = ({ trigger, context, open, onOpenChange, bypassCooldown }: PaywallSheetProps) => {
  const navigate = useNavigate();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (!open) {
      setShouldRender(false);
      return;
    }
    // Frequency control: skip if shown too recently (unless bypassed)
    if (!bypassCooldown && !canShowPaywall()) {
      onOpenChange(false);
      return;
    }
    // Max 3 full paywalls per session
    if (!bypassCooldown && getSessionPaywallCount() >= 3) {
      onOpenChange(false);
      return;
    }
    setShouldRender(true);
    markPaywallShown();
    trackFunnelEvent("paywall_viewed", { source: trigger });
  }, [open, trigger, bypassCooldown, onOpenChange]);

  const handleSubscribe = useCallback(() => {
    trackFunnelEvent("subscribe_clicked", { source: `paywall_${trigger}` });
    onOpenChange(false);
    navigate("/subscription");
  }, [navigate, onOpenChange, trigger]);

  if (!shouldRender) return null;

  const headline = trigger === "free_limit_reached"
    ? "لقد استنفدت الدروس المجانية"
    : trigger === "locked_question"
    ? "الأسئلة الكاملة للمشتركين فقط"
    : "المحتوى الكامل للمشتركين فقط";

  const subtext = trigger === "free_limit_reached"
    ? "أنت بدأت وتعلّمت — لكن باقي المحتوى يحتاج اشتراك"
    : "هذا المحتوى جزء من الاستعداد الكامل للمفاضلة";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto px-5 pb-8" dir="rtl">
        <SheetHeader className="text-center pt-2 pb-0">
          {/* Lock icon */}
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-8 h-8 text-primary" />
          </div>

          <SheetTitle className="text-xl font-bold leading-tight">
            {headline}
          </SheetTitle>

          {context && (
            <p className="text-sm text-muted-foreground mt-1 font-medium">
              "{context}"
            </p>
          )}
        </SheetHeader>

        {/* Urgency banner */}
        <div className="mt-4 bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">
              كل يوم بدون تحضير = فرصة أقل للقبول
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              المفاضلة قريبة — لا تترك المنافسين يسبقوك
            </p>
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-sm text-muted-foreground text-center mt-4">
          {subtext}
        </p>

        {/* Value items */}
        <div className="mt-4 space-y-2.5">
          {VALUE_ITEMS.map((item) => (
            <div key={item.text} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.text}</p>
                <p className="text-[11px] text-muted-foreground">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Button
          onClick={handleSubscribe}
          className="w-full mt-5 py-6 text-base font-bold gap-2 shadow-lg"
          size="lg"
        >
          <Sparkles className="w-5 h-5" />
          اشترك الآن — وصول كامل
        </Button>

        {/* Trust line */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">
            دفعة واحدة فقط • رفع الإيصال بخطوة واحدة • تحقق تلقائي
          </p>
        </div>

        {/* Dismiss */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenChange(false)}
          className="w-full mt-2 text-muted-foreground"
        >
          لاحقاً
        </Button>
      </SheetContent>
    </Sheet>
  );
};

export default PaywallSheet;

// ── Hook for easy paywall usage ─────────────────────
export function usePaywall() {
  const [state, setState] = useState<{
    open: boolean;
    trigger: PaywallTrigger;
    context?: string;
    bypass?: boolean;
  }>({ open: false, trigger: "manual" });

  const showPaywall = useCallback(
    (trigger: PaywallTrigger, context?: string, bypass?: boolean) => {
      setState({ open: true, trigger, context, bypass });
    },
    [],
  );

  const setOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  return {
    paywallProps: {
      open: state.open,
      onOpenChange: setOpen,
      trigger: state.trigger,
      context: state.context,
      bypassCooldown: state.bypass,
    },
    showPaywall,
  };
}
