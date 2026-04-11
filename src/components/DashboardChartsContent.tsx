import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, LineChart, Line } from "recharts";

interface Props {
  chartData: { name: string; score: number }[];
  distribution: { range: string; count: number; fill: string }[];
}

const chartConfig = { score: { label: "النتيجة %", color: "hsl(var(--primary))" } };
const barConfig = { count: { label: "عدد المحاولات", color: "hsl(var(--primary))" } };

export default function DashboardChartsContent({ chartData, distribution }: Props) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-1.5 pt-3 px-4">
          <CardTitle className="text-xs">تطور النتائج</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <ChartContainer config={chartConfig} className="h-[180px] w-full">
            <LineChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3, fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1.5 pt-3 px-4">
          <CardTitle className="text-xs">توزيع الدرجات</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <ChartContainer config={barConfig} className="h-[180px] w-full">
            <BarChart data={distribution}>
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {distribution.map((entry, idx) => (
                  <Bar key={idx} dataKey="count" fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
