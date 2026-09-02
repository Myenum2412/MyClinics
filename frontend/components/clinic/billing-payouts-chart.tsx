"use client";

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import type { Bill } from "@/lib/clinic-api";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function buildChartData(bills: Bill[]) {
  const now = new Date();
  const year = now.getFullYear();
  const buckets = MONTHS.map((month) => ({ month, payouts: 0, pending: 0 }));
  bills.forEach((b) => {
    const d = new Date(b.invoiceDate || b.createdAt);
    if (isNaN(d.getTime()) || d.getFullYear() !== year) return;
    const m = d.getMonth();
    buckets[m].payouts += b.amountPaid ?? 0;
    buckets[m].pending += b.balanceDue ?? Math.max(b.total - b.amountPaid, 0);
  });
  // round to 2 decimals
  return buckets.map((b) => ({ ...b, payouts: Math.round(b.payouts), pending: Math.round(b.pending) }));
}

export function BillingPayoutsChart({ bills }: { bills: Bill[] }) {
  const chartData = useMemo(() => buildChartData(bills), [bills]);

  const { monthlyPaid, yearlyPaid, yearlyPending, monthlyDelta, yearlyDelta } = useMemo(() => {
    const now = new Date();
    const m = now.getMonth();
    const curPaid = chartData[m]?.payouts ?? 0;
    const prevPaid = chartData[m - 1]?.payouts ?? 0;
    const yearlyPaid = chartData.reduce((s, d) => s + d.payouts, 0);
    const yearlyPending = chartData.reduce((s, d) => s + d.pending, 0);
    const monthlyDelta = prevPaid ? (((curPaid - prevPaid) / prevPaid) * 100).toFixed(1) : "0.0";
    // yearly delta vs last year not available → show vs avg month
    const avg = yearlyPaid / 12;
    const yearlyDelta = avg ? (((yearlyPaid - avg * 12) / (avg * 12)) * 100).toFixed(1) : "0.0";
    return { monthlyPaid: curPaid, yearlyPaid, yearlyPending, monthlyDelta, yearlyDelta };
  }, [chartData]);

  // top patients by total billed (real data)
  const topPatients = useMemo(() => {
    const map = new Map<string, number>();
    bills.forEach((b) => map.set(b.patientId, (map.get(b.patientId) ?? 0) + b.total));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([id, amount]) => ({ city: id.slice(0, 8), amount: `₹${amount.toLocaleString("en-IN")}` }));
  }, [bills]);

  const hasData = bills.length > 0;

  const STATS = [
    { label: "This Month (Paid)", value: `₹${monthlyPaid.toLocaleString("en-IN")}`, delta: `${Number(monthlyDelta) >= 0 ? "+" : ""}${monthlyDelta}%`, sub: "vs last month", swatch: "bg-[#f97316]" },
    { label: "Yearly (Paid)", value: `₹${yearlyPaid.toLocaleString("en-IN")}`, delta: `₹${yearlyPending.toLocaleString("en-IN")} pending`, sub: "total pending", swatch: "bg-[#ec4899]" },
  ];

  return (
    <div className="flex h-[340px] w-full flex-col px-3 pt-2 pb-1 sm:h-[360px] sm:px-4 sm:pt-4 sm:pb-2">
      <div className="min-h-24 w-full flex-1 sm:min-h-0">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={50} tickFormatter={(v) => `₹${v}`} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))" }}
                formatter={(value: any, name: any) => [`₹${Number(value).toLocaleString("en-IN")}`, name === "payouts" ? "Paid" : "Pending"] as any}
              />
              <Line type="monotone" dataKey="payouts" stroke="#f97316" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="pending" stroke="#0891b2" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No billing data yet</div>
        )}
      </div>

      <div className="mt-2 grid shrink-0 grid-cols-2 gap-3 sm:mt-3 sm:gap-4">
        {STATS.map(({ label, value, delta, sub, swatch }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className="text-primary flex items-center gap-1.5 text-[10px] leading-3.5 font-medium sm:text-[11px] sm:leading-normal">
              <span className={cn("size-2 shrink-0 rounded-[3px]", swatch)} />
              {label}
            </span>
            <span className="text-primary text-xl leading-6 font-semibold tracking-tight sm:text-2xl sm:leading-8">{value}</span>
            <span className="flex items-center gap-1.5 text-[10px] leading-3.5 sm:text-[11px] sm:leading-normal">
              <span className="font-medium text-emerald-500">{delta}</span>
              <span className="text-muted-foreground">{sub}</span>
            </span>
          </div>
        ))}
      </div>

      {topPatients.length > 0 && (
        <div className="mt-2 shrink-0 sm:mt-3">
          {topPatients.map(({ city, amount }, i) => (
            <div key={city} className={cn("border-border flex items-center justify-between py-1 text-xs sm:py-1.5 sm:text-sm", i > 0 && "border-t")}>
              <span className="text-muted-foreground truncate">{city}</span>
              <span className="text-primary font-medium">{amount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
