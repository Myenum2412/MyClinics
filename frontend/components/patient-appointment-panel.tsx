"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AppointmentTimeline } from "@/components/appointment-timeline";
import { todayDateString } from "@/lib/stats";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateFmt.format(parsed);
}

const appointmentStatusVariant: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "secondary",
  confirmed: "default",
  completed: "outline",
  cancelled: "destructive",
  rescheduled: "outline",
  no_show: "destructive",
};

export type AppointmentRecord = {
  id: string;
  date: string;
  time: string;
  type: string;
  status: string;
  doctorName: string | null;
  doctorId: string | null;
  department: string | null;
  reason: string | null;
  notes: string | null;
  counter: number | null;
};

export function PatientAppointmentPanel({
  appointments,
}: {
  appointments: AppointmentRecord[];
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    const today = todayDateString();
    return appointments.some((a) => a.date === today) ? today : null;
  });

  const visible = selectedDate
    ? appointments.filter((a) => a.date === selectedDate)
    : appointments;

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <AppointmentTimeline
        appointments={appointments}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
      />

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Appointments ({appointments.length})
        </h2>
        {visible.length ? (
          <div className="flex flex-col gap-2">
            {visible.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {formatDate(a.date)} · {a.time}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.doctorName ?? "—"} ·{" "}
                    {a.type === "video" ? "Video" : "In-person"}
                  </p>
                </div>
                <Badge
                  variant={appointmentStatusVariant[a.status] ?? "secondary"}
                  className="text-xs capitalize"
                >
                  {a.status}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No appointments.</p>
        )}
      </div>
    </div>
  );
}