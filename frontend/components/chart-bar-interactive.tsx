"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export interface ChartBarInteractiveDatum {
  date: string;
  total: number;
  paid: number;
}

const chartConfig = {
  total: {
    label: "Total Billed",
    color: "var(--chart-1)",
  },
  paid: {
    label: "Paid",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

function formatINR(value: number): string {
  return `₹${(Number.isFinite(value) ? value : 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

export function ChartBarInteractive({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle: string;
  data: ChartBarInteractiveDatum[];
}) {
  const [activeChart, setActiveChart] =
    React.useState<keyof typeof chartConfig>("total");

  const totals = React.useMemo(
    () => ({
      total: data.reduce((acc, curr) => acc + curr.total, 0),
      paid: data.reduce((acc, curr) => acc + curr.paid, 0),
    }),
    [data]
  );

  return (
    <Card className="py-0">
      <CardHeader className="flex flex-col items-stretch border-b p-0! sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:py-0!">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </div>
        <div className="flex">
          {(["total", "paid"] as const).map((key) => {
            const chart = key;
            const active = activeChart === chart;
            return (
              <button
                key={chart}
                data-active={active}
                className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
                onClick={() => setActiveChart(chart)}
              >
                <span className="text-xs text-muted-foreground">
                  {chartConfig[chart].label}
                </span>
                <span className="text-lg leading-none font-bold sm:text-3xl">
                  {formatINR(totals[chart])}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={data}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                if (Number.isNaN(date.getTime())) return String(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  year: "2-digit",
                });
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[180px]"
                  nameKey={activeChart}
                  labelFormatter={(value) => {
                    const date = new Date(String(value));
                    if (Number.isNaN(date.getTime())) return String(value);
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    });
                  }}
                  formatter={(value) => [
                    formatINR(Number(value)),
                    chartConfig[activeChart].label,
                  ]}
                />
              }
            />
            <Bar dataKey={activeChart} fill={`var(--color-${activeChart})`} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
