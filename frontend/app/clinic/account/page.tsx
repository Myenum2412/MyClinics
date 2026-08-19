"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Save,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import type { Clinic, WhatsappSession } from "@/lib/clinic-api";
import {
  getOwnClinic,
  getWhatsappSession,
  listNotifications,
  logout,
  updateOwnClinic,
} from "@/lib/clinic-api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const ROLE_LABELS: Record<string, string> = {
  platform_admin: "Platform Admin",
  clinic_admin: "Clinic Admin",
  doctor: "Doctor",
  staff: "Staff",
  patient: "Patient",
};

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className={`mt-0.5 truncate text-sm text-slate-800 ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}

export default function AccountPage() {
  const session = useRequireRole("staff");
  const clinicId = session?.clinicId ?? "";
  const router = useRouter();

  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [unread, setUnread] = useState(0);
  const [waSession, setWaSession] = useState<WhatsappSession | null>(null);

  const [draft, setDraft] = useState({
    name: "",
    description: "",
    website: "",
    phone: "",
    email: "",
    address: "",
    open: "",
    close: "",
  });

  useEffect(() => {
    if (!clinicId) return;
    getOwnClinic(clinicId)
      .then((res) => {
        setClinic(res);
        setDraft({
          name: res.name,
          description: res.description ?? "",
          website: res.website ?? "",
          phone: res.phone ?? "",
          email: res.email ?? "",
          address: res.address ?? "",
          open: res.settings.workingHours.open,
          close: res.settings.workingHours.close,
        });
      })
      .catch(() => toast.error("Failed to load clinic profile"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    if (!clinicId) return;
    listNotifications(clinicId, { limit: 1 })
      .then((res) => setUnread(res.unread))
      .catch(() => {});
    getWhatsappSession()
      .then(setWaSession)
      .catch(() => setWaSession(null));
  }, [clinicId]);

  async function handleLogout() {
    await logout();
    router.push("/login");
    router.refresh();
  }

  function startEdit() {
    if (!clinic) return;
    setDraft({
      name: clinic.name,
      description: clinic.description ?? "",
      website: clinic.website ?? "",
      phone: clinic.phone ?? "",
      email: clinic.email ?? "",
      address: clinic.address ?? "",
      open: clinic.settings.workingHours.open,
      close: clinic.settings.workingHours.close,
    });
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
  }

  async function saveAll() {
    if (!clinic) return;
    setSaving(true);
    try {
      const updated = await updateOwnClinic(clinicId, {
        name: draft.name,
        description: draft.description,
        website: draft.website,
        phone: draft.phone,
        email: draft.email,
        address: draft.address,
        settings: { workingHours: { open: draft.open, close: draft.close } },
      });
      setClinic(updated);
      setIsEditing(false);
      toast.success("Clinic profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update clinic profile");
    } finally {
      setSaving(false);
    }
  }

  const role = session?.role ?? "staff";
  const roleLabel = ROLE_LABELS[role] ?? "Member";
  const initials = (clinic?.name ?? session?.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const mapsUrl = useMemo(() => {
    const query = [clinic?.name, clinic?.address].filter(Boolean).join(", ");
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }, [clinic?.name, clinic?.address]);
  const waConnected = waSession?.state?.connected === true;

  if (loading || !clinic) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 md:px-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 md:px-8">
      <header className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/clinic")}
          aria-label="Back to dashboard"
          className="text-slate-600"
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-slate-800">My Account</h1>
          <p className="text-sm text-slate-500">Clinic profile and contact information</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/clinic/notifications")}
          aria-label="Notifications"
          className="relative text-slate-600"
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-sky-500 text-[10px] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="gap-1.5 text-red-600 hover:text-red-700"
        >
          <LogOut className="size-4" />
          Log out
        </Button>
      </header>

      <Card className="border-sky-100 shadow-sm">
        <CardContent className="flex flex-col gap-5 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-14 border-2 border-sky-100">
              <AvatarFallback className="bg-sky-50 text-base text-sky-700">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold text-slate-800">{clinic.name}</p>
                <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                  {roleLabel}
                </Badge>
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="mr-1 size-3" />
                  Active
                </Badge>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-slate-500">
                <span className="flex min-w-0 items-center gap-1">
                  <Mail className="size-3.5 shrink-0" />
                  <span className="truncate">{clinic.email ?? "—"}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="size-3.5 shrink-0" />
                  {clinic.phone ?? "—"}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-3.5 shrink-0" />
                  Since {new Date(clinic.createdAt).toLocaleDateString("en-IN")}
                </span>
              </div>
            </div>
          </div>
          {isEditing ? (
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" onClick={cancelEdit} className="gap-1.5 text-slate-600">
                <X className="size-3.5" />
                Cancel
              </Button>
              <Button size="sm" onClick={saveAll} disabled={saving} className="gap-1.5">
                <Save className="size-3.5" />
                {saving ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={startEdit}
              className="shrink-0 gap-1.5 border-sky-200 text-sky-700 hover:bg-sky-50 hover:text-sky-800"
            >
              <Pencil className="size-3.5" />
              Edit Profile
            </Button>
          )}
        </CardContent>
      </Card>

      {isEditing ? (
        <Card className="border-sky-100 shadow-sm">
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Clinic Name</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input
                value={draft.phone}
                onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Website</Label>
              <Input
                value={draft.website}
                placeholder="https://myclinic.example.com"
                onChange={(e) => setDraft((d) => ({ ...d, website: e.target.value }))}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Address</Label>
              <Textarea
                rows={2}
                value={draft.address}
                placeholder="Door no., street, area, city, district, state, pincode"
                onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={draft.description}
                placeholder="Tell patients what your clinic is about..."
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Open</Label>
                <Input
                  type="time"
                  value={draft.open}
                  onChange={(e) => setDraft((d) => ({ ...d, open: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Close</Label>
                <Input
                  type="time"
                  value={draft.close}
                  onChange={(e) => setDraft((d) => ({ ...d, close: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-sky-100 shadow-sm">
            <CardContent className="grid gap-x-8 gap-y-4 pt-6 sm:grid-cols-2">
              <Field label="Clinic Name" value={clinic.name} />
              <Field label="Description" value={clinic.description ?? "—"} />
              <Field label="Phone" value={clinic.phone ?? "—"} />
              <Field label="Email" value={clinic.email ?? "—"} />
              <Field label="Website" value={clinic.website ?? "—"} />
              <Field label="Address" value={clinic.address ?? "—"} />
              {clinic.address && (
                <div className="sm:col-span-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(mapsUrl, "_blank", "noopener,noreferrer")}
                    className="gap-1.5 border-sky-200 text-sky-700 hover:bg-sky-50"
                  >
                    <MapPin className="size-3.5" />
                    View on Map
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-sky-100 shadow-sm">
            <CardContent className="grid gap-x-8 gap-y-4 pt-6 sm:grid-cols-2">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <Clock className="size-3.5" />
                  Working Hours
                </p>
                <p className="mt-0.5 text-sm text-slate-800">
                  {clinic.settings.workingHours.open} – {clinic.settings.workingHours.close}
                </p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <MessageCircle className="size-3.5" />
                  WhatsApp
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-800">
                  <span
                    className={`size-2 rounded-full ${waConnected ? "bg-emerald-500" : "bg-amber-500"}`}
                  />
                  {waConnected ? "Connected" : waSession?.state?.stage ?? "Unavailable"}
                  {clinic.phone ? ` · ${clinic.phone}` : ""}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/clinic/settings")}
                    className="h-6 px-1.5 text-xs text-sky-700 hover:bg-sky-50"
                  >
                    Manage
                  </Button>
                </p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <Building2 className="size-3.5" />
                  Member Since
                </p>
                <p className="mt-0.5 text-sm text-slate-800">
                  {new Date(clinic.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
              {clinic.website && (
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <Globe className="size-3.5" />
                    Visit Website
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-6 px-0 text-sm text-sky-700"
                    onClick={() =>
                      window.open(
                        clinic.website!.startsWith("http")
                          ? clinic.website!
                          : `https://${clinic.website!}`,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    <span className="truncate">{clinic.website}</span>
                    <ExternalLink className="ml-1 size-3.5 shrink-0" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}