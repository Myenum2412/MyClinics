"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRequireRole, sessionCan } from "@/hooks/use-clinic-session";
import { getSoul, updateSoul, getWhatsappSession } from "@/lib/clinic-api";
import type { SoulRecord, WhatsappSession } from "@/lib/clinic-api";
import { DROPDOWN_OPTION_DEFS, useDropdownOptions } from "@/lib/dropdown-options";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ListPlus, Plus, Trash2, X } from "lucide-react";

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
  const session = useRequireRole("staff");
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

  const {
    getOptions,
    addOption,
    removeOption,
    loading: dropdownsLoading,
  } = useDropdownOptions(session?.clinicId ?? "");

  const [dropdownDrafts, setDropdownDrafts] = useState<Record<string, string>>({});
  const [dropdownSaving, setDropdownSaving] = useState<Record<string, boolean>>({});

  async function handleAddOption(key: string) {
    const value = (dropdownDrafts[key] ?? "").trim();
    if (!value) return;
    setDropdownSaving((s) => ({ ...s, [key]: true }));
    try {
      const added = await addOption(key, value);
      if (added) {
        toast.success(`Added "${value}"`);
        setDropdownDrafts((d) => ({ ...d, [key]: "" }));
      } else {
        toast.error("This option already exists");
      }
    } catch {
      /* toast handled in hook */
    } finally {
      setDropdownSaving((s) => ({ ...s, [key]: false }));
    }
  }

  async function handleRemoveOption(key: string, value: string) {
    setDropdownSaving((s) => ({ ...s, [key]: true }));
    try {
      await removeOption(key, value);
      toast.success(`Removed "${value}"`);
    } catch {
      /* toast handled in hook */
    } finally {
      setDropdownSaving((s) => ({ ...s, [key]: false }));
    }
  }

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
              <span className="flex size-14 items-center justify-center rounded-full bg-success/10 text-2xl">
                ✅
              </span>
              <p className="font-medium text-success">WhatsApp connected</p>
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
                className="rounded-lg border border-border bg-background p-2"
              />
              <p className="max-w-sm text-sm font-medium text-primary">
                Open WhatsApp on your phone → Settings → Linked devices → Link a device, then
                scan this QR. QR refreshes every few seconds.
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-8">
              <span className="flex size-14 items-center justify-center rounded-full bg-warning/10 text-2xl">
                ⚠️
              </span>
              <p className="font-medium text-warning">
                {STAGE_LABEL[stage] ?? "WhatsApp unavailable"}
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {waSession === null
                  ? "The status service is not reachable right now. The WhatsApp worker may be down — check pm2 status on the server (myclinic-whatsapp), then reload this page."
                  : "Make sure the WhatsApp worker is running on the server (pm2: myclinic-whatsapp) and a Chromium browser is available."}
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
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
              <Label htmlFor="soul" className="text-sm font-medium text-foreground">
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
              <p className="text-xs text-muted-foreground">
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

      {canEdit && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListPlus className="size-4.5 text-primary" />
            Dropdown Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Manage the options available in the dropdowns across the app. Add new values or
            remove existing ones — changes apply to every form and filter using that dropdown.
          </p>
          {dropdownsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              {DROPDOWN_OPTION_DEFS.map((def) => {
                const values = getOptions(def.key);
                const saving = dropdownSaving[def.key];
                return (
                  <div key={def.key} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{def.label}</p>
                        {def.description && (
                          <p className="text-xs text-muted-foreground">{def.description}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {values.length} option{values.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {values.map((value) => (
                        <span
                          key={value}
                          className="inline-flex items-center gap-1 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-800"
                        >
                          {value}
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleRemoveOption(def.key, value)}
                            aria-label={`Remove ${value}`}
                            className="text-primary transition hover:text-destructive"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Input
                        value={dropdownDrafts[def.key] ?? ""}
                        placeholder={`Add a new option...`}
                        className="h-8 max-w-xs text-xs"
                        disabled={saving}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleAddOption(def.key);
                          }
                        }}
                        onChange={(e) =>
                          setDropdownDrafts((d) => ({ ...d, [def.key]: e.target.value }))
                        }
                      />
                      <Button
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        disabled={saving || !(dropdownDrafts[def.key] ?? "").trim()}
                        onClick={() => handleAddOption(def.key)}
                      >
                        {saving ? <Trash2 className="size-3.5" /> : <Plus className="size-3.5" />}
                        {saving ? "Saving..." : "Add"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}