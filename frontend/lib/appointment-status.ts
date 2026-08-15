export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "rescheduled"
  | "no_show";

/** Solid status badge colors (background + white text) for appointments. */
export const appointmentStatusClass: Record<AppointmentStatus, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-blue-600",
  completed: "bg-green-600",
  cancelled: "bg-red-600",
  rescheduled: "bg-violet-600",
  no_show: "bg-slate-700",
};

export function statusBadgeClass(status?: string | null): string {
  return appointmentStatusClass[status as AppointmentStatus] ?? "bg-slate-500";
}
