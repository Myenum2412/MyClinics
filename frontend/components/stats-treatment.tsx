'use client';

import { Search } from 'lucide-react';
import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { type ChartConfig, ChartContainer } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';

const chartConfig = {
  capacity: {
    label: 'Capacity',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export default function StatsTreatment({ records, plans, discharges, patients, searchTerm, onSearchChange, action }: { records: number; plans: number; discharges: number; patients: number; searchTerm?: string; onSearchChange?: (v: string) => void; action?: React.ReactNode }) {
  const data = [
    { name: 'Total Records', percentage: Math.min(100, Math.round((records / 20) * 100)), current: records, allowed: 20, allowedLabel: 'target', fill: 'var(--chart-1)' },
    { name: 'Treatment Plans', percentage: Math.min(100, Math.round((plans / 20) * 100)), current: plans, allowed: 20, allowedLabel: 'target', fill: 'var(--chart-2)' },
    { name: 'Discharges', percentage: Math.min(100, Math.round((discharges / 20) * 100)), current: discharges, allowed: 20, allowedLabel: 'target', fill: 'var(--chart-3)' },
    { name: 'Total Patients', percentage: Math.min(100, Math.round((patients / 50) * 100)), current: patients, allowed: 50, allowedLabel: 'connected', fill: 'var(--chart-4)' },
  ];
  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="shrink-0">
          <h2 className="text-balance font-medium text-foreground text-xl">Treatment Overview</h2>
          <p className="mt-1 text-pretty text-muted-foreground text-sm leading-6">Records, plans and discharge tracking — completion insights.</p>
        </div>
        {onSearchChange !== undefined && (
          <div className="flex-1 flex justify-center px-4">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="search" value={searchTerm ?? ""} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search patient, diagnosis..." className="h-9 w-full pl-9" />
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
                  <ChartContainer className="h-[80px] w-[80px]" config={chartConfig}>
                    <RadialBarChart barSize={6} data={[{ name: item.name, capacity: item.percentage }]} endAngle={-270} innerRadius={30} outerRadius={60} startAngle={90}>
                      <PolarAngleAxis angleAxisId={0} axisLine={false} domain={[0, 100]} tick={false} type="number" />
                      <RadialBar angleAxisId={0} background cornerRadius={10} dataKey="capacity" fill={item.fill} />
                    </RadialBarChart>
                  </ChartContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-medium text-xs text-foreground font-semibold">{item.percentage}%</span>
                  </div>
                </div>
                <div>
                  <dt className="font-semibold text-foreground text-sm tracking-tight leading-none mb-1">{item.name}</dt>
                  <dd className="text-muted-foreground text-xs">{item.current} of {item.allowed} {item.allowedLabel}</dd>
                </div>
              </CardContent>
            </Card>
          ))}
        </dl>
    </div>
  );
}
