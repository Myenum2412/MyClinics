'use client';
import { Card, CardContent } from '@/components/ui/card';
import { ChartContainer } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts';
import * as React from 'react';

export type PharmacyStatItem = { name: string; percentage: number; current: number|string; allowed: number|string; allowedLabel: string; fill: string };
export function PharmacyStats({ title, subtitle, action, items, searchTerm, onSearchChange, searchPlaceholder }: { title: string; subtitle?: string; action?: React.ReactNode; items: PharmacyStatItem[]; searchTerm?: string; onSearchChange?: (v: string)=>void; searchPlaceholder?: string }) {
  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="shrink-0">
          <h2 className="text-balance font-medium text-foreground text-xl">{title}</h2>
          {subtitle && <p className="mt-1 text-pretty text-muted-foreground text-sm leading-6">{subtitle}</p>}
        </div>
        {onSearchChange !== undefined && (
          <div className="flex-1 flex justify-center px-4">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="search" value={searchTerm ?? ""} onChange={(e)=>onSearchChange(e.target.value)} placeholder={searchPlaceholder ?? "Search..."} className="h-9 w-full pl-9" />
            </div>
          </div>
        )}
        {action && <div className="shrink-0 flex gap-2">{action}</div>}
      </div>
      <dl className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <Card className="p-4 shadow-sm bg-card" key={item.name}>
            <CardContent className="flex items-center space-x-4 p-0">
              <div className="relative flex items-center justify-center">
                <ChartContainer className="h-[80px] w-[80px]" config={{ capacity: { label: item.name, color: item.fill } }}>
                  <RadialBarChart barSize={6} data={[{ name: item.name, capacity: item.percentage }]} endAngle={-270} innerRadius={30} outerRadius={60} startAngle={90}>
                    <PolarAngleAxis angleAxisId={0} axisLine={false} domain={[0, 100]} tick={false} type="number" />
                    <RadialBar angleAxisId={0} background cornerRadius={10} dataKey="capacity" fill={item.fill} />
                  </RadialBarChart>
                </ChartContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-semibold text-xs text-foreground">{item.percentage}%</span>
                </div>
              </div>
              <div>
                <dt className="font-semibold text-foreground text-sm tracking-tight leading-none mb-1">{item.name}</dt>
                <dd className="text-muted-foreground text-xs">{String(item.current)} of {String(item.allowed)} {item.allowedLabel}</dd>
              </div>
            </CardContent>
          </Card>
        ))}
      </dl>
    </div>
  );
}
