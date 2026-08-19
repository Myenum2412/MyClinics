"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRequireRole, sessionCan } from "@/hooks/use-clinic-session";
import { getSoul, updateSoul, getWhatsappSession } from "@/lib/clinic-api";
import type { SoulRecord, WhatsappSession } from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

const WHATSAPP_POLL_MS = 5_000;

const STAGE_LABEL: Record<string, string> = {
  idle: "Starting…",
  qr: "Scan the QR below to connect WhatsApp",
  authenticated: "Authenticated — preparing…",
  ready: "Connected — notifications are active",
  disconnected: "Disconnected — reconnecting…",
  error: "Connection error — check the WhatsApp worker logs",
};

export default function SettingsPage() {
  const session = useRequireRole("doctor");
  const canEdit = sessionCan(session, "clinic_admin");

  const [soul, setSoul] = useState<SoulRecord | null>(null);
  const [soulDraft, setSoulDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingSoul, setSavingSoul] = useState(false);

  const [waSession, setWaSession] = useState<WhatsappSession | null>(null);
  const [waLoading, setWaLoading] = useState(true);

  useEffect(() => {
    getSoul()
      .then((res) => {
        setSoul(res.soul);
        setSoulDraft(res.soul.content);
      })
      .catch(() => toast.error("Failed to load soul.md"))
      .finally(() => setLoading(false));
  }, []);

  const pollWhatsapp = useCallback(async () => {
    try {
      const res = await getWhatsappSession();
      setWaSession(res);
    } catch {
      setWaSession(null);
    } finally {
      setWaLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void pollWhatsapp());
    const timer = setInterval(pollWhatsapp, WHATSAPP_POLL_MS);
    return () => clearInterval(timer);
  }, [pollWhatsapp]);

  async function saveSoulMd(e: React.FormEvent) {
    e.preventDefault();
    setSavingSoul(true);
    try {
      const updated = await updateSoul(soulDraft);
      setSoul(updated.soul);
      setSoulDraft(updated.soul.content);
      toast.success("soul.md saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save soul.md");
    } finally {
      setSavingSoul(false);
    }
  }

  const stage = waSession?.state?.stage ?? (waLoading ? "idle" : "idle");
  const connected = waSession?.state?.connected === true;

  if (loading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>WhatsApp connection</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 text-center">
          {waLoading ? (
            <Skeleton className="h-64 w-64" />
          ) : connected ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <span className="flex size-14 items-center justify-center rounded-full bg-green-100 text-2xl">
                ✅
              </span>
              <p className="font-medium text-green-700">WhatsApp connected</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Appointment reminders and notifications are being delivered through the
                wwebjs.dev (whatsapp-web.js) worker.
              </p>
            </div>
          ) : waSession?.qr ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={waSession.qr.dataUrl}
                alt="WhatsApp Web QR code"
                width={264}
                height={264}
                className="rounded-lg border border-blue-200 bg-white p-2"
              />
              <p className="max-w-sm text-sm font-medium text-blue-700">
                Open WhatsApp on your phone → Settings → Linked devices → Link a device, then
                scan this QR. QR refreshes every few seconds.
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8">
              <span className="flex size-14 items-center justify-center rounded-full bg-amber-100 text-2xl">
                ⚠️
              </span>
              <p className="font-medium text-amber-700">
                {STAGE_LABEL[stage] ?? "WhatsApp unavailable"}
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Make sure the WhatsApp worker is running on the server (pm2:
                myclinic-whatsapp) and a Chromium browser is available.
              </p>
            </div>
          )}
          <p className="text-xs text-gray-400">
            Powered by wwebjs.dev (whatsapp-web.js) · last update{" "}
            {waSession?.state?.updatedAt
              ? new Date(waSession.state.updatedAt).toLocaleTimeString("en-IN")
              : "—"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>soul.md</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveSoulMd} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The story and purpose of your clinic, stored as a markdown file. The WhatsApp
              assistant uses this file to answer patients in your clinic&apos;s voice.
            </p>
            <div className="grid gap-2">
              <Label htmlFor="soul" className="text-sm font-medium text-gray-700">
                soul.md content
              </Label>
              <Textarea
                id="soul"
                value={soulDraft}
                disabled={!canEdit}
                rows={12}
                placeholder={"# Our clinic's soul\n\nWhy we exist, what we stand for..."}
                className="min-h-64 resize-y font-mono text-sm"
                onChange={(e) => setSoulDraft(e.target.value)}
              />
            </div>
            {soul && (
              <p className="text-xs text-gray-500">
                Version {soul.version} · fallback reply: “{soul.fallbackReply}”
              </p>
            )}
            {canEdit && (
              <Button type="submit" disabled={savingSoul}>
                {savingSoul ? "Saving..." : "Save soul.md"}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}