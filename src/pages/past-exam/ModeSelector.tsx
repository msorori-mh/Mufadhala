import { useState } from "react";
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
import { ArrowRight, BookOpen, Timer, AlertTriangle, Lock, EyeOff, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { PastExamModelInfo } from "./types";

interface Props {
  model: PastExamModelInfo;
  totalQuestions: number;
  onSelectTraining: () => void;
  onSelectStrict: () => void;
}

const ModeSelector = ({ model, totalQuestions, onSelectTraining, onSelectStrict }: Props) => {
  const navigate = useNavigate();
  const hasDuration = (model.duration_minutes ?? 0) > 0;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

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

        {/* Training Mode */}
        <Card className="border-2 border-secondary/30 hover:border-secondary transition-colors cursor-pointer active:scale-[0.99]" onClick={onSelectTraining}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-secondary/15 flex items-center justify-center shrink-0">
                <BookOpen className="w-6 h-6 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold">وضع التدريب</h2>
                <p className="text-xs text-muted-foreground mt-0.5">تعلّم خطوة بخطوة</p>
              </div>
            </div>
            <ul className="text-sm space-y-1.5 text-foreground/80 pr-1">
              <li>✅ كشف فوري للإجابة الصحيحة</li>
              <li>✅ شرح تفصيلي لكل سؤال</li>
              <li>✅ بدون مؤقت — تعلّم بسرعتك</li>
            </ul>
            <Button className="w-full" variant="secondary">ابدأ التدريب</Button>
          </CardContent>
        </Card>

        {/* Strict Mode */}
        <Card
          className={`border-2 transition-colors ${hasDuration ? "border-destructive/30 hover:border-destructive cursor-pointer active:scale-[0.99]" : "border-border opacity-60"}`}
          onClick={hasDuration ? openStrictConfirm : undefined}
        >
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center shrink-0">
                <Timer className="w-6 h-6 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold">الامتحان الصارم</h2>
                <p className="text-xs text-muted-foreground mt-0.5">محاكاة ظروف الاختبار الحقيقي</p>
              </div>
            </div>
            <ul className="text-sm space-y-1.5 text-foreground/80 pr-1">
              <li>⏱️ مؤقت تنازلي {hasDuration ? `(${model.duration_minutes} دقيقة)` : ""}</li>
              <li>🔒 بدون كشف للإجابات أثناء الاختبار</li>
              <li>📊 النتيجة والمراجعة في النهاية</li>
            </ul>
            {hasDuration ? (
              <Button className="w-full" variant="destructive" onClick={(e) => { e.stopPropagation(); openStrictConfirm(); }}>
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
    </div>
  );
};

export default ModeSelector;
