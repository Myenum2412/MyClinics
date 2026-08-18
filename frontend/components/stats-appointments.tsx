'use client';

import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { type ChartConfig, ChartContainer } from '@/components/ui/chart';
import type { Appointment } from '@/lib/clinic-api';

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

export default function StatsAppointments({
  appointments,
}: {
  appointments: Appointment[];
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
      <h2 className="text-balance font-medium text-foreground text-xl">
        Appointment Analytics
      </h2>
      <p className="mt-1 text-pretty text-muted-foreground text-sm leading-6">
        Real-time insights on clinic visits, today's schedule, and completion progress.
      </p>
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
