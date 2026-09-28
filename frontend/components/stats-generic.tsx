'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { MetricStatGrid, type MetricStatItem } from '@/components/metric-stat-cards';

export interface StatItem {
  name: string;
  percentage: number;
  current: string | number;
  allowed: string | number;
  allowedLabel: string;
  fill: string;
}

function toMetricItems(items: StatItem[]): MetricStatItem[] {
  return items.map((item) => ({
    name: item.name,
    value: item.current,
    detail: `${item.current} of ${item.allowed} ${item.allowedLabel}`,
    percentage: item.percentage,
    accent: item.fill,
  }));
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="shrink-0">
          <h2 className="text-balance font-medium text-foreground text-lg sm:text-xl">
            {title}
          </h2>
          <p className="mt-0.5 text-pretty text-muted-foreground text-xs leading-5 sm:mt-1 sm:text-sm sm:leading-6">
            {description}
          </p>
        </div>
        {onSearchChange !== undefined && (
          <div className="flex-1 flex justify-center px-0 sm:px-4">
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
      <div className="mt-4 sm:mt-6">
        <MetricStatGrid items={toMetricItems(items)} />
      </div>
    </div>
  );
}
