"use client";

import {
  CalendarDaysIcon as CalendarDays,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { todayDateString } from "@/lib/stats";

export type TimelineAppointment = {
  id: string;
  date: string;
  status: string;
};

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

function formatDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? date
    : dateFmt.format(parsed);
}

export function AppointmentTimeline({
  appointments,
  selectedDate,
  onSelect,
}: {
  appointments: TimelineAppointment[];
  selectedDate: string | null;
  onSelect: (date: string | null) => void;
}) {
  const byDate = new Map<string, TimelineAppointment[]>();
  for (const a of appointments) {
    const list = byDate.get(a.date) ?? [];
    list.push(a);
    byDate.set(a.date, list);
  }
  const dates = [...byDate.keys()].sort().reverse();
  const today = todayDateString();

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 lg:sticky lg:top-4 lg:self-start">
      <div className="flex items-center gap-2">
        <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Timeline
        </h2>
      </div>

      <div className="flex flex-col gap-1 pl-1">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn(
            "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
            selectedDate === null
              ? "border-primary bg-primary/5 font-medium text-foreground"
              : "border-transparent hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <span>All Dates</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
              selectedDate === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {appointments.length}
          </span>
        </button>

        <div className="border-l border-border pl-3 ml-2 flex flex-col gap-3 pt-2">
          {dates.map((date) => {
            const list = byDate.get(date) ?? [];
            const active = list.filter((a) =>
              ["confirmed", "pending"].includes(a.status)
            ).length;
            const completed = list.filter((a) => a.status === "completed").length;
            const isSelected = selectedDate === date;
            const isToday = date === today;
            return (
              <div key={date} className="relative flex flex-col gap-1">
                <span
                  className={cn(
                    "absolute -left-[13.5px] top-1.5 size-2.5 rounded-full ring-2 ring-card",
                    isToday ? "bg-primary" : "bg-border"
                  )}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  onClick={() => onSelect(isSelected ? null : date)}
                  className={cn(
                    "flex flex-col gap-1 rounded-lg border px-3 py-2 text-left transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:bg-muted/50"
                  )}
                >
                  <span className="flex items-center justify-between gap-2 text-sm">
                    <span
                      className={cn(
                        "font-medium",
                        isSelected ? "text-foreground" : "text-foreground/90"
                      )}
                    >
                      {isToday ? "Today" : formatDate(date)}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {list.length}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                    {active > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-amber-500" />
                        {active} active
                      </span>
                    )}
                    {completed > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        {completed} done
                      </span>
                    )}
                    {list.length === 0 && <span>No appointments</span>}
                  </span>
                </button>
              </div>
            );
          })}
          {dates.length === 0 && (
            <p className="py-2 text-sm text-muted-foreground">
              No appointment dates yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}