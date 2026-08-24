'use client';

import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { type ChartConfig, ChartContainer } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Appointment, AppointmentStatus } from '@/lib/clinic-api';

const chartConfig = {
  capacity: {
    label: 'Capacity',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

const STATUSES: AppointmentStatus[] = ["scheduled", "completed", "cancelled", "no_show"];
const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

export default function StatsAppointments({
  appointments,
  action,
  searchTerm,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  statusFilter,
  onStatusFilterChange,
}: {
  appointments: Appointment[];
  action?: React.ReactNode;
  searchTerm?: string;
  onSearchChange?: (v: string) => void;
  dateFilter?: string;
  onDateFilterChange?: (v: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (v: string) => void;
}) {
  const totalCount = appointments.length;

  // Calculate today's appointments
  const todayStr = getTodayString();
  const todayCount = appointments.filter((a) => a.date === todayStr).length;

  // Calculate completed appointments
  const completedCount = appointments.filter((a) => a.status === 'completed').length;

  // Calculate active scheduled appointments
  const scheduledCount = appointments.filter((a) => a.status === 'scheduled').length;

  // Prepare data for the cards
  const data = [
    {
      name: 'Total Appointments',
      percentage: Math.min(100, Math.round((totalCount / 100) * 100)), // Monthly target 100
      current: totalCount,
      allowed: 100,
      allowedLabel: 'target',
      fill: 'var(--chart-1)',
    },
    {
      name: 'Appointments Today',
      percentage: Math.min(100, Math.round((todayCount / 10) * 100)), // Daily target 10
      current: todayCount,
      allowed: 10,
      allowedLabel: 'target',
      fill: 'var(--chart-2)',
    },
    {
      name: 'Active Scheduled',
      percentage: Math.min(100, Math.round((scheduledCount / 50) * 100)), // Target 50 active
      current: scheduledCount,
      allowed: 50,
      allowedLabel: 'target',
      fill: 'var(--chart-3)',
    },
    {
      name: 'Completed Visited',
      percentage: totalCount ? Math.round((completedCount / totalCount) * 100) : 0,
      current: completedCount,
      allowed: totalCount,
      allowedLabel: 'total booked',
      fill: 'var(--chart-4)',
    },
  ];

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-balance font-medium text-foreground text-xl">
            Appointment Analytics
          </h2>
          <p className="mt-1 text-pretty text-muted-foreground text-sm leading-6">
            Visit and completion insights.
          </p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {(onSearchChange !== undefined || onDateFilterChange !== undefined || onStatusFilterChange !== undefined) && (
        <div className="mt-6 flex justify-center">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center w-full max-w-2xl">
            {onSearchChange !== undefined && (
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={searchTerm ?? ""}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search name, doctor, reason..."
                  className="h-9 w-full pl-9"
                />
              </div>
            )}
            {onDateFilterChange !== undefined && (
              <Input
                type="date"
                value={dateFilter ?? ""}
                onChange={(e) => onDateFilterChange(e.target.value)}
                className="h-9 w-36"
              />
            )}
            {onStatusFilterChange !== undefined && (
              <Select value={statusFilter ?? "all"} onValueChange={(v) => onStatusFilterChange(v ?? "all")}>
                <SelectTrigger className="h-9 w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      )}
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
                  <span className="font-medium text-xs text-foreground font-semibold">
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
