'use client';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type StatsItem, capacityOf } from '@/lib/stats';

function Ring({ capacity }: { capacity: number }) {
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arc = circumference * 0.75;
  const trackGap = circumference - arc;
  const value = (arc * Math.min(Math.max(capacity, 0), 100)) / 100;
  const center = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90"
      aria-hidden="true"
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={`${arc} ${trackGap}`}
        strokeLinecap="round"
        className="text-muted"
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={`${value} ${circumference - value}`}
        strokeLinecap="round"
        className="text-primary"
      />
    </svg>
  );
}

export default function Stats07({
  items,
  title,
  description,
  className,
}: {
  items: StatsItem[];
  title?: string;
  description?: string;
  className?: string;
}) {
  const data = items.map((item) => ({
    ...item,
    capacity: capacityOf(item.current, item.allowed),
  }));

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      {title && <h2 className="text-balance text-lg font-semibold tracking-tight">{title}</h2>}
      {description && (
        <p className="mt-1 text-pretty text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      )}
      <dl
        className={cn(
          'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4',
          (title || description) && 'mt-4'
        )}
      >
        {data.map((item) => (
          <Card className="p-4 shadow-none" key={item.name}>
            <CardContent className="flex items-center space-x-4 p-0">
              <div className="relative flex items-center justify-center">
                <Ring capacity={item.capacity} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-medium text-base text-foreground">
                    {item.capacity}%
                  </span>
                </div>
              </div>
              <div>
                <dt className="font-medium text-foreground text-sm">{item.name}</dt>
                <dd className="text-muted-foreground text-sm">
                  {item.current} of {item.allowed} used
                </dd>
              </div>
            </CardContent>
          </Card>
        ))}
      </dl>
    </div>
  );
}