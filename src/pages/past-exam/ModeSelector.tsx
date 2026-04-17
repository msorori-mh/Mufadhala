import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen, Timer, AlertTriangle, Lock, EyeOff, LogOut, Sparkles, Lightbulb, Smile, Flame, Trophy, GraduationCap, Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { PastExamModelInfo } from "./types";
import { useAuth } from "@/hooks/useAuth";
import { useStudentData } from "@/hooks/useStudentData";
import { useSubscription } from "@/hooks/useSubscription";
import { fetchModelAttemptStats } from "@/lib/pastExamAttempts";
import PastExamModeMiniStats from "@/components/PastExamModeMiniStats";
import PastExamModesComparisonDialog from "@/components/PastExamModesComparisonDialog";

interface Props {
  model: PastExamModelInfo;
  totalQuestions: number;
  isFreeModel?: boolean;
  onSelectTraining: () => void;
  onSelectStrict: () => void;
}

const ModeSelector = ({ model, totalQuestions, isFreeModel, onSelectTraining, onSelectStrict }: Props) => {
  const navigate = useNavigate();
  const hasDuration = (model.duration_minutes ?? 0) > 0;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const { user } = useAuth();
  const { data: student } = useStudentData(user?.id);
  const { isPaid } = useSubscription(user?.id);
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["past-exam-mode-stats", student?.id, model.id],
    queryFn: () => fetchModelAttemptStats(student!.id, model.id),
    enabled: !!student?.id && !!model.id,
    staleTime: 30_000,
  });

  const openStrictConfirm = () => {
    if (!hasDuration) return;
    setAcknowledged(false);
    setConfirmOpen(true);
  };

  const handleConfirmStart = () => {
    setConfirmOpen(false);
    onSelectStrict();
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-30 bg-card border-b border-border">
        <div className="px-4 py-3 max-w-3xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0 -mr-2" onClick={() => navigate("/past-exams")}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <p className="text-sm font-bold truncate flex-1">{model.title}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">اختر وضع المحاولة</h1>
          <p className="text-sm text-muted-foreground">
            {totalQuestions} سؤال{hasDuration ? ` · مدة الاختبار ${model.duration_minutes} دقيقة` : ""}
          </p>
        </div>

        {/* Quick Comparison Strip */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl bg-secondary/10 border border-secondary/30 p-3">
            <Smile className="w-5 h-5 text-secondary mx-auto mb-1" />
            <p className="text-xs font-bold text-foreground">للمبتدئين</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">تعلّم بدون ضغط</p>
          </div>
          <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3">
            <Flame className="w-5 h-5 text-destructive mx-auto mb-1" />
            <p className="text-xs font-bold text-foreground">للمتقدمين</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">اختبر جاهزيتك</p>
          </div>
        </div>

        {/* Detailed Comparison Trigger */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-xs h-9 border-dashed"
          onClick={() => setCompareOpen(true)}
        >
          <Scale className="w-3.5 h-3.5" />
          مقارنة تفصيلية بين الوضعين
        </Button>

        {/* Training Mode */}
        <Card className="relative overflow-hidden border-2 border-secondary/30 hover:border-secondary transition-all cursor-pointer active:scale-[0.99] hover:shadow-lg" onClick={onSelectTraining}>
          <div className="absolute top-0 left-0 w-full h-1 bg-secondary" />
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-2xl bg-secondary/15 flex items-center justify-center shrink-0 ring-2 ring-secondary/20">
                <BookOpen className="w-7 h-7 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold">وضع التدريب</h2>
                  <Badge variant="secondary" className="text-[10px] gap-1 px-2 py-0">
                    <Sparkles className="w-3 h-3" />
                    موصى به
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" />
                  تعلّم خطوة بخطوة بدون ضغط
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 py-2 border-y border-border/50">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">المؤقت</p>
                <p className="text-xs font-bold text-secondary mt-0.5">بلا حد</p>
              </div>
              <div className="text-center border-x border-border/50">
                <p className="text-[10px] text-muted-foreground">الإجابات</p>
                <p className="text-xs font-bold text-secondary mt-0.5">فورية</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">الشرح</p>
                <p className="text-xs font-bold text-secondary mt-0.5">تفصيلي</p>
              </div>
            </div>

            <ul className="text-sm space-y-1.5 text-foreground/80 pr-1">
              <li className="flex items-center gap-2"><span className="text-secondary">✓</span> كشف فوري للإجابة الصحيحة</li>
              <li className="flex items-center gap-2"><span className="text-secondary">✓</span> شرح تفصيلي لكل سؤال</li>
              <li className="flex items-center gap-2"><span className="text-secondary">✓</span> تعلّم بسرعتك دون قلق</li>
            </ul>
            <PastExamModeMiniStats
              stats={stats?.training ?? { attempts: 0, avgPct: 0, bestPct: 0, lastPcts: [] }}
              variant="training"
              loading={statsLoading}
              isPaid={isPaid}
              isFreeModel={isFreeModel}
            />
            <Button className="w-full" variant="secondary">
              <BookOpen className="w-4 h-4 ml-1.5" />
              ابدأ التدريب
            </Button>
          </CardContent>
        </Card>

        {/* Strict Mode */}
        <Card
          className={`relative overflow-hidden border-2 transition-all ${hasDuration ? "border-destructive/30 hover:border-destructive cursor-pointer active:scale-[0.99] hover:shadow-lg" : "border-border opacity-60"}`}
          onClick={hasDuration ? openStrictConfirm : undefined}
        >
          <div className={`absolute top-0 left-0 w-full h-1 ${hasDuration ? "bg-destructive" : "bg-muted"}`} />
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center shrink-0 ring-2 ring-destructive/20">
                <Trophy className="w-7 h-7 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold">الامتحان الصارم</h2>
                  <Badge variant="destructive" className="text-[10px] gap-1 px-2 py-0">
                    <Flame className="w-3 h-3" />
                    تحدّي
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" />
                  محاكاة ظروف الاختبار الحقيقي
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 py-2 border-y border-border/50">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">المؤقت</p>
                <p className="text-xs font-bold text-destructive mt-0.5">{hasDuration ? `${model.duration_minutes} د` : "—"}</p>
              </div>
              <div className="text-center border-x border-border/50">
                <p className="text-[10px] text-muted-foreground">الإجابات</p>
                <p className="text-xs font-bold text-destructive mt-0.5">مخفية</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">المراجعة</p>
                <p className="text-xs font-bold text-destructive mt-0.5">في النهاية</p>
              </div>
            </div>

            <ul className="text-sm space-y-1.5 text-foreground/80 pr-1">
              <li className="flex items-center gap-2"><Timer className="w-3.5 h-3.5 text-destructive" /> مؤقت تنازلي صارم</li>
              <li className="flex items-center gap-2"><EyeOff className="w-3.5 h-3.5 text-destructive" /> بدون كشف للإجابات</li>
              <li className="flex items-center gap-2"><Trophy className="w-3.5 h-3.5 text-destructive" /> نتيجة ومراجعة شاملة</li>
            </ul>
            {hasDuration && (
              <PastExamModeMiniStats
                stats={stats?.strict ?? { attempts: 0, avgPct: 0, bestPct: 0, lastPcts: [] }}
                variant="strict"
                loading={statsLoading}
              />
            )}
            {hasDuration ? (
              <Button className="w-full" variant="destructive" onClick={(e) => { e.stopPropagation(); openStrictConfirm(); }}>
                <Lock className="w-4 h-4 ml-1.5" />
                ابدأ الامتحان الصارم
              </Button>
            ) : (
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>هذا النموذج لا يحتوي على مدة محددة. يرجى التواصل مع الإدارة لإضافة مدة الاختبار.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Strict Mode Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent dir="rtl" className="max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <AlertDialogTitle className="text-center text-lg">
              تحذير قبل بدء الامتحان الصارم
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-sm">
              هذا الوضع يحاكي ظروف الاختبار الحقيقي. اقرأ التعليمات بعناية قبل المتابعة.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2.5 py-2">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <Timer className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-foreground">المؤقت لا يمكن إيقافه</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  سيستمر العد التنازلي ({model.duration_minutes} دقيقة) حتى لو أغلقت التطبيق.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <LogOut className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-foreground">لا يمكن الخروج أو إعادة المحاولة</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  بمجرد البدء، يجب إكمال الامتحان حتى النهاية. الخروج سيؤدي إلى تسجيل النتيجة الحالية.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <EyeOff className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-foreground">لا يوجد كشف للإجابات</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  لن ترى الإجابات الصحيحة أو الشروحات إلا بعد انتهاء الامتحان.
                </p>
              </div>
            </div>

            <label className="flex items-start gap-2 p-3 rounded-lg border bg-muted/30 cursor-pointer mt-3">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-destructive cursor-pointer flex-shrink-0"
              />
              <span className="text-xs leading-relaxed text-foreground">
                أنا مستعد، وأفهم أنه لا يمكنني الخروج أو إيقاف المؤقت بعد البدء.
              </span>
            </label>
          </div>

          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="mt-0">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              disabled={!acknowledged}
              onClick={handleConfirmStart}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              <Lock className="w-4 h-4 ml-1.5" />
              بدء الامتحان الآن
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detailed Comparison Dialog */}
      <PastExamModesComparisonDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        durationMinutes={model.duration_minutes}
        totalQuestions={totalQuestions}
      />
    </div>
  );
};

export default ModeSelector;
