"use client";

import type { ReactNode } from "react";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const chartConfig = {
  capacity: {
    label: "Capacity",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export interface MetricStatItem {
  name: string;
  /** Primary figure shown large (count, currency, etc.). */
  value: string | number;
  /** Secondary line under the value. */
  detail: string;
  /** 0–100 progress fill. */
  percentage: number;
  /** Optional left icon. */
  icon?: ReactNode;
  /** CSS color for the progress fill / icon tint (e.g. var(--chart-1)). */
  accent?: string;
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function MetricStatCard({ item }: { item: MetricStatItem }) {
  const pct = clampPct(item.percentage);
  const accent = item.accent ?? "var(--chart-1)";

  return (
    <Card className="p-3 shadow-2xs sm:p-4" key={item.name}>
      <CardContent className="flex flex-col items-center gap-1.5 p-0 text-center sm:flex-row sm:items-center sm:gap-0 sm:space-x-4 sm:text-left">
        <div className="relative flex shrink-0 items-center justify-center">
          <ChartContainer className="h-[68px] w-[68px] sm:h-[80px] sm:w-[80px]" config={chartConfig}>
            <RadialBarChart
              barSize={6}
              data={[{ capacity: pct }]}
              endAngle={-270}
              innerRadius={26}
              outerRadius={33}
              startAngle={90}
            >
              <PolarAngleAxis
                angleAxisId={0}
                axisLine={false}
                domain={[0, 100]}
                tick={false}
                type="number"
              />
              <RadialBar
                angleAxisId={0}
                background
                cornerRadius={10}
                dataKey="capacity"
                fill={accent}
              />
            </RadialBarChart>
          </ChartContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-medium text-sm text-foreground tabular-nums sm:text-base">
              {pct}%
            </span>
          </div>
        </div>
        <div className="min-w-0 w-full">
          <dt className="flex items-center justify-center gap-1.5 font-medium text-foreground text-xs sm:justify-start sm:text-sm">
            {item.icon ? (
              <span className="inline-flex shrink-0 items-center" style={{ color: accent }}>
                {item.icon}
              </span>
            ) : null}
            <span className="truncate">{item.name}</span>
          </dt>
          <dd className="mt-0.5 text-muted-foreground text-xs tabular-nums sm:text-sm">
            {item.value}
          </dd>
          <dd className="truncate text-muted-foreground text-[11px] sm:text-xs">{item.detail}</dd>
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricStatGrid({
  items,
  className,
}: {
  items: MetricStatItem[];
  className?: string;
}) {
  return (
    <dl className={cn("grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4", className)}>
      {items.map((item) => (
        <MetricStatCard key={item.name} item={item} />
      ))}
    </dl>
  );
}
