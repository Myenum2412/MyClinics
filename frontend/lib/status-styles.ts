/**
 * Central status → Tailwind class maps. These are used by every list page so
 * status badges stay visually consistent across the app and adapt to both
 * light and dark themes via the `success` / `warning` / `info` / destructive
 * design tokens.
 *
 * Every entry is a static string so tailwind-merge / the JIT can resolve it.
 */

const toneStyles = {
  info: "bg-info/10 text-info border-info/25",
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/10 text-warning border-warning/25",
  destructive: "bg-destructive/10 text-destructive border-destructive/25",
  muted: "bg-muted text-muted-foreground border-border",
} as const;

export type StatusTone = keyof typeof toneStyles;

export function statusTone(tone: StatusTone): string {
  return toneStyles[tone];
}

export function appointmentStatusTone(status: string): string {
  switch (status) {
    case "scheduled":
      return toneStyles.info;
    case "completed":
      return toneStyles.success;
    case "cancelled":
      return toneStyles.destructive;
    case "no_show":
      return toneStyles.warning;
    default:
      return toneStyles.muted;
  }
}

export function billStatusTone(status: string): string {
  switch (status) {
    case "paid":
      return toneStyles.success;
    case "issued":
      return toneStyles.info;
    case "draft":
      return toneStyles.muted;
    case "void":
      return toneStyles.destructive;
    default:
      return toneStyles.muted;
  }
}

export function patientStatusTone(status: string): string {
  switch (status) {
    case "active":
      return toneStyles.success;
    case "inactive":
      return toneStyles.muted;
    default:
      return toneStyles.muted;
  }
}

export function clinicStatusTone(status: string): string {
  switch (status) {
    case "active":
      return toneStyles.success;
    case "suspended":
      return toneStyles.warning;
    default:
      return toneStyles.muted;
  }
}

export function notificationTone(status: string): string {
  switch (status) {
    case "sent":
      return toneStyles.success;
    case "enqueued":
      return toneStyles.info;
    case "pending":
      return toneStyles.warning;
    case "failed":
      return toneStyles.destructive;
    default:
      return toneStyles.muted;
  }
}