"use client";

import * as React from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";
import { ArrowRight, IndianRupee } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Bill } from "@/lib/clinic-api";
import { parseDate } from "@/lib/datetime";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function BillingChartsCard({
  bills,
  loading = false,
}: {
  bills: Bill[];
  loading?: boolean;
}) {
  const currentYearStr = String(new Date().getFullYear());

  // Aggregate bills by year and month
  const { years, yearlyData } = React.useMemo(() => {
    const dataByYear: Record<string, number[]> = {};
    const yrSet = new Set<string>([currentYearStr]);

    for (const b of bills) {
      if (b.status === "void") continue;
      const d = parseDate(b.invoiceDate || (b as any).createdAt);
      if (!d) continue;
      const yr = String(d.getFullYear());
      yrSet.add(yr);
      if (!dataByYear[yr]) {
        dataByYear[yr] = new Array(12).fill(0);
      }
      const m = d.getMonth();
      dataByYear[yr][m] += b.total ?? 0;
    }

    if (!dataByYear[currentYearStr]) {
      dataByYear[currentYearStr] = new Array(12).fill(0);
    }

    const sortedYears = Array.from(yrSet).sort((a, b) => Number(b) - Number(a));
    return { years: sortedYears, yearlyData: dataByYear };
  }, [bills, currentYearStr]);

  const [selectedYear, setSelectedYear] = React.useState(years[0] ?? currentYearStr);

  React.useEffect(() => {
    if (years.length > 0 && !years.includes(selectedYear)) {
      setSelectedYear(years[0]);
    }
  }, [years, selectedYear]);

  const chartData = React.useMemo(() => {
    const monthsData = yearlyData[selectedYear] ?? new Array(12).fill(0);
    return MONTHS.map((month, i) => ({
      month,
      revenue: Math.round(monthsData[i] ?? 0),
    }));
  }, [yearlyData, selectedYear]);

  const totalSelectedYear = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.revenue, 0);
  }, [chartData]);

  return (
    <Card className="h-[480px] rounded-none border border-border shadow-sm flex flex-col justify-between overflow-hidden">
      <CardHeader className="border-b border-border bg-muted/20 px-6 py-4 shrink-0">
        <div>
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <IndianRupee className="size-4 text-primary" />
            Billing
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Annual revenue breakdown for {selectedYear}
          </CardDescription>
        </div>
        <CardAction className="flex items-center gap-2">
          <Select
            value={selectedYear}
            onValueChange={(value) => setSelectedYear(value as string)}
          >
            <SelectTrigger
              className="h-8 w-24 text-xs tabular-nums"
              aria-label="Select fiscal year"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {years.map((y) => (
                <SelectItem key={y} value={y} className="text-xs tabular-nums">
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Link href="/clinic/billing">
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
              View all <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        </CardAction>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Skeleton className="h-56 w-full" />
          </div>
        ) : (
          <div className="flex flex-col h-full justify-between">
            <div className="flex items-baseline gap-2 shrink-0">
              <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                ₹{totalSelectedYear.toLocaleString("en-IN")}
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                Total Billed ({selectedYear})
              </span>
            </div>

            <div className="flex-1 w-full min-h-[220px] pt-2">
              <ChartContainer
                config={chartConfig}
                className="h-full max-h-[260px] w-full [&_.recharts-surface:focus-visible]:outline-2 [&_.recharts-surface:focus-visible]:outline-offset-2 [&_.recharts-surface:focus-visible]:outline-ring [&_.recharts-surface:focus-visible]:outline-solid"
              >
                <BarChart
                  accessibilityLayer
                  aria-label="Billing revenue chart"
                  data={chartData}
                  margin={{ top: 20, left: 0, right: 0, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    fontSize={11}
                  />
                  <ChartTooltip
                    cursor={{ fill: "hsl(var(--muted)/0.4)" }}
                    content={
                      <ChartTooltipContent
                        formatter={(value) =>
                          `₹${Number(value).toLocaleString("en-IN")}`
                        }
                      />
                    }
                  />
                  <Bar
                    dataKey="revenue"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                    fillOpacity={0.9}
                  >
                    <LabelList
                      dataKey="revenue"
                      position="top"
                      offset={8}
                      className="fill-muted-foreground font-mono"
                      fontSize={10}
                      formatter={(value: any) => {
                        const num = Number(value);
                        if (!num) return "";
                        return num >= 1000
                          ? `₹${Math.round(num / 1000)}k`
                          : `₹${num}`;
                      }}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          </div>
        )}
      </CardContent>

      <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground shrink-0">
        <span>Fiscal Year {selectedYear}</span>
        <span className="font-medium text-foreground">
          ₹{totalSelectedYear.toLocaleString("en-IN")} Total
        </span>
      </div>
    </Card>
  );
}
