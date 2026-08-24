"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useRequireRole, sessionCan } from "@/hooks/use-clinic-session";
import {
  type Clinic,
  type ClinicProfile,
  type WeeklyScheduleDay,
  getAvatarUrl,
  getOwnClinic,
  updateOwnClinic,
  uploadAvatar,
} from "@/lib/clinic-api";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Calendar,
  Camera,
  ClipboardList,
  FileText,
  Globe,
  Info,
  Link as LinkIcon,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

const CLINIC_TYPES = [
  "General Clinic",
  "Polyclinic",
  "Dental Clinic",
  "Eye Clinic",
  "Skin Clinic",
  "Child Care / Pediatrics",
  "Physiotherapy Clinic",
  "Diagnostics / Lab",
  "Ayurveda / Homeopathy",
  "Hospital",
  "Other",
];

const EMPTY_PROFILE: ClinicProfile = {
  clinicType: null,
  registrationNumber: null,
  establishedYear: null,
  whatsapp: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  state: null,
  country: null,
  pincode: null,
  specializations: [],
  services: [],
  emergencyContact: null,
  gstNumber: null,
  taxBusinessId: null,
  socialMedia: { facebook: null, instagram: null, twitter: null, linkedin: null },
};

interface FormState {
  name: string;
  phone: string;
  email: string;
  website: string;
  description: string;
  openTime: string;
  closeTime: string;
  weeklySchedule: WeeklyScheduleDay[];
  profile: ClinicProfile;
}

function profileOf(clinic: Clinic): ClinicProfile {
  return {
    ...EMPTY_PROFILE,
    ...clinic.profile,
    specializations: clinic.profile?.specializations ?? [],
    services: clinic.profile?.services ?? [],
    socialMedia: { ...EMPTY_PROFILE.socialMedia, ...clinic.profile?.socialMedia },
  };
}

function getInitialWeeklySchedule(clinic: Clinic): WeeklyScheduleDay[] {
  if (clinic.settings?.weeklySchedule && clinic.settings.weeklySchedule.length > 0) {
    return clinic.settings.weeklySchedule;
  }
  const open = clinic.settings?.workingHours?.open ?? "09:00";
  const close = clinic.settings?.workingHours?.close ?? "18:00";
  return [
    { day: "Monday", open, close, closed: false },
    { day: "Tuesday", open, close, closed: false },
    { day: "Wednesday", open, close, closed: false },
    { day: "Thursday", open, close, closed: false },
    { day: "Friday", open, close, closed: false },
    { day: "Saturday", open, close, closed: false },
    { day: "Sunday", open, close, closed: true },
  ];
}

function formOf(clinic: Clinic): FormState {
  return {
    name: clinic.name ?? "",
    phone: clinic.phone ?? "",
    email: clinic.email ?? "",
    website: clinic.website ?? "",
    description: clinic.description ?? "",
    openTime: clinic.settings?.workingHours?.open ?? "09:00",
    closeTime: clinic.settings?.workingHours?.close ?? "18:00",
    weeklySchedule: getInitialWeeklySchedule(clinic),
    profile: profileOf(clinic),
  };
}

function orDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function listToText(list: string[] | null | undefined): string {
  return (list ?? []).join(", ");
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Convert a 24-hour "HH:mm" value into a 12-hour "h:mm AM/PM" label. */
function formatTime12h(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const hours = Number(match[1]);
  const minutes = match[2];
  if (Number.isNaN(hours)) return value;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${minutes} ${period}`;
}

export default function AccountPage() {
  const session = useRequireRole("staff");
  const clinicId = session?.clinicId ?? "";
  const router = useRouter();

  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);

  const [pincodeLookingUp, setPincodeLookingUp] = useState(false);
  const [pincodeMessage, setPincodeMessage] = useState<string | null>(null);
  const pincodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pincodeSeqRef = useRef(0);

  const canManage = sessionCan(session, "clinic_admin");

  useEffect(() => {
    return () => {
      if (pincodeTimerRef.current) clearTimeout(pincodeTimerRef.current);
    };
  }, []);

  function handlePincodeChange(value: string) {
    const pincode = value.replace(/\D/g, "").slice(0, 6);
    setProfile({ pincode: pincode || null });
    setPincodeMessage(null);
    if (pincodeTimerRef.current) clearTimeout(pincodeTimerRef.current);
    if (!/^[1-9]\d{5}$/.test(pincode)) return;
    pincodeTimerRef.current = setTimeout(async () => {
      const seq = ++pincodeSeqRef.current;
      setPincodeLookingUp(true);
      try {
        const res = await fetch(`/pincode/${pincode}`);
        if (seq !== pincodeSeqRef.current) return;
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          setPincodeMessage(body?.error ?? "Could not find this pincode");
          return;
        }
        const body = (await res.json()) as { city: string; state: string };
        setProfile({ city: body.city, state: body.state, country: "India" });
        setPincodeMessage("City and State filled from pincode");
      } catch {
        if (seq !== pincodeSeqRef.current) return;
        setPincodeMessage("Pincode lookup failed");
      } finally {
        if (seq === pincodeSeqRef.current) setPincodeLookingUp(false);
      }
    }, 600);
  }

  const load = useCallback(() => {
    if (!clinicId) return;
    getOwnClinic(clinicId)
      .then((res) => {
        setClinic(res);
        setForm(formOf(res));
      })
      .catch(() => toast.error("Failed to load clinic profile"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!clinicId) return;
    let active = true;
    getAvatarUrl(clinicId, "clinic", clinicId)
      .then((res) => {
        if (active) setLogoUrl(res.url);
      })
      .catch(() => setLogoUrl(null));
    return () => {
      active = false;
    };
  }, [clinicId]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const setProfile = (patch: Partial<ClinicProfile>) =>
    setForm((f) => (f ? { ...f, profile: { ...f.profile, ...patch } } : f));

  const setSocial = (key: keyof ClinicProfile["socialMedia"], value: string) =>
    setForm((f) =>
      f
        ? { ...f, profile: { ...f.profile, socialMedia: { ...f.profile.socialMedia, [key]: value } } }
        : f
    );

  function startEdit() {
    if (!clinic) return;
    setForm(formOf(clinic));
    setEditing(true);
  }

  async function handleLogoUpload(file: File) {
    if (!clinicId || !clinic) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Only JPG or PNG images are allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB");
      return;
    }
    try {
      const res = await uploadAvatar(clinicId, "clinic", clinicId, file);
      setLogoUrl(res.url);
      toast.success("Clinic logo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to upload logo");
    }
  }

  async function handleSave() {
    if (!clinicId || !form) return;
    setSaving(true);
    try {
      const split = (text: string) =>
        text
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);

      await updateOwnClinic(clinicId, {
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        description: form.description || null,
        settings: {
          workingHours: {
            open: form.weeklySchedule.find((d) => !d.closed)?.open ?? "09:00",
            close: form.weeklySchedule.find((d) => !d.closed)?.close ?? "18:00",
          },
          weeklySchedule: form.weeklySchedule,
        },
        profile: {
          clinicType: form.profile.clinicType || null,
          registrationNumber: form.profile.registrationNumber || null,
          establishedYear: form.profile.establishedYear,
          whatsapp: form.profile.whatsapp || null,
          addressLine1: form.profile.addressLine1 || null,
          addressLine2: form.profile.addressLine2 || null,
          city: form.profile.city || null,
          state: form.profile.state || null,
          country: form.profile.country || null,
          pincode: form.profile.pincode || null,
          specializations: split(listToText(form.profile.specializations)),
          services: split(listToText(form.profile.services)),
          emergencyContact: form.profile.emergencyContact || null,
          gstNumber: form.profile.gstNumber || null,
          taxBusinessId: form.profile.taxBusinessId || null,
          socialMedia: {
            facebook: form.profile.socialMedia.facebook || null,
            instagram: form.profile.socialMedia.instagram || null,
            twitter: form.profile.socialMedia.twitter || null,
            linkedin: form.profile.socialMedia.linkedin || null,
          },
        },
      });
      toast.success("Clinic profile updated");
      setEditing(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save clinic profile");
    } finally {
      setSaving(false);
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("clinic_token");
    document.cookie = "clinic_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/login");
  };

  const profile = useMemo(() => (clinic ? profileOf(clinic) : EMPTY_PROFILE), [clinic]);

  if (loading || !clinic || !form) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-9 w-48 rounded-lg" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const locationLabel =
    [profile.city, profile.state].filter(Boolean).join(", ") || "—";
  const joinedDateLabel = clinic.createdAt
    ? `Joined ${new Date(clinic.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
    : "Joined —";
  const handleLabel = clinic.email || clinic.slug || clinic.clinicId;
  const bioText = clinic.description || "No description provided.";
  const stats = [
    { label: "Established", value: orDash(profile.establishedYear) },
    { label: "Specializations", value: String(profile.specializations?.length ?? 0) },
    { label: "Services", value: String(profile.services?.length ?? 0) },
  ];

  return (
    <div className="w-full min-h-[calc(100vh-4rem)]">
      <section className="w-full min-h-[calc(100vh-4rem)] rounded-xl border border-border bg-background overflow-hidden flex flex-col">
        <div
          className="h-32 w-full bg-linear-to-br from-foreground/15 via-muted to-muted-foreground/10"
          aria-hidden="true"
        />

        <div className="px-6 pb-6">
          <div className="flex items-end justify-between gap-4">
            <div className="-mt-10">
              <Logo
                logoUrl={logoUrl}
                name={clinic.name}
                editing={editing && canManage}
                onUpload={handleLogoUpload}
              />
            </div>
            <div className="flex items-center gap-2 pt-4">
              {!editing && canManage ? (
                <>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={startEdit}>
                    <Pencil className="size-4" />
                    Edit Profile
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleLogout}
                  >
                    <LogOut className="size-4" />
                    Logout
                  </Button>
                </>
              ) : !editing ? (
                <>
                  <p className="hidden text-sm text-muted-foreground sm:block">
                    Only clinic administrators can edit the profile.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleLogout}
                  >
                    <LogOut className="size-4" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(false)}>
                    <X className="size-4" />
                    Cancel
                  </Button>
                  <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
                    <Save className="size-4" />
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleLogout}
                  >
                    <LogOut className="size-4" />
                    Logout
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
              {clinic.name || "My Clinic"}
            </h2>
            <Badge
              variant="outline"
              className="bg-success/10 text-success border-success/25"
            >
              <span className="mr-1.5 size-1.5 rounded-full bg-success" />
              {clinic.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">@{handleLabel}</p>
          <p className="mt-3 text-sm/relaxed text-foreground/80">{bioText}</p>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {stats.map((stat) => (
              <span key={stat.label} className="flex items-baseline gap-1.5">
                <span className="font-semibold tabular-nums">{stat.value}</span>
                <span className="text-muted-foreground">{stat.label}</span>
              </span>
            ))}
          </div>

          <ul className="mt-4 flex flex-col gap-2.5">
            <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              {locationLabel}
            </li>
            <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Globe className="size-4 shrink-0" aria-hidden="true" />
              {clinic.website ? (
                <a href={clinic.website} target="_blank" rel="noreferrer" className="hover:underline">
                  {clinic.website}
                </a>
              ) : (
                "—"
              )}
            </li>
            <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Calendar className="size-4 shrink-0" aria-hidden="true" />
              {joinedDateLabel}
            </li>
            <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Mail className="size-4 shrink-0" aria-hidden="true" />
              {orDash(clinic.email)}
            </li>
            <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Phone className="size-4 shrink-0" aria-hidden="true" />
              {orDash(clinic.phone)}
            </li>
          </ul>

          <Tabs defaultValue="overview" className="mt-6 gap-4">
            <TabsList className="w-full">
              <TabsTrigger value="overview" className="flex-1">
                Overview
              </TabsTrigger>
              <TabsTrigger value="contact" className="flex-1">
                Contact
              </TabsTrigger>
              <TabsTrigger value="practice" className="flex-1">
                Practice
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="flex flex-col gap-6">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Building2 className="size-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Basic Details</h3>
                </div>
                <FieldGrid cols={4}>
                  {editing ? (
                    <Field label="Clinic Name">
                      <Input
                        value={form.name}
                        onChange={(e) => set("name", e.target.value)}
                        required
                        minLength={2}
                      />
                    </Field>
                  ) : (
                    <Field label="Clinic Name" value={clinic.name} />
                  )}
                  <Field label="Clinic Type">
                    {editing ? (
                      <Select
                        value={form.profile.clinicType ?? ""}
                        onValueChange={(v) => setProfile({ clinicType: v || null })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select clinic type" />
                        </SelectTrigger>
                        <SelectContent>
                          {form.profile.clinicType &&
                            !CLINIC_TYPES.includes(form.profile.clinicType) && (
                              <SelectItem value={form.profile.clinicType}>
                                {form.profile.clinicType}
                              </SelectItem>
                            )}
                          {CLINIC_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      orDash(profile.clinicType)
                    )}
                  </Field>
                  <Field label="Registration Number">
                    {editing ? (
                      <Input
                        value={form.profile.registrationNumber ?? ""}
                        onChange={(e) => setProfile({ registrationNumber: e.target.value })}
                        placeholder="e.g. MC-12345/2020"
                      />
                    ) : (
                      orDash(profile.registrationNumber)
                    )}
                  </Field>
                  <Field label="Established Year">
                    {editing ? (
                      <Input
                        type="number"
                        min={1900}
                        max={2100}
                        value={form.profile.establishedYear ?? ""}
                        onChange={(e) =>
                          setProfile({
                            establishedYear: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        placeholder="e.g. 2015"
                      />
                    ) : (
                      orDash(profile.establishedYear)
                    )}
                  </Field>
                </FieldGrid>
              </div>

              <Separator />

              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Info className="size-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Clinic Information</h3>
                </div>
                <FieldGrid cols={2}>
                  <Field label="About Clinic" className="col-span-2">
                    {editing ? (
                      <Textarea
                        value={form.description}
                        onChange={(e) => set("description", e.target.value)}
                        rows={3}
                        placeholder="Short description of your clinic..."
                      />
                    ) : (
                      orDash(clinic.description)
                    )}
                  </Field>
                  <Field label="Specializations" className="col-span-2">
                    {editing ? (
                      <Input
                        value={listToText(form.profile.specializations)}
                        onChange={(e) =>
                          setProfile({
                            specializations: e.target.value
                              .split(",")
                              .map((v) => v.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="Cardiology, Pediatrics (comma separated)"
                      />
                    ) : (
                      orDash(listToText(profile.specializations))
                    )}
                  </Field>
                  <Field label="Services Offered" className="col-span-2">
                    {editing ? (
                      <Input
                        value={listToText(form.profile.services)}
                        onChange={(e) =>
                          setProfile({
                            services: e.target.value
                              .split(",")
                              .map((v) => v.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="Consultation, Vaccination, Lab tests (comma separated)"
                      />
                    ) : (
                      orDash(listToText(profile.services))
                    )}
                  </Field>
                </FieldGrid>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="flex flex-col gap-6">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Phone className="size-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Contact Details</h3>
                </div>
                <FieldGrid cols={3}>
                  <Field label="Phone Number">
                    {editing ? (
                      <Input
                        value={form.phone}
                        onChange={(e) => set("phone", e.target.value)}
                        placeholder="+91 98765 43210"
                      />
                    ) : (
                      orDash(clinic.phone)
                    )}
                  </Field>
                  <Field label="WhatsApp Number">
                    {editing ? (
                      <Input
                        value={form.profile.whatsapp ?? ""}
                        onChange={(e) => setProfile({ whatsapp: e.target.value })}
                        placeholder="+91 98765 43210"
                      />
                    ) : (
                      orDash(profile.whatsapp)
                    )}
                  </Field>
                  <Field label="Email Address">
                    {editing ? (
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="clinic@example.com"
                      />
                    ) : (
                      orDash(clinic.email)
                    )}
                  </Field>
                  <Field label="Website">
                    {editing ? (
                      <Input
                        value={form.website}
                        onChange={(e) => set("website", e.target.value)}
                        placeholder="https://clinic.example.com"
                      />
                    ) : (
                      orDash(clinic.website)
                    )}
                  </Field>
                </FieldGrid>
              </div>

              <Separator />

              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <MapPin className="size-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Clinic Address</h3>
                </div>
                <FieldGrid cols={3}>
                  <Field label="Address Line 1" className="col-span-3">
                    {editing ? (
                      <Input
                        value={form.profile.addressLine1 ?? ""}
                        onChange={(e) => setProfile({ addressLine1: e.target.value })}
                        placeholder="House no, street, locality"
                      />
                    ) : (
                      orDash(profile.addressLine1)
                    )}
                  </Field>
                  <Field label="Address Line 2" className="col-span-3">
                    {editing ? (
                      <Input
                        value={form.profile.addressLine2 ?? ""}
                        onChange={(e) => setProfile({ addressLine2: e.target.value })}
                        placeholder="Near landmark, area"
                      />
                    ) : (
                      orDash(profile.addressLine2)
                    )}
                  </Field>
                  <Field label="City">
                    {editing ? (
                      <Input
                        value={form.profile.city ?? ""}
                        onChange={(e) => setProfile({ city: e.target.value })}
                        placeholder="City"
                      />
                    ) : (
                      orDash(profile.city)
                    )}
                  </Field>
                  <Field label="State">
                    {editing ? (
                      <Input
                        value={form.profile.state ?? ""}
                        onChange={(e) => setProfile({ state: e.target.value })}
                        placeholder="State"
                      />
                    ) : (
                      orDash(profile.state)
                    )}
                  </Field>
                  <Field label="Country">
                    {editing ? (
                      <Input
                        value={form.profile.country ?? ""}
                        onChange={(e) => setProfile({ country: e.target.value })}
                        placeholder="Country"
                      />
                    ) : (
                      orDash(profile.country)
                    )}
                  </Field>
                  <Field label="Pincode">
                    {editing ? (
                      <div className="space-y-1">
                        <div className="relative">
                          <Input
                            value={form.profile.pincode ?? ""}
                            onChange={(e) => handlePincodeChange(e.target.value)}
                            placeholder="6-digit pincode"
                            maxLength={6}
                            inputMode="numeric"
                          />
                          {pincodeLookingUp && (
                            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-primary" />
                          )}
                        </div>
                        {pincodeMessage && (
                          <p className="flex items-center gap-1 text-xs text-primary">
                            <MapPin className="size-3" />
                            {pincodeMessage}
                          </p>
                        )}
                      </div>
                    ) : (
                      orDash(profile.pincode)
                    )}
                  </Field>
                </FieldGrid>
              </div>
            </TabsContent>

            <TabsContent value="practice" className="flex flex-col gap-6">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <FileText className="size-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Working Hours</h3>
                </div>
                <Field label="Weekly Schedule" className="w-full">
                  {editing ? (
                    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                      {form.weeklySchedule.map((sched, idx) => (
                        <div
                          key={sched.day}
                          className="flex items-center justify-between gap-4 py-1.5 border-b border-border/50 last:border-0"
                        >
                          <span className="w-24 text-sm font-medium">{sched.day}</span>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!sched.closed}
                                onChange={(e) => {
                                  const next = [...form.weeklySchedule];
                                  next[idx] = { ...sched, closed: !e.target.checked };
                                  set("weeklySchedule", next);
                                }}
                                className="rounded border-input text-primary focus:ring-ring"
                              />
                              <span className="text-xs text-muted-foreground">Open</span>
                            </label>
                            {!sched.closed ? (
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="time"
                                  value={sched.open}
                                  onChange={(e) => {
                                    const next = [...form.weeklySchedule];
                                    next[idx] = { ...sched, open: e.target.value };
                                    set("weeklySchedule", next);
                                  }}
                                  className="h-8 w-24 px-2 py-1 text-xs"
                                />
                                <span className="text-xs text-muted-foreground">to</span>
                                <Input
                                  type="time"
                                  value={sched.close}
                                  onChange={(e) => {
                                    const next = [...form.weeklySchedule];
                                    next[idx] = { ...sched, close: e.target.value };
                                    set("weeklySchedule", next);
                                  }}
                                  className="h-8 w-24 px-2 py-1 text-xs"
                                />
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground w-56 text-right pr-6 font-semibold">
                                Closed
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-muted-foreground">
                      {getInitialWeeklySchedule(clinic).map((sched) => (
                        <div
                          key={sched.day}
                          className="flex justify-between py-0.5 border-b border-border/30 last:border-0 sm:border-b-0"
                        >
                          <span className="font-medium text-foreground">{sched.day}</span>
                          <span>
                            {sched.closed
                              ? "Closed"
                              : `${formatTime12h(sched.open)} – ${formatTime12h(sched.close)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Field>
              </div>

              <Separator />

              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <ClipboardList className="size-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Additional Details</h3>
                </div>
                <FieldGrid cols={2}>
                  <Field label="Emergency Contact">
                    {editing ? (
                      <Input
                        value={form.profile.emergencyContact ?? ""}
                        onChange={(e) => setProfile({ emergencyContact: e.target.value })}
                        placeholder="+91 98765 43210"
                      />
                    ) : (
                      orDash(profile.emergencyContact)
                    )}
                  </Field>
                  <Field label="GST Number">
                    {editing ? (
                      <Input
                        value={form.profile.gstNumber ?? ""}
                        onChange={(e) => setProfile({ gstNumber: e.target.value })}
                        placeholder="22AAAAA0000A1Z5"
                      />
                    ) : (
                      orDash(profile.gstNumber)
                    )}
                  </Field>
                  <Field label="Tax / Business ID">
                    {editing ? (
                      <Input
                        value={form.profile.taxBusinessId ?? ""}
                        onChange={(e) => setProfile({ taxBusinessId: e.target.value })}
                        placeholder="Business / tax registration ID"
                      />
                    ) : (
                      orDash(profile.taxBusinessId)
                    )}
                  </Field>
                  <Field label="Social Media Links" className="col-span-2">
                    {editing ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input
                          value={form.profile.socialMedia.facebook ?? ""}
                          onChange={(e) => setSocial("facebook", e.target.value)}
                          placeholder="Facebook URL"
                        />
                        <Input
                          value={form.profile.socialMedia.instagram ?? ""}
                          onChange={(e) => setSocial("instagram", e.target.value)}
                          placeholder="Instagram URL"
                        />
                        <Input
                          value={form.profile.socialMedia.twitter ?? ""}
                          onChange={(e) => setSocial("twitter", e.target.value)}
                          placeholder="Twitter / X URL"
                        />
                        <Input
                          value={form.profile.socialMedia.linkedin ?? ""}
                          onChange={(e) => setSocial("linkedin", e.target.value)}
                          placeholder="LinkedIn URL"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-x-6 gap-y-1">
                        <span>Facebook: {orDash(profile.socialMedia.facebook)}</span>
                        <span>Instagram: {orDash(profile.socialMedia.instagram)}</span>
                        <span>Twitter: {orDash(profile.socialMedia.twitter)}</span>
                        <span>LinkedIn: {orDash(profile.socialMedia.linkedin)}</span>
                      </div>
                    )}
                  </Field>
                </FieldGrid>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="px-6 py-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
      <Separator className="mt-6" />
    </section>
  );
}

function FieldGrid({
  cols,
  children,
}: {
  cols: 1 | 2 | 3 | 4;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`grid gap-4 ${
        cols === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : cols === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : cols === 2 ? "sm:grid-cols-2" : ""
      }`}
    >
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  children,
  className = "",
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      {value !== undefined ? (
        <p className="text-sm font-medium text-foreground">{orDash(value)}</p>
      ) : (
        children
      )}
    </div>
  );
}

function Logo({
  logoUrl,
  name,
  editing,
  onUpload,
}: {
  logoUrl: string | null;
  name: string;
  editing: boolean;
  onUpload: (file: File) => void;
}) {
  return (
    <div className="relative">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={`${name} logo`}
          className="size-20 rounded-full border-4 border-background object-cover shadow-sm"
        />
      ) : (
        <div className="flex size-20 items-center justify-center rounded-full border-4 border-background bg-primary/10 text-2xl font-bold text-primary shadow-sm">
          {name ? name.charAt(0).toUpperCase() : "C"}
        </div>
      )}
      {editing && (
        <label className="absolute -bottom-1 -right-1 flex size-7 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-sm hover:bg-primary/90">
          <Camera className="size-3.5" />
          <input
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onUpload(file);
            }}
          />
        </label>
      )}
    </div>
  );
}
