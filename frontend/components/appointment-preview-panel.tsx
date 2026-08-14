"use client";

import { Badge } from "@/components/ui/badge";
import { PreviewSheet } from "@/components/preview-sheet";
import type { Appointment } from "@/components/appointments-table";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const statusVariant: Record<
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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function AppointmentPreviewPanel({
  appointment,
  onClose,
}: {
  appointment: Appointment;
  onClose: () => void;
}) {
  const date = new Date(`${appointment.date}T12:00:00`);
  const dateLabel = Number.isNaN(date.getTime())
    ? appointment.date
    : dateFmt.format(date);

  return (
    <PreviewSheet
      title={
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate">{appointment.fullName}</span>
          <Badge
            variant={statusVariant[appointment.status] ?? "secondary"}
            className="text-xs capitalize"
          >
            {appointment.status.replace("_", " ")}
          </Badge>
        </div>
      }
      subtitle={`${dateLabel} · ${appointment.time} · ${
        appointment.type === "video" ? "Video" : "In-person"
      }`}
      onClose={onClose}
    >
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Appointment Details
        </h2>
        <Field label="Doctor" value={appointment.doctorName ?? "—"} />
        <Field label="Department" value={appointment.department ?? "—"} />
        <Field
          label="Type"
          value={appointment.type === "video" ? "Video" : "In-person"}
        />
        <Field label="Reason" value={appointment.reason ?? "—"} />
        <Field
          label="Booking Source"
          value={
            appointment.bookingSource === "whatsapp_ai"
              ? "WhatsApp AI"
              : "Manual"
          }
        />
        {appointment.counter != null && (
          <Field label="Counter" value={`#${appointment.counter}`} />
        )}
        {appointment.notes && (
          <Field label="Notes" value={appointment.notes} />
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Patient Contact
        </h2>
        <Field label="Mobile" value={appointment.mobile} />
        <Field
          label="Secondary Mobile"
          value={appointment.secondaryMobile ?? "—"}
        />
        <Field label="Age" value={appointment.age ?? "—"} />
        <Field label="Gender" value={appointment.gender ?? "—"} />
        <Field label="Email" value={appointment.email ?? "—"} />
        <Field label="WhatsApp" value={appointment.whatsapp ?? "—"} />
      </div>
    </PreviewSheet>
  );
}