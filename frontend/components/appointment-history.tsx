"use client";

import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeftIcon as ArrowLeft } from "@heroicons/react/24/outline";
import { statusBadgeClass } from "@/lib/appointment-status";
import { cn } from "@/lib/utils";

export type HistoryAppointment = {
  id: string;
  fullName: string;
  mobile: string;
  doctorId: string | null;
  doctorName: string | null;
  department: string | null;
  date: string;
  time: string;
  type: string;
  reason: string | null;
  status: string;
  bookingSource: string;
  notes: string | null;
  counter: number | null;
};

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatDate(value: string) {
  if (!value) return "—";
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : dateFmt.format(parsed);
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
      <span className="text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export function AppointmentHistoryView({
  patient,
  appointments,
  currentId,
}: {
  patient: {
    fullName: string;
    mobile: string;
    age: number | null;
    gender: string | null;
    bloodGroup: string | null;
  };
  appointments: HistoryAppointment[];
  currentId: string;
}) {
  const total = appointments.length;
  const completed = appointments.filter(
    (a) => a.status === "completed"
  ).length;
  const upcoming = appointments.filter((a) =>
    ["pending", "confirmed", "rescheduled"].includes(a.status)
  ).length;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <Link href="/doctor/appointments">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Back to appointments"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Button>
          </Link>
          <Avatar className="size-11">
            <AvatarFallback className="text-base">
              {initials(patient.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight">
              {patient.fullName}
              {patient.bloodGroup && (
                <Badge variant="outline" className="text-xs">
                  {patient.bloodGroup}
                </Badge>
              )}
            </h1>
            <p className="truncate text-sm text-muted-foreground">
              {[patient.gender, patient.age ? `${patient.age} yrs` : null]
                .filter(Boolean)
                .join(" · ")}{" "}
              · {patient.mobile}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Visits" value={total} />
        <StatCard label="Completed" value={completed} />
        <StatCard label="Upcoming" value={upcoming} />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <h2 className="border-b border-border bg-muted/40 px-4 py-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Appointment History
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reason / Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.length ? (
              appointments.map((a) => {
                const isCurrent = a.id === currentId;
                return (
                  <TableRow
                    key={a.id}
                    data-current={isCurrent || undefined}
                    className={isCurrent ? "bg-primary/5" : undefined}
                  >
                    <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">
                      {formatDate(a.date)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {a.time}
                    </TableCell>
                    <TableCell className="font-medium">
                      {a.doctorName ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.department ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={a.type === "video" ? "outline" : "secondary"}
                        className="text-xs"
                      >
                        {a.type === "video" ? "Video" : "In-person"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          className={cn(
                            "border-transparent text-white text-xs capitalize",
                            statusBadgeClass(a.status)
                          )}
                        >
                          {a.status.replace("_", " ")}
                        </Badge>
                        {isCurrent && (
                          <Badge
                            variant="outline"
                            className="border-primary text-primary text-xs"
                          >
                            Current
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-52 truncate text-muted-foreground">
                      {a.reason || a.notes || "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-20 text-center text-muted-foreground"
                >
                  No appointments found for this patient.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}