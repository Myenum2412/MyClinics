"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type Clinic,
  type ClinicSettings,
  getClinicSettings,
  getOwnClinic,
  updateClinicSettings,
} from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { TimePicker } from "@/components/ui/time-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { sessionCan } from "@/hooks/use-clinic-session";
import { ClinicProfile } from "@/components/clinic/clinic-profile";

function whatsappQrUrl(phone: string | null): string | null {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  const link = `https://wa.me/${digits}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(
    link
  )}`;
}

export default function SettingsPage() {
  const session = useRequireRole("staff");
  const clinicId = session?.clinicId ?? "";
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSoul, setSavingSoul] = useState(false);

  const canEdit = sessionCan(session, "clinic_admin");

  useEffect(() => {
    if (!clinicId) return;
    Promise.all([getClinicSettings(clinicId), getOwnClinic(clinicId)])
      .then(([s, c]) => {
        setSettings(s);
        setClinic(c);
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  async function saveSoulMd(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSavingSoul(true);
    try {
      const updated = await updateClinicSettings(clinicId, { soulMd: settings.soulMd });
      setSettings(updated);
      toast.success("soul.md saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save soul.md");
    } finally {
      setSavingSoul(false);
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await updateClinicSettings(clinicId, {
        workingHours: settings.workingHours,
        slotMinutes: settings.slotMinutes,
        currency: settings.currency,
        timezone: settings.timezone,
        receiptFooter: settings.receiptFooter,
        smsEnabled: settings.smsEnabled,
        emailNotifications: settings.emailNotifications,
      });
      setSettings(updated);
      toast.success("Settings updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ClinicProfile clinicId={clinicId} canEdit={canEdit} />

      <Card>
        <CardHeader>
          <CardTitle>Operational settings</CardTitle>
        </CardHeader>
        <CardContent>
          {settings && (
            <form onSubmit={saveSettings} className="space-y-4">
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Open time</Label>
                    <TimePicker
                      value={settings.workingHours.open}
                      disabled={!canEdit}
                      onChange={(v) =>
                        setSettings({
                          ...settings,
                          workingHours: { ...settings.workingHours, open: v },
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Close time</Label>
                    <TimePicker
                      value={settings.workingHours.close}
                      disabled={!canEdit}
                      onChange={(v) =>
                        setSettings({
                          ...settings,
                          workingHours: { ...settings.workingHours, close: v },
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-2">
                    <Label>Slot minutes</Label>
                    <Input
                      type="number"
                      min={5}
                      max={240}
                      value={settings.slotMinutes}
                      disabled={!canEdit}
                      onChange={(e) =>
                        setSettings({ ...settings, slotMinutes: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Currency</Label>
                    <Input
                      value={settings.currency}
                      disabled={!canEdit}
                      maxLength={8}
                      onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Timezone</Label>
                    <Input
                      value={settings.timezone}
                      disabled={!canEdit}
                      onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Receipt footer</Label>
                  <Textarea
                    value={settings.receiptFooter ?? ""}
                    disabled={!canEdit}
                    rows={2}
                    onChange={(e) => setSettings({ ...settings, receiptFooter: e.target.value })}
                  />
                </div>
                <div className="grid gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={settings.smsEnabled}
                      disabled={!canEdit}
                      onCheckedChange={(v) => setSettings({ ...settings, smsEnabled: v === true })}
                    />
                    SMS reminders enabled
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={settings.emailNotifications}
                      disabled={!canEdit}
                      onCheckedChange={(v) =>
                        setSettings({ ...settings, emailNotifications: v === true })
                      }
                    />
                    Email notifications enabled
                  </label>
                </div>
              </div>
              {canEdit && (
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save settings"}
                </Button>
              )}
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>soul.md</CardTitle>
        </CardHeader>
        <CardContent>
          {settings && (
            <form onSubmit={saveSoulMd} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The story and purpose of your clinic, stored as a markdown file. Write it once —
                use it anywhere.
              </p>
              <Textarea
                value={settings.soulMd ?? ""}
                disabled={!canEdit}
                rows={10}
                placeholder={"# Our clinic's soul\n\nWhy we exist, what we stand for..."}
                className="min-h-52 resize-y font-mono text-sm"
                onChange={(e) => setSettings({ ...settings, soulMd: e.target.value })}
              />
              {canEdit && (
                <Button type="submit" disabled={savingSoul}>
                  {savingSoul ? "Saving..." : "Save soul.md"}
                </Button>
              )}
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>WhatsApp QR</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 text-center">
          {whatsappQrUrl(clinic?.phone ?? null) ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={whatsappQrUrl(clinic?.phone ?? null) ?? ""}
                alt="WhatsApp QR code"
                width={220}
                height={220}
                className="rounded-lg border border-blue-200 bg-white p-2"
              />
              <p className="text-sm text-muted-foreground">
                Patients scan this QR to chat with the clinic on WhatsApp ({" "}
                {clinic?.phone ?? ""} ).
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add a phone number in the clinic profile to generate the WhatsApp QR code.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}