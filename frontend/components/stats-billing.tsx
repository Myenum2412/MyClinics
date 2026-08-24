'use client';

import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { type ChartConfig, ChartContainer } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type { Bill } from '@/lib/clinic-api';

const chartConfig = {
  capacity: {
    label: 'Revenue',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export default function StatsBilling({
  bills,
  action,
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Search bills, patient, status...',
}: {
  bills: Bill[];
  action?: React.ReactNode;
  searchTerm?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
}) {
  const totalCount = bills.length;
  
  // Calculate revenue totals
  const totalInvoiced = bills
    .filter((b) => b.status !== 'void')
    .reduce((sum, b) => sum + b.total, 0);

  const paidTotal = bills
    .filter((b) => b.status === 'paid')
    .reduce((sum, b) => sum + b.total, 0);

  const outstandingTotal = bills
    .filter((b) => b.status === 'issued')
    .reduce((sum, b) => sum + b.total, 0);

  const unpaidCount = bills.filter((b) => b.status === 'issued' || b.status === 'draft').length;

  const targetRevenue = 200000; // Configurable monthly target

  // Prepare data for the cards
  const data = [
    {
      name: 'Total Invoiced',
      percentage: Math.min(100, Math.round((totalInvoiced / targetRevenue) * 100)),
      current: `₹${totalInvoiced.toLocaleString('en-IN')}`,
      allowed: `₹${targetRevenue.toLocaleString('en-IN')}`,
      allowedLabel: 'target',
      fill: 'var(--chart-1)',
    },
    {
      name: 'Total Collected',
      percentage: totalInvoiced ? Math.round((paidTotal / totalInvoiced) * 100) : 0,
      current: `₹${paidTotal.toLocaleString('en-IN')}`,
      allowed: `₹${totalInvoiced.toLocaleString('en-IN')}`,
      allowedLabel: 'invoiced',
      fill: 'var(--chart-2)',
    },
    {
      name: 'Outstanding (Issued)',
      percentage: totalInvoiced ? Math.round((outstandingTotal / totalInvoiced) * 100) : 0,
      current: `₹${outstandingTotal.toLocaleString('en-IN')}`,
      allowed: `₹${totalInvoiced.toLocaleString('en-IN')}`,
      allowedLabel: 'invoiced',
      fill: 'var(--chart-3)',
    },
    {
      name: 'Unpaid Invoices',
      percentage: totalCount ? Math.round((unpaidCount / totalCount) * 100) : 0,
      current: unpaidCount,
      allowed: totalCount,
      allowedLabel: 'total bills',
      fill: 'var(--chart-4)',
    },
  ];

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="shrink-0">
          <h2 className="text-balance font-medium text-foreground text-xl">
            Billing Analytics
          </h2>
          <p className="mt-1 text-pretty text-muted-foreground text-sm leading-6">
            Revenue totals, payment collection, and outstanding invoice insights.
          </p>
        </div>
        {onSearchChange !== undefined && (
          <div className="flex-1 flex justify-center px-4">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchTerm ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full pl-9"
              />
            </div>
          </div>
        )}
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <dl className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((item) => (
          <Card className="p-4 shadow-sm bg-card" key={item.name}>
            <CardContent className="flex items-center space-x-4 p-0">
              <div className="relative flex items-center justify-center">
                <ChartContainer
                  className="h-[80px] w-[80px]"
                  config={chartConfig}
                >
                  <RadialBarChart
                    barSize={6}
                    data={[{ name: item.name, capacity: item.percentage }]}
                    endAngle={-270}
                    innerRadius={30}
                    outerRadius={60}
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
                      fill={item.fill}
                    />
                  </RadialBarChart>
                </ChartContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-semibold text-xs text-foreground">
                    {item.percentage}%
                  </span>
                </div>
              </div>
              <div>
                <dt className="font-semibold text-foreground text-sm tracking-tight leading-none mb-1">
                  {item.name}
                </dt>
                <dd className="text-muted-foreground text-xs">
                  {item.current} of {item.allowed} {item.allowedLabel}
                </dd>
              </div>
            </CardContent>
          </Card>
        ))}
      </dl>
    </div>
  );
}

