import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, Trophy, Check, X, Scale } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  durationMinutes: number | null;
  totalQuestions: number;
}

interface Row {
  criterion: string;
  training: { value: string; positive?: boolean };
  strict: { value: string; positive?: boolean };
}

/**
 * Detailed side-by-side comparison dialog between Training and Strict modes
 * for a past-exam model. Helps undecided students compare every criterion
 * (timer, answers visibility, review, scoring, leaderboard, etc.) at once.
 */
const PastExamModesComparisonDialog = ({
  open,
  onOpenChange,
  durationMinutes,
  totalQuestions,
}: Props) => {
  const rows: Row[] = [
    {
      criterion: "المؤقت",
      training: { value: "بدون حد زمني", positive: true },
      strict: { value: durationMinutes ? `${durationMinutes} دقيقة` : "غير محدد" },
    },
    {
      criterion: "عدد الأسئلة",
      training: { value: `${totalQuestions} سؤال` },
      strict: { value: `${totalQuestions} سؤال` },
    },
    {
      criterion: "كشف الإجابة الصحيحة",
      training: { value: "فوري بعد كل سؤال", positive: true },
      strict: { value: "بعد انتهاء الامتحان" },
    },
    {
      criterion: "الشرح التفصيلي",
      training: { value: "متاح مع كل سؤال", positive: true },
      strict: { value: "في المراجعة النهائية" },
    },
    {
      criterion: "التنقل بين الأسئلة",
      training: { value: "حر بالكامل", positive: true },
      strict: { value: "حر مع شريط تتبع" },
    },
    {
      criterion: "إيقاف المؤقت / الخروج",
      training: { value: "مسموح في أي وقت", positive: true },
      strict: { value: "ممنوع - يُسجَّل تلقائياً" },
    },
    {
      criterion: "تسجيل المحاولة",
      training: { value: "تُحفظ في سجل التدريب" },
      strict: { value: "تُحفظ في سجل الامتحانات" },
    },
    {
      criterion: "احتساب النتيجة",
      training: { value: "نسبة مئوية" },
      strict: { value: "نسبة + وقت + عدد متروك" },
    },
    {
      criterion: "التأثير على الترتيب",
      training: { value: "لا يؤثر" },
      strict: { value: "لا يؤثر (محلي للنموذج)" },
    },
    {
      criterion: "المراجعة الشاملة",
      training: { value: "بعد كل سؤال + في النهاية", positive: true },
      strict: { value: "صفحة مراجعة كاملة في النهاية" },
    },
    {
      criterion: "محاكاة الواقع",
      training: { value: "منخفضة" },
      strict: { value: "عالية - أقرب للامتحان الفعلي", positive: true },
    },
    {
      criterion: "مناسب لـ",
      training: { value: "التعلّم وفهم الأسئلة" },
      strict: { value: "اختبار الجاهزية النهائية" },
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-1">
            <Scale className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-lg">مقارنة تفصيلية بين الوضعين</DialogTitle>
          <DialogDescription className="text-center text-xs">
            راجع كل المعايير بدقة لتختار الوضع الأنسب لك
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto -mx-2 px-2 pb-2">
          {/* Header chips */}
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 sticky top-0 bg-background z-10 pb-2 border-b border-border mb-1">
            <div />
            <div className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-secondary/15 border border-secondary/30 min-w-[88px]">
              <BookOpen className="w-3.5 h-3.5 text-secondary" />
              <span className="text-[11px] font-bold text-secondary">تدريب</span>
            </div>
            <div className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-destructive/10 border border-destructive/30 min-w-[88px]">
              <Trophy className="w-3.5 h-3.5 text-destructive" />
              <span className="text-[11px] font-bold text-destructive">صارم</span>
            </div>
          </div>

          <Table>
            <TableHeader className="sr-only">
              <TableRow>
                <TableHead>المعيار</TableHead>
                <TableHead>تدريب</TableHead>
                <TableHead>صارم</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const trainingWins = row.training.positive === true && row.strict.positive !== true;
                const strictWins = row.strict.positive === true && row.training.positive !== true;
                return (
                  <TableRow key={row.criterion} className="border-border/50">
                    <TableCell className="py-2.5 px-2 text-xs font-bold text-foreground align-top w-[42%]">
                      {row.criterion}
                    </TableCell>
                    <TableCell className="py-1.5 px-1 text-[11px] align-top">
                      <div
                        className={`flex items-start gap-1 rounded-md px-1.5 py-1 transition-colors ${
                          trainingWins
                            ? "border border-secondary/50 bg-secondary/5 ring-1 ring-secondary/20"
                            : "border border-transparent"
                        }`}
                      >
                        {row.training.positive !== undefined && (
                          row.training.positive ? (
                            <Check className="w-3 h-3 text-secondary shrink-0 mt-0.5" />
                          ) : (
                            <X className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                          )
                        )}
                        <span className={row.training.positive ? "text-secondary font-semibold" : "text-foreground/80"}>
                          {row.training.value}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5 px-1 text-[11px] align-top">
                      <div
                        className={`flex items-start gap-1 rounded-md px-1.5 py-1 transition-colors ${
                          strictWins
                            ? "border border-destructive/50 bg-destructive/5 ring-1 ring-destructive/20"
                            : "border border-transparent"
                        }`}
                      >
                        {row.strict.positive !== undefined && (
                          row.strict.positive ? (
                            <Check className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                          ) : (
                            <X className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                          )
                        )}
                        <span className={row.strict.positive ? "text-destructive font-semibold" : "text-foreground/80"}>
                          {row.strict.value}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-secondary/10 border border-secondary/30 p-2.5">
              <p className="text-[10px] text-muted-foreground mb-0.5">اختر التدريب إذا</p>
              <p className="text-[11px] font-bold text-secondary leading-relaxed">
                تريد فهم الأسئلة والشروحات بدون ضغط
              </p>
            </div>
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-2.5">
              <p className="text-[10px] text-muted-foreground mb-0.5">اختر الصارم إذا</p>
              <p className="text-[11px] font-bold text-destructive leading-relaxed">
                تريد قياس جاهزيتك الحقيقية للامتحان
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PastExamModesComparisonDialog;
