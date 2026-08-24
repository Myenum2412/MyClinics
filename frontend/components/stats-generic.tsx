'use client';

import * as React from 'react';
import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { type ChartConfig, ChartContainer } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const chartConfig = {
  capacity: {
    label: 'Capacity',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export interface StatItem {
  name: string;
  percentage: number;
  current: string | number;
  allowed: string | number;
  allowedLabel: string;
  fill: string;
}

export default function StatsGeneric({
  title,
  description,
  items,
  action,
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Search...',
}: {
  title: string;
  description: string;
  items: StatItem[];
  action?: React.ReactNode;
  searchTerm?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
}) {
  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="shrink-0">
          <h2 className="text-balance font-medium text-foreground text-xl">
            {title}
          </h2>
          <p className="mt-1 text-pretty text-muted-foreground text-sm leading-6">
            {description}
          </p>
        </div>
        {onSearchChange !== undefined && (
          <div className="flex-1 flex justify-center px-4">
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
      <dl className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
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
                  <span className="font-semibold text-xs text-foreground">
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

