"use client";

import { useEffect, useState } from "react";
import { QrCodeIcon, RefreshCwIcon, SmartphoneIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type SessionState = {
  connected: boolean;
  stage: "idle" | "qr" | "authenticated" | "ready" | "disconnected" | "error";
  updatedAt: string;
};

type SessionResponse = {
  state: SessionState | null;
  qr: { dataUrl: string; generatedAt: string } | null;
};

const STAGE_LABELS: Record<SessionState["stage"], string> = {
  idle: "Connecting",
  qr: "Waiting for scan",
  authenticated: "Authenticated",
  ready: "Connected",
  disconnected: "Disconnected",
  error: "Error",
};

function stageVariant(stage: SessionState["stage"] | null): "default" | "secondary" | "destructive" | "outline" {
  switch (stage) {
    case "ready":
      return "default";
    case "error":
      return "destructive";
    case "disconnected":
      return "destructive";
    case "qr":
      return "secondary";
    case "authenticated":
      return "secondary";
    case "idle":
      return "outline";
    default:
      return "outline";
  }
}

export function WhatsAppSessionCard() {
  const [data, setData] = useState<SessionResponse>({ state: null, qr: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const run = () => {
      fetch("/api/whatsapp/session", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (!active) return;
          if (json) {
            setData(json);
            setError(false);
          } else {
            setError(true);
          }
        })
        .catch(() => {
          if (active) setError(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };
    run();
    const timer = setInterval(run, 10_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const stage = data.state?.stage ?? null;
  const connected = data.state?.connected ?? false;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <SmartphoneIcon className="size-4 text-muted-foreground" />
            WhatsApp AI
          </h2>
          <p className="text-sm text-muted-foreground">
            Connect the WhatsApp bot to handle customer messages automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && data.state === null ? (
            <Badge variant="outline">Loading…</Badge>
          ) : (
            <Badge variant={stageVariant(stage)}>
              {stage ? STAGE_LABELS[stage] : "Not started"}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLoading(true);
              setError(false);
              fetch("/api/whatsapp/session", { cache: "no-store" })
                .then((res) => (res.ok ? res.json() : null))
                .then((json) => {
                  if (json) {
                    setData(json);
                    setError(false);
                  } else {
                    setError(true);
                  }
                })
                .catch(() => setError(true))
                .finally(() => setLoading(false));
            }}
          >
            <RefreshCwIcon />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive">
          Could not load the WhatsApp session status. Please try again.
        </p>
      ) : connected ? (
        <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-sm">
          <span className="size-2 rounded-full bg-primary" />
          The bot is connected to WhatsApp and answering messages.
        </div>
      ) : data.qr ? (
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.qr.dataUrl}
            alt="WhatsApp QR code to link the clinic device"
            className="h-56 w-56 rounded-lg border border-border bg-white p-2"
          />
          <p className="text-center text-sm text-muted-foreground">
            Open WhatsApp on your phone → Settings → Linked Devices →{" "}
            <span className="font-medium text-foreground">Link a device</span>,
            then scan this QR code. The code refreshes every few seconds.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">
          <QrCodeIcon className="size-5 shrink-0" />
          The WhatsApp worker is not running. Start it with{" "}
          <code className="rounded bg-background px-1.5 py-0.5 font-mono text-xs">
            npm run whatsapp
          </code>{" "}
          and a QR code will appear here.
        </div>
      )}
    </div>
  );
}
