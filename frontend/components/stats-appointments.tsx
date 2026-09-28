'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import type { Appointment } from '@/lib/clinic-api';
import { todayISO } from '@/lib/datetime';
import { MetricStatGrid } from '@/components/metric-stat-cards';

export default function StatsAppointments({
  appointments,
  action,
  searchTerm,
  onSearchChange,
  stats,
}: {
  appointments: Appointment[];
  action?: React.ReactNode;
  searchTerm?: string;
  onSearchChange?: (v: string) => void;
  stats?: { total: number; today: number; completed: number; scheduled: number };
}) {
  const todayStr = todayISO();
  const totalCount = stats?.total ?? appointments.length;
  const todayCount = stats?.today ?? appointments.filter((a) => a.date === todayStr).length;
  const completedCount =
    stats?.completed ?? appointments.filter((a) => a.status === 'completed').length;
  const scheduledCount =
    stats?.scheduled ?? appointments.filter((a) => a.status === 'scheduled').length;

  const items = [
    {
      name: 'Total Appointments',
      value: totalCount,
      detail: `${totalCount} of 100 target`,
      percentage: Math.min(100, Math.round((totalCount / 100) * 100)),
      accent: 'var(--chart-1)',
    },
    {
      name: 'Appointments Today',
      value: todayCount,
      detail: `${todayCount} of 10 target`,
      percentage: Math.min(100, Math.round((todayCount / 10) * 100)),
      accent: 'var(--chart-2)',
    },
    {
      name: 'Active Scheduled',
      value: scheduledCount,
      detail: `${scheduledCount} of 50 target`,
      percentage: Math.min(100, Math.round((scheduledCount / 50) * 100)),
      accent: 'var(--chart-3)',
    },
    {
      name: 'Completed Visited',
      value: completedCount,
      detail: `${completedCount} of ${totalCount} total booked`,
      percentage: totalCount ? Math.round((completedCount / totalCount) * 100) : 0,
      accent: 'var(--chart-4)',
    },
  ];

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="shrink-0">
          <h2 className="text-balance font-medium text-foreground text-xl">
            Appointment Analytics
          </h2>
          <p className="mt-1 text-pretty text-muted-foreground text-sm leading-6">
            Visit schedule, status trends, and completion insights.
          </p>
        </div>
        {onSearchChange !== undefined && (
          <div className="flex-1 flex justify-center px-4">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchTerm ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search appointments..."
                className="h-9 w-full pl-9"
              />
            </div>
          </div>
        )}
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-6">
        <MetricStatGrid items={items} />
      </div>
    </div>
  );
}
