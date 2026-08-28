import { now } from "@/clinic/core/datetime";

/** How long an open incident stays "correlatable" for new related events. */
export const CORRELATION_WINDOW_MS = 30 * 60 * 1000;

export function correlationWindowStart(): Date {
  return new Date(now().getTime() - CORRELATION_WINDOW_MS);
}
