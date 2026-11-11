"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  connectClinicWhatsapp,
  getClinicWhatsappSession,
  type ClinicWhatsappSession,
} from "@/lib/clinic-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle2, Loader2, MessageCircle } from "lucide-react";

/** The QR rotates every ~20-60s at WhatsApp's end; 4s keeps the popup fresh. */
const POLL_MS = 4_000;

/**
 * "Connect WhatsApp" entry point shown on the clinic account page (and right
 * after signup). Opens a popup with the pairing QR and a reminder to use the
 * clinic's BUSINESS WhatsApp number, never a personal one.
 */
export function WhatsAppConnectCard({
  clinicId,
  canManage,
}: {
  clinicId: string;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<ClinicWhatsappSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const startedRef = useRef(false);
  // Keep the last QR visible during the brief gap between two rotations.
  const [lastQr, setLastQr] = useState<ClinicWhatsappSession["qr"]>(null);
  const qr = session?.qr ?? lastQr;
  const connected = Boolean(session?.connected);

  const load = useCallback(async () => {
    try {
      const res = await getClinicWhatsappSession(clinicId);
      setSession(res);
      if (res.qr) setLastQr(res.qr);
      setError("");
      return res;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check WhatsApp status.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    // Defer to a helper so the effect does not synchronously queue state.
    const run = async () => {
      await load();
    };
    void run();
  }, [load]);

  useEffect(() => {
    if (!open) {
      startedRef.current = false;
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      if (cancelled) return;
      const res = await load();
      if (cancelled) return;

      // Read-only viewers (staff) do not need polling.
      if (!canManage) return;

      // Already paired — nothing left to poll.
      if (res?.connected) return;

      // First open for an unpaired clinic: kick off a pairing session so the
      // worker starts emitting a QR. Never do this when a QR is already live.
      if (
        res &&
        canManage &&
        !res.qr &&
        !startedRef.current &&
        (res.stage === "unconfigured" || res.stage === "disconnected" || res.stage === "error")
      ) {
        startedRef.current = true;
        setStarting(true);
        try {
          await connectClinicWhatsapp(clinicId);
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : "Could not start WhatsApp connection.");
          }
        } finally {
          if (!cancelled) setStarting(false);
        }
        if (cancelled) return;
        await load();
        if (cancelled) return;
      }

      timer = setTimeout(tick, POLL_MS);
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [open, canManage, clinicId, load]);

  async function handleRegenerate() {
    setError("");
    setStarting(true);
    try {
      await connectClinicWhatsapp(clinicId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate a new QR code.");
    } finally {
      setStarting(false);
    }
  }

  const statusText = connected
    ? session?.phone
      ? `Connected as ${session.phone.startsWith("+") ? session.phone : `+${session.phone}`}`
      : "Connected — reminders and reports are active"
    : loading
      ? "Checking connection…"
      : "Connect your clinic's WhatsApp Business number to send reminders and reports";

  return (
    <div className="mt-5 flex flex-col gap-3 rounded-xl border border-[#E3F2FD] bg-[#E3F2FD]/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15">
          <MessageCircle className="size-5 text-[#128C7E]" aria-hidden="true" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">WhatsApp</p>
            {connected && (
              <Badge
                variant="outline"
                className="border-[#25D366]/40 bg-[#25D366]/10 text-[#075E54]"
              >
                <span className="mr-1.5 size-1.5 rounded-full bg-[#25D366]" />
                Connected
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{statusText}</p>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button disabled={!canManage} className="w-full sm:w-auto">
              {connected ? "WhatsApp settings" : "Connect WhatsApp"}
            </Button>
          }
        />
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect WhatsApp</DialogTitle>
            <DialogDescription>
              Pair your clinic&apos;s WhatsApp Business number with MyClinics.
            </DialogDescription>
          </DialogHeader>

          {!canManage ? (
            <p className="py-4 text-sm text-muted-foreground">
              Ask a clinic administrator to connect the clinic&apos;s WhatsApp number.
            </p>
          ) : connected ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="size-12 text-[#25D366]" />
              <p className="text-sm font-medium text-foreground">
                WhatsApp is connected
                {session?.phone
                  ? ` (${session.phone.startsWith("+") ? session.phone : `+${session.phone}`})`
                  : ""}
                .
              </p>
              <p className="text-xs text-muted-foreground">
                Reminders, prescriptions and reports will be sent from this number.
              </p>
              <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          ) : qr ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr.dataUrl}
                alt="WhatsApp pairing QR code"
                width={248}
                height={248}
                className="h-auto w-full max-w-[248px] rounded-lg border border-border bg-background p-2"
              />

              <div className="w-full rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 p-3 text-center">
                <p className="text-sm font-semibold text-[#075E54]">
                  Use business WhatsApp only
                </p>
                <p className="mt-0.5 text-xs text-[#075E54]/80">
                  Do not connect a personal WhatsApp number.
                </p>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Open <strong>WhatsApp Business</strong> on your clinic phone →{" "}
                <strong>Settings</strong> → <strong>Linked devices</strong> →{" "}
                <strong>Link a device</strong>, then scan this QR. The code refreshes every few
                seconds.
              </p>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={starting}
                onClick={() => void handleRegenerate()}
              >
                {starting ? "Generating…" : "Generate a new QR"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="size-7 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {starting ? "Starting WhatsApp…" : "Generating QR code…"}
              </p>
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
