"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import CalendarBlock, { type Week } from "@/components/blocks/calendar-2";

interface RecentAppointmentsCardProps {
  /** Weekly agenda rendered in place of the old appointments table. */
  weekCalendar: Week;
  loading?: boolean;
}

export function RecentAppointmentsCard({
  weekCalendar,
  loading,
}: RecentAppointmentsCardProps) {
  return (
    <Card className="rounded-[20px] border border-border bg-white shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight text-[#0f172a]">
            This Week&apos;s Appointments
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Appointments grouped by day
          </p>
        </div>
        <Link
          href="/clinic/appointments"
          className="inline-flex h-8 items-center justify-center gap-1 rounded-full border border-border bg-white px-4 text-xs font-medium text-[#0f172a] shadow-sm transition-colors hover:bg-muted/50"
        >
          View all
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-3 px-6 pb-6">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : (
          <CalendarBlock embedded weeks={[weekCalendar]} todayWeek={0} />
        )}
      </CardContent>
    </Card>
  );
}
