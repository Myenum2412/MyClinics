"use client";

import * as React from "react";
import { toast } from "sonner";
import { CheckIcon, Loader2Icon, SaveIcon, Undo2Icon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type ProfileUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  image: string | null;
  phone: string | null;
  specialization: string | null;
  qualifications: string | null;
  bio: string | null;
  createdAt: string | null;
};

export type CompanyDetails = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  description: string | null;
};

const DRAFT_KEY = "myclinic:profile-draft:v1";

type Draft = {
  user: {
    name: string;
    phone: string;
    specialization: string;
    qualifications: string;
    bio: string;
  };
  company: {
    name: string;
    phone: string;
    email: string;
    address: string;
    website: string;
    description: string;
  };
};

function loadDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Counter({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return (
    <span
      className={cn(
        "text-right text-xs tabular-nums",
        over ? "font-medium text-destructive" : "text-muted-foreground"
      )}
    >
      {value.length.toLocaleString()} / {max.toLocaleString()}
    </span>
  );
}

export function ProfileView({
  initialUser,
  initialCompany,
}: {
  initialUser: ProfileUser;
  initialCompany: CompanyDetails;
}) {
  const [draft] = React.useState(loadDraft);
  const restoredFromDraft = Boolean(draft);

  const [user, setUser] = React.useState(initialUser);
  const [company, setCompany] = React.useState(initialCompany);

  const [name, setName] = React.useState(draft?.user?.name ?? initialUser.name);
  const [phone, setPhone] = React.useState(
    draft?.user?.phone ?? initialUser.phone ?? ""
  );
  const [specialization, setSpecialization] = React.useState(
    draft?.user?.specialization ?? initialUser.specialization ?? ""
  );
  const [qualifications, setQualifications] = React.useState(
    draft?.user?.qualifications ?? initialUser.qualifications ?? ""
  );
  const [bio, setBio] = React.useState(draft?.user?.bio ?? initialUser.bio ?? "");

  const [clinicName, setClinicName] = React.useState(
    draft?.company?.name ?? initialCompany.name
  );
  const [clinicPhone, setClinicPhone] = React.useState(
    draft?.company?.phone ?? initialCompany.phone ?? ""
  );
  const [clinicEmail, setClinicEmail] = React.useState(
    draft?.company?.email ?? initialCompany.email ?? ""
  );
  const [clinicAddress, setClinicAddress] = React.useState(
    draft?.company?.address ?? initialCompany.address ?? ""
  );
  const [clinicWebsite, setClinicWebsite] = React.useState(
    draft?.company?.website ?? initialCompany.website ?? ""
  );
  const [clinicDescription, setClinicDescription] = React.useState(
    draft?.company?.description ?? initialCompany.description ?? ""
  );
  const [saving, setSaving] = React.useState(false);

  const dirty =
    name !== user.name ||
    phone !== (user.phone ?? "") ||
    specialization !== (user.specialization ?? "") ||
    qualifications !== (user.qualifications ?? "") ||
    bio !== (user.bio ?? "") ||
    clinicName !== company.name ||
    clinicPhone !== (company.phone ?? "") ||
    clinicEmail !== (company.email ?? "") ||
    clinicAddress !== (company.address ?? "") ||
    clinicWebsite !== (company.website ?? "") ||
    clinicDescription !== (company.description ?? "");

  React.useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            user: { name, phone, specialization, qualifications, bio },
            company: {
              name: clinicName,
              phone: clinicPhone,
              email: clinicEmail,
              address: clinicAddress,
              website: clinicWebsite,
              description: clinicDescription,
            },
          } satisfies Draft)
        );
      } catch {
        /* ignore */
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [
    dirty,
    name,
    phone,
    specialization,
    qualifications,
    bio,
    clinicName,
    clinicPhone,
    clinicEmail,
    clinicAddress,
    clinicWebsite,
    clinicDescription,
  ]);

  async function handleSave() {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const [userRes, companyRes] = await Promise.all([
        fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, phone, specialization, qualifications, bio }),
        }),
        fetch("/api/organization", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: clinicName,
            phone: clinicPhone,
            email: clinicEmail,
            address: clinicAddress,
            website: clinicWebsite,
            description: clinicDescription,
          }),
        }),
      ]);
      const userData = await userRes.json();
      const companyData = await companyRes.json();

      if (!userRes.ok || !companyRes.ok) {
        toast.error(
          userData.error ?? companyData.error ?? "Could not save your changes."
        );
        return;
      }

      setUser(userData.user);
      setCompany(companyData.company);
      clearDraft();
      toast.success("Profile saved.");
    } catch {
      toast.error("Could not save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleRevert() {
    setName(initialUser.name);
    setPhone(initialUser.phone ?? "");
    setSpecialization(initialUser.specialization ?? "");
    setQualifications(initialUser.qualifications ?? "");
    setBio(initialUser.bio ?? "");
    setClinicName(initialCompany.name);
    setClinicPhone(initialCompany.phone ?? "");
    setClinicEmail(initialCompany.email ?? "");
    setClinicAddress(initialCompany.address ?? "");
    setClinicWebsite(initialCompany.website ?? "");
    setClinicDescription(initialCompany.description ?? "");
    clearDraft();
    toast.success("Discarded unsaved changes.");
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage src={user.image ?? undefined} alt={name} />
              <AvatarFallback>{initials(name || "User")}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">
                  {name || "Your profile"}
                </h1>
                <Badge variant="secondary" className="capitalize">
                  {user.role}
                </Badge>
              </div>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              {dirty && (
                <p className="text-xs text-muted-foreground">
                  {restoredFromDraft
                    ? "Restored unsaved edits from this device."
                    : "You have unsaved changes."}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-sm",
                dirty ? "text-amber-600" : "text-muted-foreground"
              )}
            >
              {dirty ? (
                <>
                  <span className="size-2 rounded-full bg-amber-500" />
                  Unsaved changes
                </>
              ) : (
                <>
                  <CheckIcon className="size-4 text-emerald-500" />
                  All changes saved
                </>
              )}
            </span>
            {dirty && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRevert}
                disabled={saving}
              >
                <Undo2Icon aria-hidden="true" />
                Revert
              </Button>
            )}
            <Button size="sm" onClick={() => void handleSave()} disabled={!dirty || saving}>
              {saving ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="flex flex-col gap-4 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Personal information</CardTitle>
              <CardDescription>
                Shown to your patients and used by the WhatsApp AI.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="profile-name">Full name</FieldLabel>
                    <Input
                      id="profile-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={100}
                      placeholder="Dr. John Doe"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="profile-phone">Phone</FieldLabel>
                    <Input
                      id="profile-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={30}
                      placeholder="+91 98765 43210"
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="profile-email">Email</FieldLabel>
                  <Input
                    id="profile-email"
                    type="email"
                    value={user.email}
                    readOnly
                    disabled
                  />
                  <FieldDescription>
                    Email is your login and cannot be changed.
                  </FieldDescription>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="profile-specialization">
                      Specialization
                    </FieldLabel>
                    <Input
                      id="profile-specialization"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      maxLength={100}
                      placeholder="e.g. General Medicine, Cardiology"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="profile-qualifications">
                      Qualifications
                    </FieldLabel>
                    <Input
                      id="profile-qualifications"
                      value={qualifications}
                      onChange={(e) => setQualifications(e.target.value)}
                      maxLength={200}
                      placeholder="e.g. MBBS, MD (General Medicine)"
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="profile-bio">Bio</FieldLabel>
                  <Textarea
                    id="profile-bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    maxLength={1000}
                    rows={4}
                    placeholder="Short introduction shown to patients."
                  />
                  <div className="flex items-center justify-between">
                    <FieldDescription>
                      A short introduction shown to patients.
                    </FieldDescription>
                    <Counter value={bio} max={1000} />
                  </div>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clinic details</CardTitle>
              <CardDescription>
                Your clinic&apos;s company information, used by patients and the
                WhatsApp AI.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="clinic-name">Clinic name</FieldLabel>
                  <Input
                    id="clinic-name"
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    maxLength={120}
                    placeholder="Sunrise Multispeciality Clinic"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="clinic-phone">Clinic phone</FieldLabel>
                    <Input
                      id="clinic-phone"
                      type="tel"
                      value={clinicPhone}
                      onChange={(e) => setClinicPhone(e.target.value)}
                      maxLength={30}
                      placeholder="+91 98765 43210"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="clinic-email">Clinic email</FieldLabel>
                    <Input
                      id="clinic-email"
                      type="email"
                      value={clinicEmail}
                      onChange={(e) => setClinicEmail(e.target.value)}
                      maxLength={120}
                      placeholder="care@clinic.com"
                    />
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="clinic-website">Website</FieldLabel>
                  <Input
                    id="clinic-website"
                    type="url"
                    value={clinicWebsite}
                    onChange={(e) => setClinicWebsite(e.target.value)}
                    maxLength={120}
                    placeholder="https://www.clinic.com"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="clinic-address">Address</FieldLabel>
                  <Textarea
                    id="clinic-address"
                    value={clinicAddress}
                    onChange={(e) => setClinicAddress(e.target.value)}
                    maxLength={300}
                    rows={2}
                    placeholder="Street, area, city, PIN code"
                  />
                  <div className="flex items-center justify-between">
                    <FieldDescription>
                      Patients use this to find the clinic.
                    </FieldDescription>
                    <Counter value={clinicAddress} max={300} />
                  </div>
                </Field>
                <Field>
                  <FieldLabel htmlFor="clinic-description">
                    About the clinic
                  </FieldLabel>
                  <Textarea
                    id="clinic-description"
                    value={clinicDescription}
                    onChange={(e) => setClinicDescription(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Short description of your clinic and services."
                  />
                  <div className="flex items-center justify-between">
                    <FieldDescription>
                      Used by the WhatsApp AI to describe your clinic.
                    </FieldDescription>
                    <Counter value={clinicDescription} max={500} />
                  </div>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="lg:sticky lg:top-4">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                Live preview of how patients and the WhatsApp AI see you.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3 text-center">
              <Avatar className="size-20">
                <AvatarImage src={user.image ?? undefined} alt={name} />
                <AvatarFallback>{initials(name || "User")}</AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <h2 className="text-xl font-semibold tracking-tight">
                  {name || "Your name"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {specialization || "Doctor"}
                </p>
              </div>
              <Badge variant="secondary" className="capitalize">
                {user.role}
              </Badge>
              {clinicName && (
                <p className="text-sm font-medium text-muted-foreground">
                  {clinicName}
                </p>
              )}
              <Separator />
              <dl className="grid w-full gap-2 text-left text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="truncate">{clinicEmail || user.email || "—"}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="truncate">{clinicPhone || phone || "—"}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Qualifications</dt>
                  <dd className="truncate">{qualifications || "—"}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Address</dt>
                  <dd className="truncate">{clinicAddress || "—"}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-muted-foreground">Website</dt>
                  <dd className="truncate">{clinicWebsite || "—"}</dd>
                </div>
              </dl>
              {(bio || clinicDescription) && (
                <>
                  <Separator />
                  <p className="text-sm text-muted-foreground">
                    {bio || clinicDescription}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
