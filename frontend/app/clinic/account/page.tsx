"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Globe,
  Landmark,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Monitor,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  Stethoscope,
  Users,
  UserCog,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import type { Clinic, Notification, WhatsappSession } from "@/lib/clinic-api";
import {
  getOwnClinic,
  getWhatsappSession,
  listAppointments,
  listDoctors,
  listNotifications,
  listPatients,
  listPrescriptions,
  listStaff,
  logout,
  updateOwnClinic,
} from "@/lib/clinic-api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const ROLE_LABELS: Record<string, string> = {
  platform_admin: "Platform Admin",
  clinic_admin: "Clinic Admin",
  doctor: "Doctor",
  staff: "Staff",
  patient: "Patient",
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="truncate font-mono text-xs text-slate-700">{value}</span>
    </div>
  );
}

function InfoField({
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

function StatTile({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof Users;
  label: string;
  value: number | null;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-sky-100 bg-white p-3.5 shadow-sm">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-tight text-slate-800">
          {loading ? <Skeleton className="h-6 w-8" /> : value === null ? "—" : value}
        </p>
        <p className="truncate text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function CardAction({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="gap-1.5 border-sky-200 text-sky-700 hover:bg-sky-50 hover:text-sky-800"
    >
      {children}
    </Button>
  );
}

function parseDeviceInfo(): { device: string; browser: string } {
  const ua = navigator.userAgent;
  let browser = "Unknown";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua)) browser = "Safari";
  let device = "Unknown device";
  if (/iPhone/.test(ua)) device = "iPhone";
  else if (/iPad/.test(ua)) device = "iPad";
  else if (/Android/.test(ua)) device = "Android";
  else if (/Mac/.test(ua)) device = "Mac";
  else if (/Windows/.test(ua)) device = "Windows";
  else if (/Linux/.test(ua)) device = "Linux";
  return { device, browser };
}

export default function AccountPage() {
  const session = useRequireRole("staff");
  const clinicId = session?.clinicId ?? "";
  const router = useRouter();

  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<Record<string, number | null>>({});
  const [statsLoading, setStatsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [waSession, setWaSession] = useState<WhatsappSession | null>(null);

  const [editAddress, setEditAddress] = useState(false);
  const [editHours, setEditHours] = useState(false);
  const [addressDraft, setAddressDraft] = useState({ address: "", phone: "", email: "" });
  const [hoursDraft, setHoursDraft] = useState({ open: "", close: "" });
  const [profileDraft, setProfileDraft] = useState({
    name: "",
    description: "",
    website: "",
  });
  const settingsRef = useRef<HTMLDivElement | null>(null);

  const deviceInfo = useMemo(() => parseDeviceInfo(), []);

  useEffect(() => {
    if (!clinicId) return;
    getOwnClinic(clinicId)
      .then((res) => {
        setClinic(res);
        setAddressDraft({
          address: res.address ?? "",
          phone: res.phone ?? "",
          email: res.email ?? "",
        });
        setHoursDraft({
          open: res.settings.workingHours.open,
          close: res.settings.workingHours.close,
        });
        setProfileDraft({
          name: res.name,
          description: res.description ?? "",
          website: res.website ?? "",
        });
      })
      .catch(() => toast.error("Failed to load clinic profile"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    if (!clinicId) return;
    const jobs: [string, Promise<{ total: number }>][] = [
      ["patients", listPatients(clinicId, { limit: 1 })],
      ["doctors", listDoctors(clinicId, { limit: 1 })],
      ["staff", listStaff(clinicId, { limit: 1 })],
      ["appointments", listAppointments(clinicId, { limit: 1 })],
      ["prescriptions", listPrescriptions(clinicId, { limit: 1 })],
    ];
    Promise.allSettled(
      jobs.map(async ([key, promise]) => {
        try {
          const res = await promise;
          return [key, res.total] as const;
        } catch {
          return [key, null] as const;
        }
      })
    ).then((results) => {
      const next: Record<string, number | null> = {};
      for (const r of results) {
        if (r.status === "fulfilled") next[r.value[0]] = r.value[1];
      }
      setStats(next);
      setStatsLoading(false);
    });
    listNotifications(clinicId, { limit: 5 })
      .then((res) => {
        setNotifications(res.items);
        setUnread(res.unread);
      })
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

  async function saveAddress() {
    if (!clinic) return;
    setSaving(true);
    try {
      const updated = await updateOwnClinic(clinicId, {
        address: addressDraft.address,
        phone: addressDraft.phone,
        email: addressDraft.email,
      });
      setClinic(updated);
      setEditAddress(false);
      toast.success("Clinic address updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update address");
    } finally {
      setSaving(false);
    }
  }

  async function saveHours() {
    if (!clinic) return;
    setSaving(true);
    try {
      const updated = await updateOwnClinic(clinicId, {
        settings: { workingHours: { ...hoursDraft } },
      });
      setClinic(updated);
      setEditHours(false);
      toast.success("Working hours updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update working hours");
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile() {
    if (!clinic) return;
    setSaving(true);
    try {
      const updated = await updateOwnClinic(clinicId, {
        name: profileDraft.name,
        description: profileDraft.description,
        website: profileDraft.website,
      });
      setClinic(updated);
      toast.success("Clinic profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
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
  const waPhone = clinic?.phone ?? null;

  if (loading || !clinic) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 md:px-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      {/* 1. Top header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
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
          <h1 className="text-xl font-semibold text-slate-800">Clinic Profile</h1>
          <p className="text-sm text-slate-500">Manage your clinic information and public profile</p>
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
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pr-1 pl-3 shadow-sm">
          <Avatar className="size-7">
            <AvatarFallback className="text-[10px]">
              {(session?.name ?? "?")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium text-slate-700 sm:block">
            {session?.name ?? "User"}
          </span>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5 text-slate-600">
            <LogOut className="size-4" />
            Log out
          </Button>
        </div>
      </div>

      {/* 2. Clinic profile header card */}
      <Card className="mb-4 border-sky-100 shadow-sm">
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border-2 border-sky-100">
              <AvatarFallback className="bg-sky-50 text-lg text-sky-700">{initials}</AvatarFallback>
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
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Mail className="size-3.5" /> {clinic.email ?? "—"}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="size-3.5" /> {clinic.phone ?? "—"}
                </span>
              </div>
            </div>
          </div>
          <CardAction
            onClick={() =>
              settingsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          >
            <Pencil className="size-3.5" />
            Edit Profile
          </CardAction>
        </CardContent>
      </Card>

      {/* 3. Clinic address details */}
      <Card className="mb-4 border-sky-100 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="size-4.5 text-sky-600" />
            Clinic Address Details
          </CardTitle>
          <CardAction onClick={() => setEditAddress((v) => !v)}>
            <Pencil className="size-3.5" />
            Edit Address
          </CardAction>
        </CardHeader>
        <CardContent className="pt-0">
          {editAddress ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="grid gap-2 md:col-span-2">
                  <Label>Address</Label>
                  <Textarea
                    rows={2}
                    value={addressDraft.address}
                    onChange={(e) => setAddressDraft((d) => ({ ...d, address: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Clinic Phone</Label>
                  <Input
                    value={addressDraft.phone}
                    onChange={(e) => setAddressDraft((d) => ({ ...d, phone: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Clinic Email</Label>
                  <Input
                    type="email"
                    value={addressDraft.email}
                    onChange={(e) => setAddressDraft((d) => ({ ...d, email: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveAddress} disabled={saving}>
                  <Save className="size-4" />
                  Save Address
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditAddress(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-x-8 gap-y-4 rounded-xl border border-sky-100 bg-sky-50/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <InfoField label="Clinic Name" value={clinic.name} />
                <InfoField label="Door / Building No." value="—" />
                <InfoField label="Street / Area" value={clinic.address ?? "—"} />
                <InfoField label="Landmark" value="—" />
                <InfoField label="City" value="—" />
                <InfoField label="District" value="—" />
                <InfoField label="State" value="—" />
                <InfoField label="Pincode" value="—" />
                <InfoField label="Country" value="—" />
                <InfoField label="Google Maps location" value={clinic.address ? "Available" : "—"} />
                <InfoField label="Clinic Phone" value={clinic.phone ?? "—"} />
                <InfoField label="Clinic Email" value={clinic.email ?? "—"} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(mapsUrl, "_blank", "noopener,noreferrer")}
                  className="gap-1.5 border-sky-200 text-sky-700 hover:bg-sky-50"
                >
                  <ExternalLink className="size-3.5" />
                  Open in Google Maps
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditAddress(true)}
                  className="gap-1.5 border-sky-200 text-sky-700 hover:bg-sky-50"
                >
                  <Pencil className="size-3.5" />
                  Edit Address
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 4. Contact & working hours */}
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card className="border-sky-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="size-4.5 text-sky-600" />
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 p-3">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <Phone className="size-4" />
                </span>
                <div>
                  <p className="text-xs text-slate-400">Primary Phone</p>
                  <p className="text-sm font-medium text-slate-800">{clinic.phone ?? "—"}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 p-3">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <MessageCircle className="size-4" />
                </span>
                <div>
                  <p className="text-xs text-slate-400">WhatsApp Number</p>
                  <p className="text-sm font-medium text-slate-800">{clinic.phone ?? "—"}</p>
                </div>
              </div>
              {clinic.phone && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    window.open(
                      `https://wa.me/${clinic.phone!.replace(/\D/g, "")}`,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                >
                  <ExternalLink className="size-3.5" />
                </Button>
              )}
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 p-3">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <Mail className="size-4" />
                </span>
                <div>
                  <p className="text-xs text-slate-400">Email</p>
                  <p className="text-sm font-medium text-slate-800">{clinic.email ?? "—"}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 p-3">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <Globe className="size-4" />
                </span>
                <div>
                  <p className="text-xs text-slate-400">Website</p>
                  <p className="truncate text-sm font-medium text-slate-800">
                    {clinic.website ?? "—"}
                  </p>
                </div>
              </div>
              {clinic.website && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    window.open(
                      clinic.website!.startsWith("http") ? clinic.website! : `https://${clinic.website!}`,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                >
                  <ExternalLink className="size-3.5" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-sky-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4.5 text-sky-600" />
              Working Hours
            </CardTitle>
            <CardAction onClick={() => setEditHours((v) => !v)}>
              <Pencil className="size-3.5" />
              Edit Working Hours
            </CardAction>
          </CardHeader>
          <CardContent className="pt-0">
            {editHours ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Open</Label>
                    <Input
                      type="time"
                      value={hoursDraft.open}
                      onChange={(e) => setHoursDraft((d) => ({ ...d, open: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Close</Label>
                    <Input
                      type="time"
                      value={hoursDraft.close}
                      onChange={(e) => setHoursDraft((d) => ({ ...d, close: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveHours} disabled={saving}>
                    <Save className="size-4" />
                    Save Hours
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditHours(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                  <span className="text-sm text-slate-600">Monday – Saturday</span>
                  <span className="text-sm font-medium text-slate-800">
                    {clinic.settings.workingHours.open} – {clinic.settings.workingHours.close}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                  <span className="text-sm text-slate-600">Sunday</span>
                  <span className="text-sm text-slate-400">—</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                  <span className="text-sm text-slate-600">Emergency Hours</span>
                  <span className="text-sm text-slate-400">—</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                  <span className="text-sm text-slate-600">Holiday / Closed</span>
                  <span className="text-sm text-slate-400">—</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 5. Clinic overview */}
      <div className="mb-4">
        <h2 className="mb-2 text-sm font-medium text-slate-700">Clinic Overview</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatTile icon={Users} label="Total Patients" value={stats.patients ?? null} loading={statsLoading} />
          <StatTile icon={Stethoscope} label="Active Doctors" value={stats.doctors ?? null} loading={statsLoading} />
          <StatTile icon={UserCog} label="Staff Members" value={stats.staff ?? null} loading={statsLoading} />
          <StatTile icon={CalendarDays} label="Appointments" value={stats.appointments ?? null} loading={statsLoading} />
          <StatTile icon={FileText} label="Prescriptions" value={stats.prescriptions ?? null} loading={statsLoading} />
          <StatTile icon={Building2} label="Departments" value={null} loading={false} />
        </div>
      </div>

      {/* 6. Account details */}
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card className="border-sky-100 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4.5 text-sky-600" />
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <DetailRow label="User ID" value={session?.userId ?? "—"} />
            <Separator />
            <DetailRow label="Clinic ID" value={clinicId || "—"} />
            <Separator />
            <DetailRow label="Role" value={roleLabel} />
            <Separator />
            <DetailRow label="Account Status" value="Active" />
            <Separator />
            <DetailRow
              label="Created Date"
              value={new Date(clinic.createdAt).toLocaleDateString("en-IN")}
            />
            <Separator />
            <DetailRow
              label="Last Updated"
              value={new Date(clinic.updatedAt).toLocaleDateString("en-IN")}
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* 7. WhatsApp connection */}
          <Card className="border-sky-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="size-4.5 text-sky-600" />
                WhatsApp Connection
              </CardTitle>
              <CardAction onClick={() => router.push("/clinic/settings")}>Manage Connection</CardAction>
            </CardHeader>
            <CardContent className="pt-0">
              {waSession === null ? (
                <p className="text-sm text-slate-400">Checking status…</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-2.5 rounded-full ${waConnected ? "bg-emerald-500" : "bg-amber-500"}`}
                    />
                    <span className="text-sm font-medium text-slate-800">
                      {waConnected ? "Connected" : waSession.state?.stage ?? "Unavailable"}
                    </span>
                  </div>
                  {waConnected && (
                    <p className="text-sm text-slate-500">
                      Connected WhatsApp number: <span className="font-medium text-slate-700">{waPhone ?? "—"}</span>
                    </p>
                  )}
                  <p className="text-xs text-slate-400">
                    Last updated:{" "}
                    {waSession.state?.updatedAt
                      ? new Date(waSession.state.updatedAt).toLocaleString("en-IN")
                      : "—"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 8. Session */}
          <Card className="border-sky-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Monitor className="size-4.5 text-sky-600" />
                Session
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Current device</span>
                <span className="font-medium text-slate-800">{deviceInfo.device}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Browser</span>
                <span className="font-medium text-slate-800">{deviceInfo.browser}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Last login</span>
                <span className="text-slate-400">—</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Login time</span>
                <span className="text-slate-400">—</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="mt-2 gap-1.5 text-slate-600"
              >
                <LogOut className="size-4" />
                Log out from this device
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 9. Recent notifications */}
      <Card className="mb-4 border-sky-100 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-4.5 text-sky-600" />
            Recent Notifications
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/clinic/notifications")}
            className="text-sky-700"
          >
            {unread > 0 && (
              <Badge variant="destructive" className="mr-1">
                {unread}
              </Badge>
            )}
            View All
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {notifications.length === 0 ? (
            <p className="py-4 text-sm text-slate-400">No notifications yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <li key={n.notificationId} className="flex items-start gap-3 py-2.5">
                  {!n.readAt && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-sky-500" />}
                  {n.readAt && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-transparent" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800">{n.title}</p>
                    {n.body && <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{n.body}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {new Date(n.createdAt).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 10. Clinic profile settings */}
      <div ref={settingsRef} className="scroll-mt-4">
        <Card className="border-sky-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4.5 text-sky-600" />
              Clinic Profile Settings
            </CardTitle>
            <CardAction
              onClick={() => {
                setProfileDraft({
                  name: clinic.name,
                  description: clinic.description ?? "",
                  website: clinic.website ?? "",
                });
                toast.success("Profile form reset to saved values");
              }}
            >
              Manage Clinic Profile
            </CardAction>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="mb-4 flex items-center gap-3">
              <Avatar className="size-12 border-2 border-sky-100">
                <AvatarFallback className="bg-sky-50 text-sm text-sky-700">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-slate-800">Clinic Logo</p>
                <p className="text-xs text-slate-400">Initials are shown until a logo is uploaded</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Clinic Name</Label>
                <Input
                  value={profileDraft.name}
                  onChange={(e) => setProfileDraft((d) => ({ ...d, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Website</Label>
                <Input
                  value={profileDraft.website}
                  placeholder="https://myclinic.example.com"
                  onChange={(e) => setProfileDraft((d) => ({ ...d, website: e.target.value }))}
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label>Clinic Description</Label>
                <Textarea
                  rows={3}
                  value={profileDraft.description}
                  placeholder="Tell patients what your clinic is about..."
                  onChange={(e) =>
                    setProfileDraft((d) => ({ ...d, description: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Services</Label>
                <Input disabled placeholder="Coming soon" />
              </div>
              <div className="grid gap-2">
                <Label>Specialties</Label>
                <Input disabled placeholder="Coming soon" />
              </div>
              <div className="grid gap-2">
                <Label>Consultation Information</Label>
                <Input disabled placeholder="Coming soon" />
              </div>
              <div className="grid gap-2">
                <Label>Social Links</Label>
                <Input disabled placeholder="Coming soon" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={saveProfile} disabled={saving}>
                <Save className="size-4" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
        <Landmark className="size-3.5" />
        MyClinics · Clinic Profile
      </p>
    </div>
  );
}