"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Clinic } from "@/lib/clinic-api";
import { getOwnClinic, updateOwnClinic } from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

export function ClinicProfile({
  clinicId,
  canEdit,
}: {
  clinicId: string;
  canEdit: boolean;
}) {
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clinicId) return;
    getOwnClinic(clinicId)
      .then(setClinic)
      .catch(() => toast.error("Failed to load clinic profile"))
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

  if (loading) {
    return <Skeleton className="h-80 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clinic profile</CardTitle>
      </CardHeader>
      <CardContent>
        {clinic && (
          <>
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

            <div className="mt-6 border-t border-border pt-4">
              <p className="mb-3 text-sm font-medium text-foreground">Clinic details</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Slug</p>
                  <p className="truncate font-mono text-sm text-foreground">{clinic.slug}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Clinic ID</p>
                  <p className="truncate font-mono text-sm text-foreground">{clinic.clinicId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm capitalize text-foreground">{clinic.status}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Working hours</p>
                  <p className="text-sm text-foreground">
                    {clinic.settings.workingHours.open} – {clinic.settings.workingHours.close}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Slot duration</p>
                  <p className="text-sm text-foreground">{clinic.settings.slotMinutes} min</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Currency</p>
                  <p className="text-sm text-foreground">{clinic.settings.currency}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Timezone</p>
                  <p className="text-sm text-foreground">{clinic.settings.timezone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm text-foreground">
                    {new Date(clinic.createdAt).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last updated</p>
                  <p className="text-sm text-foreground">
                    {new Date(clinic.updatedAt).toLocaleDateString("en-IN")}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}