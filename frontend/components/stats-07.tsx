'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type { Prescription, Patient } from '@/lib/clinic-api';
import { todayISO } from '@/lib/datetime';
import { MetricStatGrid } from '@/components/metric-stat-cards';

export default function Stats07({
  prescriptions,
  patients,
  action,
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Search prescription, patient, doctor...',
  stats,
}: {
  prescriptions: Prescription[];
  patients: Patient[];
  action?: React.ReactNode;
  searchTerm?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  /** Clinic-wide counts from the server — pass these once `prescriptions` only holds one page. */
  stats?: { total: number; today: number };
}) {
  const todayStr = todayISO();
  const totalCount = stats?.total ?? prescriptions.length;
  const todayCount = stats?.today ?? prescriptions.filter((p) => p.visitDate === todayStr).length;

  const totalMedicines = prescriptions.reduce((acc, p) => acc + (p.medicines?.length || 0), 0);
  const avgMedicines = prescriptions.length ? (totalMedicines / prescriptions.length) : 0;

  const totalPatients = patients.length;
  const mobilePatients = patients.filter((p) => p.mobile).length;
  const mobileCoverage = totalPatients ? Math.round((mobilePatients / totalPatients) * 100) : 0;

  const items = [
    {
      name: 'Total Prescriptions',
      value: totalCount,
      detail: `${totalCount} of 100 target`,
      percentage: Math.min(100, Math.round((totalCount / 100) * 100)),
      accent: 'var(--chart-1)',
    },
    {
      name: 'Prescriptions Today',
      value: todayCount,
      detail: `${todayCount} of 10 target`,
      percentage: Math.min(100, Math.round((todayCount / 10) * 100)),
      accent: 'var(--chart-2)',
    },
    {
      name: 'Avg Medicines',
      value: Number(avgMedicines.toFixed(1)),
      detail: `${Number(avgMedicines.toFixed(1))} of 5 target max`,
      percentage: Math.min(100, Math.round((avgMedicines / 5) * 100)),
      accent: 'var(--chart-3)',
    },
    {
      name: 'Patient Mobile Coverage',
      value: mobilePatients,
      detail: `${mobilePatients} of ${totalPatients} active patients`,
      percentage: mobileCoverage,
      accent: 'var(--chart-4)',
    },
  ];

  return (
    <div className="w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="shrink-0">
          <h2 className="text-balance font-medium text-foreground text-lg sm:text-xl">
            Prescription Analytics
          </h2>
          <p className="mt-0.5 text-pretty text-muted-foreground text-xs leading-5 sm:mt-1 sm:text-sm sm:leading-6">
            Issued prescriptions, medication averages, and patient reach insights.
          </p>
        </div>
        {onSearchChange !== undefined && (
          <div className="flex-1 flex justify-center px-0 sm:px-4">
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
      <div className="mt-4 sm:mt-6">
        <MetricStatGrid items={items} />
      </div>
    </div>
  );
}
