import type { ClinicSessionConfigDoc } from "@/services/whatsapp/whatsapp-session.store";
import type { SessionState } from "@/services/whatsapp/whatsapp.session";

/** Public shape of a clinic's WhatsApp Web connection for API responses. */
export interface ClinicWhatsappSessionPublic {
  stage: SessionState["stage"] | "unconfigured";
  connected: boolean;
  updatedAt: string | null;
  phone: string | null;
  enabled: boolean;
  lastConnectedAt: string | null;
  qr: { dataUrl: string; generatedAt: string } | null;
}

export function sessionToPublic(
  state: SessionState | null,
  config: ClinicSessionConfigDoc | null,
  qr: { dataUrl: string; generatedAt: string } | null
): ClinicWhatsappSessionPublic {
  return {
    stage: state?.stage ?? (config ? "disconnected" : "unconfigured"),
    connected: state?.connected ?? false,
    updatedAt: state?.updatedAt ?? null,
    phone: config?.phone ?? null,
    enabled: config?.enabled ?? false,
    lastConnectedAt: config?.lastConnectedAt ? config.lastConnectedAt.toISOString() : null,
    qr,
  };
}
