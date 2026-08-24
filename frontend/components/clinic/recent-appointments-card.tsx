"use client";

import Link from "next/link";
import { Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PersonAvatar } from "@/components/clinic/person-avatar";
import { formatDate, formatTime } from "@/lib/format-time";
import type { Appointment, Patient, Doctor } from "@/lib/clinic-api";

interface RecentAppointmentsCardProps {
  appointments: Appointment[];
  patients: Patient[];
  doctors?: Doctor[];
  clinicId: string;
  loading?: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function statusConfig(status: string): { label: string; className: string } {
  switch (status) {
    case "completed":
      return { label: "Completed", className: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50" };
    case "scheduled":
      return { label: "Confirmed", className: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-50" };
    case "cancelled":
      return { label: "Cancelled", className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-50" };
    case "no_show":
      return { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50" };
    default:
      return { label: status, className: "bg-slate-50 text-slate-700 border-slate-200" };
  }
}

export function RecentAppointmentsCard({
  appointments,
  patients,
  doctors = [],
  clinicId,
  loading,
}: RecentAppointmentsCardProps) {
  const patientById = new Map(patients.map((p) => [p.patientId, p]));
  const doctorById = new Map(doctors.map((d) => [d.doctorId, d]));

  const recent = [...appointments]
    .sort((a, b) => {
      if (a.date === b.date) return b.time.localeCompare(a.time);
      return b.date.localeCompare(a.date);
    })
    .slice(0, 5);

  if (loading) {
    return (
      <Card className="rounded-[20px] border border-border bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-56 animate-pulse rounded bg-muted/60" />
          </div>
          <div className="h-7 w-20 animate-pulse rounded bg-muted" />
        </div>
        <div className="px-6 pb-6 space-y-3">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-[20px] border border-border bg-white shadow-sm overflow-hidden">
      {/* Header - minimal, no icons */}
      <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight text-[#0f172a]">Recent Appointments</h3>
          <p className="mt-1 text-xs text-muted-foreground">Latest appointments across all doctors</p>
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
        {recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-slate-50 border border-border">
              <Calendar className="size-6 text-muted-foreground" />
            </div>
            <h4 className="mt-4 text-sm font-semibold text-[#0f172a]">No recent appointments</h4>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Appointments will appear here once they are scheduled.
            </p>
            <Link href="/clinic/appointments" className="mt-5">
              <Button size="sm" className="h-8 rounded-full px-4 text-xs">
                Schedule Appointment
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border bg-white hover:bg-white">
                    <TableHead className="px-6 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Patient
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Doctor
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Reason
                    </TableHead>
                    <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Date &amp; Time
                    </TableHead>
                    <TableHead className="px-6 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((appt) => {
                    const patient = patientById.get(appt.patientId);
                    const doctor = doctorById.get(appt.doctorId);
                    const initials = patient ? getInitials(patient.fullName) : "AM";
                    const patientName = patient?.fullName ?? "Unknown Patient";
                    const shortId = patient ? patient.patientId.slice(-6).toUpperCase() : appt.patientId.slice(-6).toUpperCase();
                    const doctorName = doctor?.name ?? (appt.doctorId ? `Dr. ${appt.doctorId.slice(-4)}` : "Dr. Myenum");
                    const cfg = statusConfig(appt.status);
                    return (
                      <TableRow
                        key={appt.appointmentId}
                        className="border-b border-border/60 last:border-0 hover:bg-slate-50/70 transition-colors group cursor-pointer"
                        onClick={() => (window.location.href = "/clinic/appointments")}
                      >
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700">
                              {patient ? (
                                <PersonAvatar
                                  clinicId={clinicId}
                                  ownerType="patient"
                                  ownerId={appt.patientId}
                                  name={patientName}
                                  className="size-9"
                                />
                              ) : (
                                initials
                              )}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href="/clinic/patients"
                                onClick={(e) => e.stopPropagation()}
                                className="block text-sm font-semibold leading-tight text-[#0f172a] hover:text-indigo-600 transition-colors"
                              >
                                {patientName}
                              </Link>
                              <p className="text-[11px] font-medium text-muted-foreground">ID: {shortId}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="text-sm font-medium text-[#0f172a]">{doctorName}</span>
                        </TableCell>
                        <TableCell className="py-4 max-w-[160px]">
                          <span className="text-sm text-muted-foreground truncate block">{appt.reason || "General Consultation"}</span>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-[#0f172a]">{formatDate(appt.date)}</span>
                            <span className="text-xs text-muted-foreground">{formatTime(appt.time)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-xs font-medium border ${cfg.className}`}>
                            {cfg.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden px-4 pb-4 space-y-3">
              {recent.map((appt) => {
                const patient = patientById.get(appt.patientId);
                const doctor = doctorById.get(appt.doctorId);
                const patientName = patient?.fullName ?? "Unknown Patient";
                const shortId = patient ? patient.patientId.slice(-6).toUpperCase() : appt.patientId.slice(-6).toUpperCase();
                const doctorName = doctor?.name ?? "Dr. Myenum";
                const cfg = statusConfig(appt.status);
                return (
                  <div
                    key={appt.appointmentId}
                    className="rounded-xl border border-border bg-white p-4 shadow-sm hover:shadow transition-shadow"
                    onClick={() => (window.location.href = "/clinic/appointments")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 border border-indigo-100">
                          <PersonAvatar clinicId={clinicId} ownerType="patient" ownerId={appt.patientId} name={patientName} className="size-9" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#0f172a] truncate">{patientName}</p>
                          <p className="text-xs text-muted-foreground">ID: {shortId} · {doctorName}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`shrink-0 rounded-full border text-xs ${cfg.className}`}>
                        {cfg.label}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">{appt.reason || "General Consultation"}</p>
                        <p className="mt-1 text-xs font-medium text-[#0f172a]">
                          {formatDate(appt.date)} <span className="text-muted-foreground font-normal">· {formatTime(appt.time)}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
