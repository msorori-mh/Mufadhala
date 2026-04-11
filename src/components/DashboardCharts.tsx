import { lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load recharts — ~416KB, only needed when charts are visible
const LazyCharts = lazy(() => import("./DashboardChartsContent"));

interface DashboardChartsProps {
  chartData: { name: string; score: number }[];
  distribution: { range: string; count: number; fill: string }[];
}

function ChartSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-1.5 pt-3 px-4"><CardTitle className="text-xs">تطور النتائج</CardTitle></CardHeader>
        <CardContent className="px-2 pb-3"><Skeleton className="h-[180px] w-full rounded-lg" /></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-1.5 pt-3 px-4"><CardTitle className="text-xs">توزيع الدرجات</CardTitle></CardHeader>
        <CardContent className="px-2 pb-3"><Skeleton className="h-[180px] w-full rounded-lg" /></CardContent>
      </Card>
    </div>
  );
}

export default function DashboardCharts({ chartData, distribution }: DashboardChartsProps) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LazyCharts chartData={chartData} distribution={distribution} />
    </Suspense>
  );
}
