"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRequireRole, sessionCan } from "@/hooks/use-clinic-session";
import {
  type Clinic,
  type ClinicProfile,
  getAvatarUrl,
  getOwnClinic,
  updateOwnClinic,
  uploadAvatar,
} from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Camera,
  ClipboardList,
  Info,
  LogOut,
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

function formOf(clinic: Clinic): FormState {
  return {
    name: clinic.name ?? "",
    phone: clinic.phone ?? "",
    email: clinic.email ?? "",
    website: clinic.website ?? "",
    description: clinic.description ?? "",
    openTime: clinic.settings?.workingHours?.open ?? "09:00",
    closeTime: clinic.settings?.workingHours?.close ?? "18:00",
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

  const canManage = sessionCan(session, "clinic_admin");

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
          workingHours: { open: form.openTime, close: form.closeTime },
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

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clinic Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your clinic&apos;s basic details, contact, address and information.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          Logout
        </Button>
      </div>

      <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border bg-muted/20 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Logo
                logoUrl={logoUrl}
                name={clinic.name}
                editing={editing && canManage}
                onUpload={handleLogoUpload}
              />
              <div>
                <CardTitle className="text-xl font-semibold text-foreground">
                  {clinic.name || "My Clinic"}
                </CardTitle>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                  <Badge
                    variant="outline"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200"
                  >
                    <span className="mr-1.5 size-1.5 rounded-full bg-emerald-500" />
                    {clinic.status}
                  </Badge>
                  <span className="text-muted-foreground">
                    Clinic ID: <span className="font-mono">{clinic.clinicId}</span>
                  </span>
                </div>
              </div>
            </div>
            {!editing && canManage ? (
              <Button variant="outline" className="gap-1.5" onClick={startEdit}>
                <Pencil className="size-4" />
                Edit Profile
              </Button>
            ) : !editing ? (
              <p className="text-sm text-muted-foreground">
                Only clinic administrators can edit the profile.
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" className="gap-1.5" onClick={() => setEditing(false)}>
                  <X className="size-4" />
                  Cancel
                </Button>
                <Button className="gap-1.5" onClick={handleSave} disabled={saving}>
                  <Save className="size-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Section
            icon={<Building2 className="size-4 text-primary" />}
            title="Basic Details"
            description="Clinic identity and registration information."
          >
            <FieldGrid cols={3}>
              {editing ? (
                <Field label="Clinic Name" className="col-span-3">
                  <Input
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    required
                    minLength={2}
                  />
                </Field>
              ) : (
                <Field label="Clinic Name" value={clinic.name} className="col-span-3" />
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
          </Section>

          <Section
            icon={<Phone className="size-4 text-primary" />}
            title="Contact Details"
            description="How patients can reach your clinic."
          >
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
          </Section>

          <Section
            icon={<MapPin className="size-4 text-primary" />}
            title="Clinic Address"
            description="Physical location of the clinic."
          >
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
                  <Input
                    value={form.profile.pincode ?? ""}
                    onChange={(e) => setProfile({ pincode: e.target.value })}
                    placeholder="6-digit pincode"
                  />
                ) : (
                  orDash(profile.pincode)
                )}
              </Field>
            </FieldGrid>
          </Section>

          <Section
            icon={<Info className="size-4 text-primary" />}
            title="Clinic Information"
            description="About the clinic, its specialties and services."
          >
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
              <Field label="Working Hours">
                {editing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      value={form.openTime}
                      onChange={(e) => set("openTime", e.target.value)}
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={form.closeTime}
                      onChange={(e) => set("closeTime", e.target.value)}
                    />
                  </div>
                ) : (
                  orDash(
                    clinic.settings?.workingHours
                      ? `${clinic.settings.workingHours.open} – ${clinic.settings.workingHours.close}`
                      : null
                  )
                )}
              </Field>
            </FieldGrid>
          </Section>

          <Section
            icon={<ClipboardList className="size-4 text-primary" />}
            title="Additional Details"
            description="Emergency contact, tax information and social media links."
          >
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
          </Section>

          <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-6 py-4">
            {!editing && canManage ? (
              <Button variant="outline" className="gap-1.5" onClick={startEdit}>
                <Pencil className="size-4" />
                Edit Profile
              </Button>
            ) : !editing ? (
              <p className="text-sm text-muted-foreground">
                Only clinic administrators can edit the profile.
              </p>
            ) : (
              <>
                <Button variant="outline" className="gap-1.5" onClick={() => setEditing(false)}>
                  <X className="size-4" />
                  Cancel
                </Button>
                <Button className="gap-1.5" onClick={handleSave} disabled={saving}>
                  <Save className="size-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
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
  cols: 1 | 2 | 3;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`grid gap-4 ${
        cols === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : cols === 2 ? "sm:grid-cols-2" : ""
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
          className="size-20 rounded-full border border-border object-cover"
        />
      ) : (
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
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