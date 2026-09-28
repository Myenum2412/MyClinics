'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type { Bill } from '@/lib/clinic-api';
import { MetricStatGrid } from '@/components/metric-stat-cards';

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
  const totalInvoiced = bills
    .filter((b) => b.status !== 'void')
    .reduce((sum, b) => sum + b.total, 0);
  const paidTotal = bills
    .filter((b) => b.status === 'paid')
    .reduce((sum, b) => sum + b.total, 0);
  const outstandingTotal = bills
    .filter((b) => b.status === 'issued')
    .reduce((sum, b) => sum + b.total, 0);
  const unpaidCount = bills.filter(
    (b) => b.status === 'issued' || b.status === 'draft'
  ).length;
  const targetRevenue = 200000;

  const items = [
    {
      name: 'Total Invoiced',
      value: `₹${totalInvoiced.toLocaleString('en-IN')}`,
      detail: `₹${targetRevenue.toLocaleString('en-IN')} target`,
      percentage: Math.min(100, Math.round((totalInvoiced / targetRevenue) * 100)),
      accent: 'var(--chart-1)',
    },
    {
      name: 'Total Collected',
      value: `₹${paidTotal.toLocaleString('en-IN')}`,
      detail: `of ₹${totalInvoiced.toLocaleString('en-IN')} invoiced`,
      percentage: totalInvoiced ? Math.round((paidTotal / totalInvoiced) * 100) : 0,
      accent: 'var(--chart-2)',
    },
    {
      name: 'Outstanding (Issued)',
      value: `₹${outstandingTotal.toLocaleString('en-IN')}`,
      detail: `of ₹${totalInvoiced.toLocaleString('en-IN')} invoiced`,
      percentage: totalInvoiced ? Math.round((outstandingTotal / totalInvoiced) * 100) : 0,
      accent: 'var(--chart-3)',
    },
    {
      name: 'Unpaid Invoices',
      value: unpaidCount,
      detail: `${unpaidCount} of ${totalCount} total bills`,
      percentage: totalCount ? Math.round((unpaidCount / totalCount) * 100) : 0,
      accent: 'var(--chart-4)',
    },
  ];

  return (
    <div className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="shrink-0">
          <h2 className="text-balance font-medium text-foreground text-lg sm:text-xl">
            Billing Analytics
          </h2>
          <p className="mt-0.5 text-pretty text-muted-foreground text-xs leading-5 sm:mt-1 sm:text-sm sm:leading-6">
            Revenue totals, payment collection, and outstanding invoice insights.
          </p>
        </div>
        {onSearchChange !== undefined && (
          <div className="flex-1 flex justify-center px-0 sm:px-4">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchTerm ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full pl-9"
              />
            </div>
          </div>
        )}
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-4 sm:mt-6">
        <MetricStatGrid items={items} />
      </div>
    </div>
  );
}
