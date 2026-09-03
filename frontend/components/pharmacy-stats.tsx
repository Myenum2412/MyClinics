'use client';
import { Card, CardContent } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts';
import * as React from 'react';

export type PharmacyStatItem = { name: string; percentage: number; current: number|string; allowed: number|string; allowedLabel: string; fill: string };
export function PharmacyStats({ title, subtitle, action, items }: { title: string; subtitle?: string; action?: React.ReactNode; items: PharmacyStatItem[] }) {
  return (
    <Card className="p-4 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="font-medium text-foreground text-sm">{title}</h2>
          {subtitle && <p className="text-muted-foreground text-xs mt-1">{subtitle}</p>}
        </div>
        {action && <div className="flex gap-2">{action}</div>}
      </div>
      <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <Card className="p-4 shadow-2xs" key={item.name}>
            <CardContent className="flex items-center space-x-4 p-0">
              <div className="relative flex items-center justify-center">
                <ChartContainer className="h-[80px] w-[80px]" config={{ capacity: { label: item.name, color: item.fill } }}>
                  <RadialBarChart barSize={6} data={[{ name: item.name, capacity: item.percentage }]} endAngle={-270} innerRadius={30} outerRadius={60} startAngle={90}>
                    <PolarAngleAxis angleAxisId={0} axisLine={false} domain={[0, 100]} tick={false} type="number" />
                    <RadialBar angleAxisId={0} background cornerRadius={10} dataKey="capacity" fill={item.fill} />
                  </RadialBarChart>
                </ChartContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-medium text-base text-foreground">{item.percentage}%</span>
                </div>
              </div>
              <div>
                <dt className="font-medium text-foreground text-sm">{item.name}</dt>
                <dd className="text-muted-foreground text-sm">{String(item.current)} of {String(item.allowed)} {item.allowedLabel}</dd>
              </div>
            </CardContent>
          </Card>
        ))}
      </dl>
    </Card>
  );
}
