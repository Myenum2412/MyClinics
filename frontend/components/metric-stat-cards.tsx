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
    <Card className="p-4 shadow-2xs" key={item.name}>
      <CardContent className="flex items-center space-x-4 p-0">
        <div className="relative flex shrink-0 items-center justify-center">
          <ChartContainer className="h-[80px] w-[80px]" config={chartConfig}>
            <RadialBarChart
              barSize={6}
              data={[{ capacity: pct }]}
              endAngle={-270}
              innerRadius={30}
              outerRadius={40}
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
            <span className="font-medium text-base text-foreground tabular-nums">
              {pct}%
            </span>
          </div>
        </div>
        <div className="min-w-0">
          <dt className="flex items-center gap-1.5 font-medium text-foreground text-sm">
            {item.icon ? (
              <span className="inline-flex shrink-0 items-center" style={{ color: accent }}>
                {item.icon}
              </span>
            ) : null}
            <span className="truncate">{item.name}</span>
          </dt>
          <dd className="mt-0.5 text-muted-foreground text-sm tabular-nums">
            {item.value}
          </dd>
          <dd className="text-muted-foreground text-xs">{item.detail}</dd>
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
    <dl className={cn("grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {items.map((item) => (
        <MetricStatCard key={item.name} item={item} />
      ))}
    </dl>
  );
}
