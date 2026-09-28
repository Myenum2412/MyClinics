'use client';

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import * as React from 'react';
import { MetricStatGrid, type MetricStatItem } from '@/components/metric-stat-cards';

export type PharmacyStatItem = {
  name: string;
  percentage: number;
  current: number | string;
  allowed: number | string;
  allowedLabel: string;
  fill: string;
};

export function PharmacyStats({
  title,
  subtitle,
  action,
  items,
  searchTerm,
  onSearchChange,
  searchPlaceholder,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  items: PharmacyStatItem[];
  searchTerm?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
}) {
  const metrics: MetricStatItem[] = items.map((item) => ({
    name: item.name,
    value: item.current,
    detail: `${String(item.current)} of ${String(item.allowed)} ${item.allowedLabel}`,
    percentage: item.percentage,
    accent: item.fill,
  }));

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="shrink-0">
          <h2 className="text-balance font-medium text-foreground text-xl">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-pretty text-muted-foreground text-sm leading-6">{subtitle}</p>
          )}
        </div>
        {onSearchChange !== undefined && (
          <div className="flex-1 flex justify-center px-4">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={searchTerm ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder ?? 'Search...'}
                className="h-9 w-full pl-9"
              />
            </div>
          </div>
        )}
        {action && <div className="shrink-0 flex gap-2">{action}</div>}
      </div>
      <div className="mt-6">
        <MetricStatGrid items={metrics} />
      </div>
    </div>
  );
}
