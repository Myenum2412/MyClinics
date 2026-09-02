'use client';

import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { type ChartConfig, ChartContainer } from '@/components/ui/chart';

const chartConfig = {
  capacity: {
    label: 'Capacity',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export default function StatsTreatment({ records, plans, discharges, patients }: { records: number; plans: number; discharges: number; patients: number }) {
  const data = [
    { name: 'Treatment Records', capacity: Math.min(100, records * 10), current: records, allowed: 20, fill: 'var(--chart-1)' },
    { name: 'Treatment Plans', capacity: Math.min(100, plans * 10), current: plans, allowed: 20, fill: 'var(--chart-2)' },
    { name: 'Discharges', capacity: Math.min(100, discharges * 10), current: discharges, allowed: 20, fill: 'var(--chart-3)' },
    { name: 'Patients', capacity: Math.min(100, patients * 5), current: patients, allowed: 50, fill: 'var(--chart-4)' },
  ];
  return (
    <div className="flex w-full items-center justify-center p-6">
      <div className="w-full">
        <h2 className="text-balance font-medium text-foreground text-xl">
          Treatment Overview
        </h2>
        <p className="mt-1 text-pretty text-muted-foreground text-sm leading-6">
          Records, plans and discharge tracking — completion insights.
        </p>
        <dl className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {data.map((item) => (
            <Card className="p-4 shadow-2xs" key={item.name}>
              <CardContent className="flex items-center space-x-4 p-0">
                <div className="relative flex items-center justify-center">
                  <ChartContainer
                    className="h-[80px] w-[80px]"
                    config={chartConfig}
                  >
                    <RadialBarChart
                      barSize={6}
                      data={[item]}
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
                        fill="var(--primary)"
                      />
                    </RadialBarChart>
                  </ChartContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-medium text-base text-foreground">
                      {item.capacity}%
                    </span>
                  </div>
                </div>
                <div>
                  <dt className="font-medium text-foreground text-sm">
                    {item.name}
                  </dt>
                  <dd className="text-muted-foreground text-sm">
                    {item.current} of {item.allowed} used
                  </dd>
                </div>
              </CardContent>
            </Card>
          ))}
        </dl>
      </div>
    </div>
  );
}
