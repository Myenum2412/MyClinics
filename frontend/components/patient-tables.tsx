import {
  BeakerIcon as Pill,
  IdentificationIcon as Stethoscope,
} from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
import { DashboardTableCard } from "@/components/patient-dashboard-table";
import type { Appointment } from "@/components/appointments-table";
import type { Bill } from "@/components/billing-table";
import type { Prescription } from "@/components/prescriptions-table";
import type { ReportFile } from "@/lib/report-folders";
import type { PatientDoctor } from "@/lib/patient";
import { statusBadgeClass } from "@/lib/appointment-status";
import { formatINR } from "@/lib/billing";
import { categoryLabel } from "@/lib/report-folders";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

function formatDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateFmt.format(parsed);
}

function formatOptionalDate(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateFmt.format(parsed);
}

const billStatusClass: Record<string, string> = {
  paid: "bg-green-600",
  pending: "bg-amber-500",
  cancelled: "bg-red-600",
};

type CardProps = {
  maxRows?: number;
  title?: string;
  description?: string;
  href?: string;
  emptyMessage?: string;
};

export function AppointmentsTableCard({
  appointments,
  maxRows,
  title = "Appointments",
  description = "Your bookings at the clinic",
  href = "/patient/appointments",
  emptyMessage = "No appointments yet.",
}: CardProps & { appointments: Appointment[] }) {
  return (
    <DashboardTableCard
      title={title}
      description={description}
      href={href}
      emptyMessage={emptyMessage}
      columns={[
        { label: "Date" },
        { label: "Doctor" },
        { label: "Time" },
        { label: "Status" },
      ]}
      rows={appointments.slice(0, maxRows).map((appointment) => [
        <span key="date" className="text-muted-foreground tabular-nums">
          {formatDate(appointment.date)}
        </span>,
        <span key="doctor" className="font-medium">
          {appointment.doctorName ?? "—"}
        </span>,
        <span key="time" className="text-muted-foreground tabular-nums">
          {appointment.time}
        </span>,
        <Badge
          key="status"
          className={`border-transparent text-white text-xs ${statusBadgeClass(appointment.status)}`}
        >
          <span className="capitalize">
            {appointment.status.replace("_", " ")}
          </span>
        </Badge>,
      ])}
    />
  );
}

export function BillsTableCard({
  bills,
  maxRows,
  title = "Bills",
  description = "Your invoices at the clinic",
  href = "/patient/billing",
  emptyMessage = "No bills yet.",
}: CardProps & { bills: Bill[] }) {
  return (
    <DashboardTableCard
      title={title}
      description={description}
      href={href}
      emptyMessage={emptyMessage}
      columns={[
        { label: "Invoice" },
        { label: "Date" },
        { label: "Total" },
        { label: "Status" },
      ]}
      rows={bills.slice(0, maxRows).map((bill) => [
        <span key="number" className="font-medium tabular-nums">
          {bill.billNumber}
        </span>,
        <span key="date" className="text-muted-foreground tabular-nums">
          {formatDate(bill.date)}
        </span>,
        <span key="total" className="font-semibold tabular-nums">
          {formatINR(bill.total)}
        </span>,
        <Badge
          key="status"
          className={`border-transparent text-white text-xs ${billStatusClass[bill.status] ?? "bg-slate-500"}`}
        >
          <span className="capitalize">{bill.status}</span>
        </Badge>,
      ])}
    />
  );
}

export function MedicinesTableCard({
  prescriptions,
  maxRows,
  title = "Medicines",
  description = "Medicines prescribed to you",
  href = "/patient/medicines",
  emptyMessage = "No medicines prescribed yet.",
}: CardProps & { prescriptions: Prescription[] }) {
  const limit = maxRows ?? Number.POSITIVE_INFINITY;
  const rows: React.ReactNode[][] = [];
  const seen = new Set<string>();
  const sorted = [...prescriptions].sort((a, b) =>
    b.visitDate.localeCompare(a.visitDate)
  );
  for (const prescription of sorted) {
    for (const medicine of prescription.medicines) {
      const name = medicine.name.trim();
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());
      rows.push([
        <span key="name" className="inline-flex items-center gap-2 font-medium">
          <Pill className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate">{medicine.name}</span>
        </span>,
        <span key="frequency" className="text-muted-foreground">
          {medicine.frequency || "—"}
        </span>,
        <span key="duration" className="text-muted-foreground">
          {medicine.duration || "—"}
        </span>,
      ]);
      if (rows.length >= limit) break;
    }
    if (rows.length >= limit) break;
  }
  return (
    <DashboardTableCard
      title={title}
      description={description}
      href={href}
      emptyMessage={emptyMessage}
      columns={[
        { label: "Medicine" },
        { label: "Frequency" },
        { label: "Duration" },
      ]}
      rows={rows}
    />
  );
}

export function PrescriptionsTableCard({
  prescriptions,
  maxRows,
  title = "Prescriptions",
  description = "Your prescriptions and diagnoses",
  href = "/patient/medicines",
  emptyMessage = "No prescriptions yet.",
}: CardProps & { prescriptions: Prescription[] }) {
  return (
    <DashboardTableCard
      title={title}
      description={description}
      href={href}
      emptyMessage={emptyMessage}
      columns={[
        { label: "Date" },
        { label: "Doctor" },
        { label: "Diagnosis" },
        { label: "Medicines" },
      ]}
      rows={[...prescriptions]
        .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
        .slice(0, maxRows)
        .map((prescription) => [
          <span key="date" className="text-muted-foreground tabular-nums">
            {formatDate(prescription.visitDate)}
          </span>,
          <span key="doctor" className="font-medium">
            {prescription.doctorName ?? "—"}
          </span>,
          <span
            key="diagnosis"
            className="max-w-56 truncate text-muted-foreground"
          >
            {prescription.diagnosis || "—"}
          </span>,
          <span key="medicines" className="font-medium tabular-nums">
            {prescription.medicines.length}
          </span>,
        ])}
    />
  );
}

export function ReportsTableCard({
  reports,
  maxRows,
  title = "Reports",
  description = "Your documents at the clinic",
  href = "/patient/reports",
  emptyMessage = "No reports yet.",
}: CardProps & { reports: ReportFile[] }) {
  return (
    <DashboardTableCard
      title={title}
      description={description}
      href={href}
      emptyMessage={emptyMessage}
      columns={[
        { label: "Name", className: "w-full" },
        { label: "Date" },
        { label: "Category" },
      ]}
      rows={reports.slice(0, maxRows).map((file) => [
        <span key="name" className="min-w-0 truncate font-medium">
          {file.name}
        </span>,
        <span key="date" className="text-muted-foreground tabular-nums">
          {formatDate(file.createdAt)}
        </span>,
        <Badge key="category" variant="outline" className="text-xs">
          {categoryLabel(file.category)}
        </Badge>,
      ])}
    />
  );
}

export function DoctorsTableCard({
  doctors,
  maxRows,
  title = "Doctors",
  description = "Doctors who have treated you",
  href = "/patient/doctors",
  emptyMessage = "No doctors yet.",
}: CardProps & { doctors: PatientDoctor[] }) {
  return (
    <DashboardTableCard
      title={title}
      description={description}
      href={href}
      emptyMessage={emptyMessage}
      columns={[
        { label: "Doctor" },
        { label: "Specialty" },
        { label: "Visits" },
        { label: "Last Visit" },
      ]}
      rows={doctors.slice(0, maxRows).map((doctor) => [
        <span key="name" className="inline-flex items-center gap-2 font-medium">
          <Stethoscope
            className="size-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <span className="truncate">{doctor.name}</span>
        </span>,
        <span key="specialty" className="text-muted-foreground">
          {doctor.specialty ?? "Doctor"}
        </span>,
        <span key="visits" className="font-medium tabular-nums">
          {doctor.visits}
        </span>,
        <span key="lastVisit" className="text-muted-foreground tabular-nums">
          {formatOptionalDate(doctor.lastVisit)}
        </span>,
      ])}
    />
  );
}