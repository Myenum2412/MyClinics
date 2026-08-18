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
  updateOwnClinic,
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

export default function SettingsPage() {
  const session = useRequireRole("staff");
  const clinicId = session?.clinicId ?? "";
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canEdit = sessionCan(session, "clinic_admin");

  useEffect(() => {
    if (!clinicId) return;
    Promise.all([getOwnClinic(clinicId), getClinicSettings(clinicId)])
      .then(([c, s]) => {
        setClinic(c);
        setSettings(s);
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  async function saveClinic(e: React.FormEvent) {
    e.preventDefault();
    if (!clinic) return;
    setSaving(true);
    try {
      const updated = await updateOwnClinic(clinicId, {
        name: clinic.name,
        phone: clinic.phone || null,
        email: clinic.email || null,
        address: clinic.address || null,
        website: clinic.website || null,
        description: clinic.description || null,
      });
      setClinic(updated);
      toast.success("Clinic profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update clinic");
    } finally {
      setSaving(false);
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
      <Card>
        <CardHeader>
          <CardTitle>Clinic profile</CardTitle>
        </CardHeader>
        <CardContent>
          {clinic && (
            <form onSubmit={saveClinic} className="space-y-4">
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label>Clinic name</Label>
                  <Input
                    value={clinic.name}
                    disabled={!canEdit}
                    onChange={(e) => setClinic({ ...clinic, name: e.target.value })}
                    required
                    minLength={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Phone</Label>
                    <Input
                      value={clinic.phone ?? ""}
                      disabled={!canEdit}
                      onChange={(e) => setClinic({ ...clinic, phone: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={clinic.email ?? ""}
                      disabled={!canEdit}
                      onChange={(e) => setClinic({ ...clinic, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Website</Label>
                    <Input
                      value={clinic.website ?? ""}
                      disabled={!canEdit}
                      onChange={(e) => setClinic({ ...clinic, website: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Clinic ID</Label>
                    <Input value={clinic.clinicId} disabled />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Address</Label>
                  <Input
                    value={clinic.address ?? ""}
                    disabled={!canEdit}
                    onChange={(e) => setClinic({ ...clinic, address: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea
                    value={clinic.description ?? ""}
                    disabled={!canEdit}
                    rows={2}
                    onChange={(e) => setClinic({ ...clinic, description: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Status: {clinic.status}</span>
                  <span>Created {new Date(clinic.createdAt).toLocaleDateString("en-IN")}</span>
                </div>
              </div>
              {canEdit && (
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save clinic"}
                </Button>
              )}
            </form>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}