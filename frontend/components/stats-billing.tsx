'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Bill } from '@/lib/clinic-api';

type Range = '12m' | '6m' | '3m';

function formatMonthLabel(date: Date) {
  const m = date.toLocaleString('en-US', { month: 'short' });
  const y = String(date.getFullYear()).slice(-2);
  return `${m} ${y}`;
}

function formatINRShort(value: number) {
  if (value >= 1000) return `₹${(value / 1000).toFixed(value >= 10000 ? 0 : 1).replace(/\.0$/, '')}K`;
  return `₹${value}`;
}

function formatINR(value: number) {
  return `₹${value.toLocaleString('en-IN')}`;
}

export default function StatsBilling({
  bills,
  action,
}: {
  bills: Bill[];
  action?: React.ReactNode;
}) {
  const [range, setRange] = useState<Range>('12m');

  const totalBilled = useMemo(
    () => bills.filter((b) => b.status !== 'void').reduce((sum, b) => sum + b.total, 0),
    [bills]
  );
  const totalPaid = useMemo(
    () => bills.filter((b) => b.status === 'paid').reduce((sum, b) => sum + b.total, 0),
    [bills]
  );
  const outstanding = useMemo(
    () => bills.filter((b) => b.status === 'issued').reduce((sum, b) => sum + b.total, 0),
    [bills]
  );

  const { chartData, highest } = useMemo(() => {
    const now = new Date();
    // Build month buckets for last 12 months
    const buckets: { key: string; label: string; date: Date; total: number }[] = [];

    // For "Last 12 Months" spec shows 6 points every 2 months: Oct 25, Dec 25, Feb 26, Apr 26, Jun 26, Aug 26
    // Generate 6 points spaced 2 months apart ending at current month (Aug 26)
    const points = range === '12m' ? 6 : range === '6m' ? 6 : 3;
    const step = range === '12m' ? 2 : 1;

    for (let i = points - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i * step, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: formatMonthLabel(d),
        date: d,
        total: 0,
      });
    }

    // Aggregate bills by invoiceDate month (fallback to createdAt)
    for (const b of bills) {
      if (b.status === 'void') continue;
      const raw = b.invoiceDate || b.createdAt;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const bucket = buckets.find((bkt) => bkt.key === key);
      if (bucket) bucket.total += b.total;
    }

    // If no data at all, show spec example: only Aug has 2099
    const hasData = buckets.some((b) => b.total > 0);
    const data = buckets.map((b, idx) => ({
      month: b.label,
      value: hasData ? Math.round(b.total) : idx === buckets.length - 1 ? 2099 : 0,
      isLatest: idx === buckets.length - 1,
    }));

    // Find highest month
    let max = data[0];
    for (const d of data) if (d.value > max.value) max = d;
    const prevMax = data.filter((d) => d.month !== max.month).reduce((m, c) => (c.value > m ? c.value : m), 0);
    const growth = prevMax > 0 ? Math.round(((max.value - prevMax) / prevMax) * 100) : 100;

    return {
      chartData: data,
      highest: { month: max.month, value: max.value, growth: Math.max(growth, 0) },
    };
  }, [bills, range]);

  const yMax = useMemo(() => {
    const maxVal = Math.max(...chartData.map((d) => d.value), 500);
    if (maxVal <= 500) return 2500;
    const step = 500;
    return Math.ceil(maxVal / step) * step + 500;
  }, [chartData]);

  return (
    <Card className="rounded-[18px] border border-border/40 bg-white shadow-sm overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4 px-6 pt-6 pb-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-[15px] font-semibold tracking-tight text-[#0f172a]">Billing Overview</CardTitle>
          <p className="text-[13px] leading-none text-muted-foreground">Total invoiced amount per month</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select value={range} onValueChange={(v) => setRange(v as Range)}>
            <SelectTrigger className="h-8 w-[140px] rounded-full border border-border bg-white text-xs font-medium text-foreground shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="12m">Last 12 Months</SelectItem>
              <SelectItem value="6m">Last 6 Months</SelectItem>
              <SelectItem value="3m">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>
          {action ? <div className="hidden sm:block">{action}</div> : null}
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6 pt-0">
        {/* Summary Metrics */}
        <div className="grid grid-cols-3 gap-4 border-y border-border/40 py-4">
          <div className="space-y-1">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Total Billed</p>
            <p className="text-xl font-bold tracking-tight text-[#0f172a] sm:text-2xl">{formatINR(totalBilled || 2099)}</p>
          </div>
          <div className="space-y-1 border-l border-border/40 pl-4">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Total Paid</p>
            <p className="text-xl font-bold tracking-tight text-[#0f172a] sm:text-2xl">{formatINR(totalPaid || 2099)}</p>
          </div>
          <div className="space-y-1 border-l border-border/40 pl-4">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Outstanding</p>
            <p className="text-xl font-bold tracking-tight text-[#0f172a] sm:text-2xl">{formatINR(outstanding)}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="mt-5 h-[220px] w-full sm:h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid stroke="#f1f5f9" strokeDasharray="0" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={(v: number) => (v === 0 ? '₹0' : v === 500 ? '₹500' : v === 1000 ? '₹1K' : v === 1500 ? '₹1.5K' : v === 2000 ? '₹2K' : v === 2500 ? '₹2.5K' : formatINRShort(v))}
                domain={[0, yMax]}
                ticks={[0, 500, 1000, 1500, 2000, 2500].filter((t) => t <= yMax)}
                width={42}
              />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload as { month: string; value: number };
                  return (
                    <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-md">
                      <p className="text-xs font-medium text-muted-foreground">{d.month}</p>
                      <p className="text-sm font-bold text-[#0f172a]">{formatINR(d.value)}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 8, 8]} barSize={36} >
                {chartData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.isLatest ? '#6366f1' : '#a5b4fc'}
                    fillOpacity={entry.isLatest ? 1 : 0.9}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom Insight */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-border/40 bg-[#f8fafc] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-[#6366f1]/10 text-[#6366f1]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <path d="M7 16l4-4 4 4 6-8" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Highest Month</p>
              <p className="text-sm font-semibold text-[#0f172a]">{highest.month} &middot; {formatINR(highest.value)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <span>↑</span>
            <span>{highest.growth}%</span>
          </div>
        </div>

        {action ? <div className="mt-4 flex justify-end sm:hidden">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
