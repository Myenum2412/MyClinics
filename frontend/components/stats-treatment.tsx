'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { MetricStatGrid } from '@/components/metric-stat-cards';

export default function StatsTreatment({
  records,
  plans,
  discharges,
  patients,
  searchTerm,
  onSearchChange,
  action,
}: {
  records: number;
  plans: number;
  discharges: number;
  patients: number;
  searchTerm?: string;
  onSearchChange?: (v: string) => void;
  action?: React.ReactNode;
}) {
  const items = [
    {
      name: 'Total Records',
      value: records,
      detail: `${records} of 20 target`,
      percentage: Math.min(100, Math.round((records / 20) * 100)),
      accent: 'var(--chart-1)',
    },
    {
      name: 'Treatment Plans',
      value: plans,
      detail: `${plans} of 20 target`,
      percentage: Math.min(100, Math.round((plans / 20) * 100)),
      accent: 'var(--chart-2)',
    },
    {
      name: 'Discharges',
      value: discharges,
      detail: `${discharges} of 20 target`,
      percentage: Math.min(100, Math.round((discharges / 20) * 100)),
      accent: 'var(--chart-3)',
    },
    {
      name: 'Total Patients',
      value: patients,
      detail: `${patients} of 50 connected`,
      percentage: Math.min(100, Math.round((patients / 50) * 100)),
      accent: 'var(--chart-4)',
    },
  ];

  return (
    <div className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="shrink-0">
          <h2 className="text-balance font-medium text-foreground text-lg sm:text-xl">Treatment Overview</h2>
          <p className="mt-0.5 text-pretty text-muted-foreground text-xs leading-5 sm:mt-1 sm:text-sm sm:leading-6">
            Records, plans and discharge tracking — completion insights.
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
                placeholder="Search patient, diagnosis..."
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
