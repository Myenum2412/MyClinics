"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ArrowDownTrayIcon as SaveIcon,
  ArrowPathIcon as Loader2Icon,
  ArrowUturnLeftIcon as Undo2Icon,
  AcademicCapIcon,
  BuildingOffice2Icon as BuildingOfficeIcon,
  CalendarDaysIcon,
  ChatBubbleOvalLeftIcon as ChatBubbleIcon,
  CheckCircleIcon,
  CheckIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  MapPinIcon,
  PencilSquareIcon as PencilIcon,
  PhoneIcon,
  SparklesIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
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

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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

const roleIcon: Record<string, typeof UserCircleIcon> = {
  doctor: AcademicCapIcon,
  admin: UserCircleIcon,
  staff: BuildingOfficeIcon,
  patient: UserCircleIcon,
};

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
  const [editing, setEditing] = React.useState(false);
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
      setEditing(false);
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

  const RoleIcon = roleIcon[user.role] ?? UserCircleIcon;
  const roleLabel =
    user.role === "doctor" ? "Doctor" : user.role === "admin" ? "Clinic Admin" : user.role;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Hero banner ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d47a1] via-[#1565c0] to-[#42a5f5] text-white shadow-lg shadow-blue-900/20">
        <div
          aria-hidden
          className="absolute -top-24 -right-16 size-64 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-28 -left-10 size-72 rounded-full bg-sky-300/20 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute top-1/2 right-1/4 hidden size-40 rounded-full bg-white/5 blur-xl md:block"
        />

        <div className="relative flex flex-col gap-5 p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="size-20 shrink-0 rounded-2xl shadow-xl ring-4 ring-white/90 sm:size-24">
                <AvatarImage src={user.image ?? undefined} alt={name} />
                <AvatarFallback className="bg-white/20 text-white">
                  {initials(name || "User")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                    {name || "Your profile"}
                  </h1>
                  <Badge className="border-white/25 bg-white/15 capitalize text-white hover:bg-white/20">
                    <RoleIcon className="mr-1 size-3" aria-hidden="true" />
                    {roleLabel}
                  </Badge>
                </div>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-blue-100">
                  <EnvelopeIcon className="size-3.5 shrink-0" aria-hidden="true" />
                  {user.email}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-blue-200/90">
                  <CalendarDaysIcon className="size-3.5" aria-hidden="true" />
                  Member since {formatDate(user.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur",
                  dirty
                    ? "border-amber-300/40 bg-amber-400/20 text-amber-100"
                    : "border-white/25 bg-white/10 text-blue-100"
                )}
              >
                {dirty ? (
                  <>
                    <span className="size-1.5 rounded-full bg-amber-300" />
                    {restoredFromDraft
                      ? "Restored unsaved edits"
                      : "Unsaved changes"}
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="size-3.5 text-emerald-300" aria-hidden="true" />
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
                  className="border border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                >
                  <Undo2Icon className="size-3.5" aria-hidden="true" />
                  Revert
                </Button>
              )}
              {editing ? (
                <>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (dirty) {
                        if (
                          !window.confirm(
                            "Discard your unsaved changes and leave editing?"
                          )
                        )
                          return;
                        handleRevert();
                      }
                      setEditing(false);
                    }}
                    className="border-white/25 bg-white/15 text-white hover:bg-white/25 hover:text-white"
                  >
                    View profile
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void handleSave()}
                    disabled={!dirty || saving}
                    className="bg-white text-blue-700 shadow-lg shadow-blue-950/30 hover:bg-blue-50"
                  >
                    {saving ? (
                      <Loader2Icon className="animate-spin" aria-hidden="true" />
                    ) : (
                      <SaveIcon aria-hidden="true" />
                    )}
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setEditing(true)}
                  className="bg-white text-blue-700 shadow-lg shadow-blue-950/30 hover:bg-blue-50"
                >
                  <PencilIcon aria-hidden="true" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>

          {/* Info chips */}
          <div className="flex flex-wrap gap-2">
            {specialization && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
                <SparklesIcon className="size-3.5 text-sky-200" aria-hidden="true" />
                {specialization}
              </span>
            )}
            {qualifications && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
                <AcademicCapIcon className="size-3.5 text-sky-200" aria-hidden="true" />
                {qualifications}
              </span>
            )}
            {phone && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
                <PhoneIcon className="size-3.5 text-sky-200" aria-hidden="true" />
                {phone}
              </span>
            )}
            {clinicName && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
                <BuildingOfficeIcon className="size-3.5 text-sky-200" aria-hidden="true" />
                {clinicName}
              </span>
            )}
          </div>
        </div>
      </section>

      {editing ? (
        /* ── Edit mode ─────────────────────────────────────────────── */
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <UserCircleIcon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <CardTitle>Personal information</CardTitle>
                    <CardDescription>
                      Shown to your patients and used by the WhatsApp AI.
                    </CardDescription>
                  </div>
                </div>
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
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BuildingOfficeIcon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <CardTitle>Clinic details</CardTitle>
                    <CardDescription>
                      Your clinic&apos;s company information, used by patients and
                      the WhatsApp AI.
                    </CardDescription>
                  </div>
                </div>
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

          <div>
            <Card className="lg:sticky lg:top-4">
              <CardHeader>
                <CardTitle>Save your changes</CardTitle>
                <CardDescription>
                  Updates apply to both your personal profile and the clinic.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-3 text-sm",
                    dirty
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  )}
                >
                  {dirty ? (
                    <>
                      <span className="size-2 shrink-0 rounded-full bg-amber-500" />
                      {restoredFromDraft
                        ? "Restored unsaved edits from this device."
                        : "You have unsaved changes."}
                    </>
                  ) : (
                    <>
                      <CheckIcon className="size-4 shrink-0" aria-hidden="true" />
                      Everything is up to date.
                    </>
                  )}
                </div>
                <Button
                  onClick={() => void handleSave()}
                  disabled={!dirty || saving}
                  className="w-full"
                >
                  {saving ? (
                    <Loader2Icon className="animate-spin" aria-hidden="true" />
                  ) : (
                    <SaveIcon aria-hidden="true" />
                  )}
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleRevert}
                  disabled={saving || !dirty}
                >
                  <Undo2Icon aria-hidden="true" />
                  Discard changes
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Tip: unsaved edits are kept on this device in case you
                  navigate away.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* ── View mode ─────────────────────────────────────────────── */
        <div className="flex flex-col gap-4">
          {dirty && restoredFromDraft && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-center gap-2.5 text-sm text-amber-800">
                <span className="size-2 shrink-0 rounded-full bg-amber-500" />
                <span>
                  You have unsaved edits restored from this device. Review or
                  discard them.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setEditing(true)}
                  className="bg-amber-600 text-white hover:bg-amber-700"
                >
                  <PencilIcon aria-hidden="true" />
                  Review edits
                </Button>
                <Button size="sm" variant="outline" onClick={handleRevert}>
                  <Undo2Icon aria-hidden="true" />
                  Discard
                </Button>
              </div>
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ChatBubbleIcon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <CardTitle>About</CardTitle>
                    <CardDescription>
                      How patients and the WhatsApp AI see you.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {bio ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {bio}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    No bio yet.{" "}
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="font-medium text-primary underline-offset-4 not-italic hover:underline"
                    >
                      Add one
                    </button>
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {specialization && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium">
                      <SparklesIcon className="size-3.5 text-primary" aria-hidden="true" />
                      {specialization}
                    </span>
                  )}
                  {qualifications && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium">
                      <AcademicCapIcon className="size-3.5 text-primary" aria-hidden="true" />
                      {qualifications}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BuildingOfficeIcon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <CardTitle>Clinic</CardTitle>
                    <CardDescription>
                      Your clinic&apos;s public information.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">
                      {clinicName || "—"}
                    </p>
                    {clinicDescription && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {clinicDescription}
                      </p>
                    )}
                  </div>
                </div>
                <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                  {clinicPhone && (
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <PhoneIcon className="size-3.5" aria-hidden="true" />
                      </span>
                      <dd className="min-w-0 truncate">{clinicPhone}</dd>
                    </div>
                  )}
                  {clinicEmail && (
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <EnvelopeIcon className="size-3.5" aria-hidden="true" />
                      </span>
                      <dd className="min-w-0 truncate">{clinicEmail}</dd>
                    </div>
                  )}
                  {clinicAddress && (
                    <div className="flex items-center gap-2.5 sm:col-span-2">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <MapPinIcon className="size-3.5" aria-hidden="true" />
                      </span>
                      <dd className="min-w-0">{clinicAddress}</dd>
                    </div>
                  )}
                  {clinicWebsite && (
                    <div className="flex items-center gap-2.5 sm:col-span-2">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <GlobeAltIcon className="size-3.5" aria-hidden="true" />
                      </span>
                      <dd className="min-w-0 truncate">
                        <a
                          href={clinicWebsite}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {clinicWebsite}
                        </a>
                      </dd>
                    </div>
                  )}
                  {!clinicPhone && !clinicEmail && !clinicAddress && !clinicWebsite && (
                    <p className="text-sm italic text-muted-foreground">
                      No clinic contact details yet.{" "}
                      <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="font-medium text-primary underline-offset-4 not-italic hover:underline"
                      >
                        Add them
                      </button>
                    </p>
                  )}
                </dl>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Card className="lg:sticky lg:top-4">
              <CardHeader>
                <CardTitle>Details</CardTitle>
                <CardDescription>Contact and account info.</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3 text-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <EnvelopeIcon className="size-3.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-foreground">Email</dt>
                      <dd className="truncate font-medium">{user.email}</dd>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <PhoneIcon className="size-3.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-foreground">Phone</dt>
                      <dd className="truncate font-medium">{phone || "—"}</dd>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <CalendarDaysIcon className="size-3.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-foreground">Member since</dt>
                      <dd className="truncate font-medium">
                        {formatDate(user.createdAt)}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <RoleIcon className="size-3.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <dt className="text-xs text-muted-foreground">Role</dt>
                      <dd className="truncate font-medium capitalize">{roleLabel}</dd>
                    </div>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
