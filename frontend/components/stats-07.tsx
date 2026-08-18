'use client';

import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { type ChartConfig, ChartContainer } from '@/components/ui/chart';
import type { Prescription, Patient } from '@/lib/clinic-api';

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

export default function Stats07({
  prescriptions,
  patients,
  action,
}: {
  prescriptions: Prescription[];
  patients: Patient[];
  action?: React.ReactNode;
}) {
  const totalCount = prescriptions.length;
  
  // Calculate today's prescriptions
  const todayStr = getTodayString();
  const todayCount = prescriptions.filter((p) => p.visitDate === todayStr).length;

  // Calculate average medicines
  const totalMedicines = prescriptions.reduce((acc, p) => acc + (p.medicines?.length || 0), 0);
  const avgMedicines = totalCount ? (totalMedicines / totalCount) : 0;

  // Calculate patient mobile coverage
  const totalPatients = patients.length;
  const mobilePatients = patients.filter((p) => p.mobile).length;
  const mobileCoverage = totalPatients ? Math.round((mobilePatients / totalPatients) * 100) : 0;

  // Prepare data for the cards
  const data = [
    {
      name: 'Total Prescriptions',
      percentage: Math.min(100, Math.round((totalCount / 100) * 100)), // Monthly target 100
      current: totalCount,
      allowed: 100,
      allowedLabel: 'target',
      fill: 'var(--chart-1)',
    },
    {
      name: 'Prescriptions Today',
      percentage: Math.min(100, Math.round((todayCount / 10) * 100)), // Daily target 10
      current: todayCount,
      allowed: 10,
      allowedLabel: 'target',
      fill: 'var(--chart-2)',
    },
    {
      name: 'Avg Medicines',
      percentage: Math.min(100, Math.round((avgMedicines / 5) * 100)), // Target 5 medicines
      current: Number(avgMedicines.toFixed(1)),
      allowed: 5,
      allowedLabel: 'target max',
      fill: 'var(--chart-3)',
    },
    {
      name: 'Patient Mobile Coverage',
      percentage: mobileCoverage,
      current: mobilePatients,
      allowed: totalPatients,
      allowedLabel: 'active patients',
      fill: 'var(--chart-4)',
    },
  ];

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-balance font-medium text-foreground text-xl">
            Prescription Metrics
          </h2>
          <p className="mt-1 text-pretty text-muted-foreground text-sm leading-6">
            Real-time insights on issued prescriptions and notification delivery readiness.
          </p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <dl className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((item) => (
          <Card className="p-4 shadow-sm" key={item.name}>
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
                  <span className="font-medium text-base text-foreground">
                    {item.percentage}%
                  </span>
                </div>
              </div>
              <div>
                <dt className="font-medium text-foreground text-sm">
                  {item.name}
                </dt>
                <dd className="text-muted-foreground text-sm">
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
