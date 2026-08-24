"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, TrendingUp } from "lucide-react";
import type { Bill } from "@/lib/clinic-api";

interface BillingOverviewCardProps {
  bills: Bill[];
  loading?: boolean;
}

function formatINR(value: number): string {
  if (value >= 1000) {
    const k = value / 1000;
    // Keep one decimal if needed, e.g. 2.1K
    return `₹${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`.replace(".0K", "K");
  }
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatFullINR(value: number): string {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function BillingOverviewCard({ bills, loading }: BillingOverviewCardProps) {
  const { chartData, totalBilled, totalPaid, outstanding, highestMonth } = React.useMemo(() => {
    const now = new Date();
    const totalsByKey = new Map<string, number>();
    for (const bill of bills) {
      if (bill.status === "void") continue;
      const invoice = new Date(bill.invoiceDate);
      if (Number.isNaN(invoice.getTime())) continue;
      const key = `${invoice.getFullYear()}-${String(invoice.getMonth() + 1).padStart(2, "0")}-01`;
      totalsByKey.set(key, (totalsByKey.get(key) ?? 0) + bill.total);
    }

    const data: { key: string; label: string; shortLabel: string; total: number; isLatest: boolean }[] = [];
    for (let offset = 11; offset >= 0; offset--) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }); // e.g. Aug 26
      // For X-axis we show every 2 months to match spec: Oct 25, Dec 25 etc.
      // But we keep all 12 points in data and filter ticks via XAxis interval.
      data.push({
        key,
        label,
        shortLabel: label,
        total: Math.round(totalsByKey.get(key) ?? 0),
        isLatest: offset === 0,
      });
    }

    const totalBilledVal = data.reduce((acc, c) => acc + c.total, 0);
    const totalPaidVal = bills
      .filter((b) => b.status !== "void")
      .reduce((acc, b) => acc + (b.amountPaid ?? 0), 0);
    // If amountPaid not matching chart totals (e.g., partial), clamp to totalBilled for display consistency
    // Use balanceDue sum for outstanding
    const outstandingVal = Math.max(0, bills.filter((b) => b.status !== "void").reduce((acc, b) => acc + (b.balanceDue ?? 0), 0));

    // Highest month
    let max = data[0];
    for (const item of data) {
      if (item.total > max.total) max = item;
    }
    // Growth vs previous month for highest month
    let growth: number | null = null;
    const maxIdx = data.findIndex((d) => d.key === max.key);
    if (maxIdx > 0) {
      const prev = data[maxIdx - 1].total;
      if (prev > 0) growth = Math.round(((max.total - prev) / prev) * 100);
      else if (max.total > 0) growth = 100;
    } else if (max.total > 0) {
      growth = 100;
    }

    return {
      chartData: data,
      totalBilled: totalBilledVal,
      totalPaid: totalPaidVal,
      outstanding: outstandingVal,
      highestMonth: {
        label: max.label,
        value: max.total,
        growth,
      },
    };
  }, [bills]);

  // Y-axis domain: round up to nice value
  const maxVal = Math.max(...chartData.map((d) => d.total), 100);
  const yMax = React.useMemo(() => {
    if (maxVal <= 500) return 500;
    if (maxVal <= 1000) return 1000;
    if (maxVal <= 1500) return 1500;
    if (maxVal <= 2000) return 2000;
    if (maxVal <= 2500) return 2500;
    // round up to nearest 500
    return Math.ceil(maxVal / 500) * 500;
  }, [maxVal]);

  const yTicks = React.useMemo(() => {
    if (yMax <= 500) return [0, 250, 500];
    if (yMax <= 1000) return [0, 500, 1000];
    if (yMax <= 1500) return [0, 500, 1000, 1500];
    if (yMax <= 2000) return [0, 500, 1000, 1500, 2000];
    if (yMax <= 2500) return [0, 500, 1000, 1500, 2000, 2500];
    const ticks: number[] = [];
    const step = 500;
    for (let v = 0; v <= yMax; v += step) ticks.push(v);
    return ticks;
  }, [yMax]);

  if (loading) {
    return (
      <Card className="rounded-[20px] border border-border bg-white shadow-sm overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-56 animate-pulse rounded bg-muted/60" />
        </div>
        <div className="px-6 pb-6">
          <div className="h-[220px] animate-pulse rounded-lg bg-muted/40" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-[20px] border border-border bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight text-[#0f172a]">Billing Overview</h3>
          <p className="mt-1 text-xs text-muted-foreground">Total invoiced amount per month</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-full border border-border bg-white px-3 text-xs font-medium text-foreground shadow-sm hover:bg-muted/50"
        >
          Last 12 Months
          <ChevronDown className="ml-1 size-3.5 text-muted-foreground" />
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-3 gap-4 px-6 pb-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Total Billed</p>
          <p className="mt-1 text-xl font-bold tracking-tight text-[#0f172a] tabular-nums">
            {formatFullINR(totalBilled)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Total Paid</p>
          <p className="mt-1 text-xl font-bold tracking-tight text-[#0f172a] tabular-nums">
            {formatFullINR(totalPaid)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Outstanding</p>
          <p className="mt-1 text-xl font-bold tracking-tight text-[#0f172a] tabular-nums">
            {formatFullINR(outstanding)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <CardContent className="px-2 pb-2 pt-0 sm:px-4">
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} strokeDasharray="0" />
              <XAxis
                dataKey="shortLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
                interval={1}
                dy={8}
              />
              <YAxis
                domain={[0, yMax]}
                ticks={yTicks}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickFormatter={(v: number) => formatINR(v)}
                width={48}
              />
              <Tooltip
                cursor={{ fill: "rgba(99,102,241,0.06)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0].payload as (typeof chartData)[number];
                  return (
                    <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-md">
                      <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                      <p className="mt-1 text-sm font-bold text-[#0f172a]">{formatFullINR(item.total)}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="total" radius={[8, 8, 0, 0]} barSize={18}>
                {chartData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={entry.isLatest ? "#6366f1" : entry.total === 0 ? "#e2e8f0" : "#a5b4fc"}
                    strokeWidth={0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>

      {/* Bottom Insight */}
      <div className="mx-6 mb-5 mt-1 flex items-center justify-between rounded-xl border border-border bg-[#f8fafc] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-white border border-border shadow-sm">
            <TrendingUp className="size-4 text-[#6366f1]" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">Highest Month</p>
            <p className="text-sm font-semibold text-[#0f172a]">{highestMonth.label}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-[#0f172a] tabular-nums">{formatFullINR(highestMonth.value)}</p>
          {highestMonth.growth !== null && (
            <p className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <span>↑</span>
              <span>{highestMonth.growth}%</span>
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
