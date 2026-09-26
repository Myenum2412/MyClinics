import { nowISO } from "@/clinic/core/datetime";
import type { GatewaySession } from "@/services/whatsapp/gateway/client";
import type { SessionState } from "@/services/whatsapp/session.types";

const STAGE: Record<GatewaySession["status"], SessionState["stage"]> = {
  STARTING: "idle",
  QR_REQUIRED: "qr",
  READY: "ready",
  DISCONNECTED: "disconnected",
  LOGGED_OUT: "idle",
  STOPPED: "disconnected",
};

/** Maps a gateway session onto the dashboard's connection state. */
export function toSessionState(gw: GatewaySession): SessionState {
  return { connected: gw.status === "READY", stage: STAGE[gw.status] ?? "error", updatedAt: nowISO() };
}

export function toQr(gw: GatewaySession | null): { dataUrl: string; generatedAt: string } | null {
  return gw?.status === "QR_REQUIRED" && gw.qr ? { dataUrl: gw.qr, generatedAt: nowISO() } : null;
}

export const unreachableState = (): SessionState => ({ connected: false, stage: "error", updatedAt: nowISO() });
