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
  CheckCircleIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  MapPinIcon,
  PencilSquareIcon as PencilIcon,
  PhoneIcon,
  SparklesIcon,
  UserCircleIcon,
  UserIcon,
  DocumentTextIcon,
  LinkIcon,
  CameraIcon,
  UsersIcon,
  BriefcaseIcon,
} from "@heroicons/react/24/outline";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  department: string | null;
  company: string | null;
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressCountry: string | null;
  addressZip: string | null;
  socialLinkedIn: string | null;
  socialGitHub: string | null;
  socialTwitter: string | null;
  socialWebsite: string | null;
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
    department: string;
    company: string;
    addressStreet: string;
    addressCity: string;
    addressState: string;
    addressCountry: string;
    addressZip: string;
    socialLinkedIn: string;
    socialGitHub: string;
    socialTwitter: string;
    socialWebsite: string;
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

  const [department, setDepartment] = React.useState(
    draft?.user?.department ?? initialUser.department ?? ""
  );
  const [companyName, setCompanyName] = React.useState(
    draft?.user?.company ?? initialUser.company ?? ""
  );
  const [addressStreet, setAddressStreet] = React.useState(
    draft?.user?.addressStreet ?? initialUser.addressStreet ?? ""
  );
  const [addressCity, setAddressCity] = React.useState(
    draft?.user?.addressCity ?? initialUser.addressCity ?? ""
  );
  const [addressState, setAddressState] = React.useState(
    draft?.user?.addressState ?? initialUser.addressState ?? ""
  );
  const [addressCountry, setAddressCountry] = React.useState(
    draft?.user?.addressCountry ?? initialUser.addressCountry ?? ""
  );
  const [addressZip, setAddressZip] = React.useState(
    draft?.user?.addressZip ?? initialUser.addressZip ?? ""
  );
  const [socialLinkedIn, setSocialLinkedIn] = React.useState(
    draft?.user?.socialLinkedIn ?? initialUser.socialLinkedIn ?? ""
  );
  const [socialGitHub, setSocialGitHub] = React.useState(
    draft?.user?.socialGitHub ?? initialUser.socialGitHub ?? ""
  );
  const [socialTwitter, setSocialTwitter] = React.useState(
    draft?.user?.socialTwitter ?? initialUser.socialTwitter ?? ""
  );
  const [socialWebsite, setSocialWebsite] = React.useState(
    draft?.user?.socialWebsite ?? initialUser.socialWebsite ?? ""
  );

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
  const [activeTab, setActiveTab] = React.useState<"profile" | "company" | "terms">("profile");

  const dirty =
    name !== user.name ||
    phone !== (user.phone ?? "") ||
    specialization !== (user.specialization ?? "") ||
    qualifications !== (user.qualifications ?? "") ||
    bio !== (user.bio ?? "") ||
    department !== (user.department ?? "") ||
    companyName !== (user.company ?? "") ||
    addressStreet !== (user.addressStreet ?? "") ||
    addressCity !== (user.addressCity ?? "") ||
    addressState !== (user.addressState ?? "") ||
    addressCountry !== (user.addressCountry ?? "") ||
    addressZip !== (user.addressZip ?? "") ||
    socialLinkedIn !== (user.socialLinkedIn ?? "") ||
    socialGitHub !== (user.socialGitHub ?? "") ||
    socialTwitter !== (user.socialTwitter ?? "") ||
    socialWebsite !== (user.socialWebsite ?? "") ||
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
            user: {
              name,
              phone,
              specialization,
              qualifications,
              bio,
              department,
              company: companyName,
              addressStreet,
              addressCity,
              addressState,
              addressCountry,
              addressZip,
              socialLinkedIn,
              socialGitHub,
              socialTwitter,
              socialWebsite,
            },
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
    department,
    companyName,
    addressStreet,
    addressCity,
    addressState,
    addressCountry,
    addressZip,
    socialLinkedIn,
    socialGitHub,
    socialTwitter,
    socialWebsite,
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
          body: JSON.stringify({
            name,
            phone,
            specialization,
            qualifications,
            bio,
            department,
            company: companyName,
            addressStreet,
            addressCity,
            addressState,
            addressCountry,
            addressZip,
            socialLinkedIn,
            socialGitHub,
            socialTwitter,
            socialWebsite,
          }),
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

      // Sync form states with saved backend data
      setName(userData.user.name ?? "");
      setPhone(userData.user.phone ?? "");
      setSpecialization(userData.user.specialization ?? "");
      setQualifications(userData.user.qualifications ?? "");
      setBio(userData.user.bio ?? "");
      setDepartment(userData.user.department ?? "");
      setCompanyName(userData.user.company ?? "");
      setAddressStreet(userData.user.addressStreet ?? "");
      setAddressCity(userData.user.addressCity ?? "");
      setAddressState(userData.user.addressState ?? "");
      setAddressCountry(userData.user.addressCountry ?? "");
      setAddressZip(userData.user.addressZip ?? "");
      setSocialLinkedIn(userData.user.socialLinkedIn ?? "");
      setSocialGitHub(userData.user.socialGitHub ?? "");
      setSocialTwitter(userData.user.socialTwitter ?? "");
      setSocialWebsite(userData.user.socialWebsite ?? "");

      setClinicName(companyData.company.name ?? "");
      setClinicPhone(companyData.company.phone ?? "");
      setClinicEmail(companyData.company.email ?? "");
      setClinicAddress(companyData.company.address ?? "");
      setClinicWebsite(companyData.company.website ?? "");
      setClinicDescription(companyData.company.description ?? "");

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
    setDepartment(initialUser.department ?? "");
    setCompanyName(initialUser.company ?? "");
    setAddressStreet(initialUser.addressStreet ?? "");
    setAddressCity(initialUser.addressCity ?? "");
    setAddressState(initialUser.addressState ?? "");
    setAddressCountry(initialUser.addressCountry ?? "");
    setAddressZip(initialUser.addressZip ?? "");
    setSocialLinkedIn(initialUser.socialLinkedIn ?? "");
    setSocialGitHub(initialUser.socialGitHub ?? "");
    setSocialTwitter(initialUser.socialTwitter ?? "");
    setSocialWebsite(initialUser.socialWebsite ?? "");

    setClinicName(initialCompany.name);
    setClinicPhone(initialCompany.phone ?? "");
    setClinicEmail(initialCompany.email ?? "");
    setClinicAddress(initialCompany.address ?? "");
    setClinicWebsite(initialCompany.website ?? "");
    setClinicDescription(initialCompany.description ?? "");

    clearDraft();
    toast.success("Discarded unsaved changes.");
  }

  const tabs = [
    { id: "profile", label: "Profile", icon: UserIcon },
    { id: "company", label: "Company", icon: BuildingOfficeIcon },
    { id: "terms", label: "Terms", icon: DocumentTextIcon },
  ] as const;

  return (
    <div className="flex flex-col gap-6 min-h-screen bg-[#f3f8fc] -mx-4 -mt-4 p-4 md:p-8">
      {/* ── Top Header Section ─────────────────────────────────────────── */}
      <div className="relative bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xs">
        {/* Banner with gradient */}
        <div className="h-44 md:h-52 bg-gradient-to-b from-indigo-400/90 via-sky-300/40 to-sky-50/20 relative" />

        {/* Profile Info Overlay */}
        <div className="relative px-6 pb-6 flex flex-col items-center -mt-16 md:-mt-20">
          {/* Avatar Container */}
          <div className="relative">
            <Avatar className="size-28 md:size-32 rounded-full border-4 border-white shadow-md bg-white">
              <AvatarImage src={user.image ?? undefined} alt={name} className="object-cover" />
              <AvatarFallback className="bg-indigo-50 text-indigo-600 text-2xl font-bold">
                {initials(name || "User")}
              </AvatarFallback>
            </Avatar>
            {/* Camera badge overlap */}
            <div className="absolute bottom-1 right-1 p-2 bg-[#6366f1] rounded-full border border-white text-white shadow-xs cursor-pointer hover:bg-[#4f46e5] transition-colors">
              <CameraIcon className="size-4" />
            </div>
          </div>

          {/* Name & Email */}
          <h1 className="mt-4 text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight">
            {name || "Your profile"}
          </h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">
            {user.email}
          </p>

          {/* Badges / Pill row */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <Badge className="bg-[#e0e7ff] text-[#4338ca] hover:bg-[#e0e7ff] border-none px-3 py-1 flex items-center gap-1.5 text-xs font-semibold rounded-full">
              <UsersIcon className="size-3.5" />
              Members
            </Badge>
            <span className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
              <BuildingOfficeIcon className="size-4 text-gray-400" />
              {company.name || "Organization Name"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Tabs & Action Buttons row ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-200 pb-3">
        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === "terms") {
                    setEditing(false); // Terms is read-only
                  }
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors border",
                  isActive
                    ? "bg-[#e5f1ff] text-[#0066cc] border-[#CDE3FF] shadow-xs"
                    : "bg-transparent text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                <Icon className={cn("size-4", isActive ? "text-[#0066cc]" : "text-gray-400")} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Edit / Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {editing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (dirty) {
                    if (!window.confirm("Discard your unsaved changes and leave editing?")) return;
                    handleRevert();
                  }
                  setEditing(false);
                }}
                disabled={saving}
                className="border-gray-200 hover:bg-gray-50 text-gray-700 h-9"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void handleSave()}
                disabled={!dirty || saving}
                className="bg-[#0066cc] text-white hover:bg-[#0052a3] h-9"
              >
                {saving ? (
                  <>
                    <Loader2Icon className="animate-spin size-4 mr-1.5" />
                    Saving...
                  </>
                ) : (
                  <>
                    <SaveIcon className="size-4 mr-1.5" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          ) : (
            activeTab !== "terms" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 border border-gray-250 bg-white hover:bg-gray-50 text-gray-700 h-9 rounded-lg"
              >
                <PencilIcon className="size-4 text-gray-500" />
                Edit Profile
              </Button>
            )
          )}
        </div>
      </div>

      {/* ── Main Tab Content ───────────────────────────────────────────── */}
      <div className="mt-2">
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Column 1: Personal Information */}
            <div className="bg-white border border-gray-150 rounded-2xl p-6 md:p-8 shadow-xs flex flex-col gap-6">
              <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <UserIcon className="size-5" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
              </div>

              <div className="flex flex-col gap-4">
                {/* Email (Readonly) */}
                <div className="flex items-start gap-3.5 pb-3.5 border-b border-gray-50">
                  <EnvelopeIcon className="size-5 text-gray-400 mt-1 shrink-0" />
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Email</span>
                    <p className="text-sm font-medium text-gray-900 mt-1">{user.email}</p>
                  </div>
                </div>

                {/* Full Name */}
                <div className="flex items-start gap-3.5 pb-3.5 border-b border-gray-50">
                  <UserIcon className="size-5 text-gray-400 mt-1 shrink-0" />
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Full Name</span>
                    {editing ? (
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1.5 h-9 bg-gray-50/50"
                        maxLength={100}
                        placeholder="Myenum Am"
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 mt-1">{name || "—"}</p>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-3.5 pb-3.5 border-b border-gray-50">
                  <PhoneIcon className="size-5 text-gray-400 mt-1 shrink-0" />
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Phone</span>
                    {editing ? (
                      <Input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="mt-1.5 h-9 bg-gray-50/50"
                        maxLength={30}
                        placeholder="+91 98765 43210"
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 mt-1">{phone || "—"}</p>
                    )}
                  </div>
                </div>

                {/* Department */}
                <div className="flex items-start gap-3.5 pb-3.5 border-b border-gray-50">
                  <BriefcaseIcon className="size-5 text-gray-400 mt-1 shrink-0" />
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Department</span>
                    {editing ? (
                      <Input
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="mt-1.5 h-9 bg-gray-50/50"
                        maxLength={200}
                        placeholder="e.g. Cardiology"
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 mt-1">{department || "—"}</p>
                    )}
                  </div>
                </div>

                {/* Company */}
                <div className="flex items-start gap-3.5">
                  <BuildingOfficeIcon className="size-5 text-gray-400 mt-1 shrink-0" />
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Company</span>
                    {editing ? (
                      <Input
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        className="mt-1.5 h-9 bg-gray-50/50"
                        maxLength={200}
                        placeholder="e.g. Myenum Am's Organization"
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 mt-1">{companyName || "—"}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Address & Social */}
            <div className="bg-white border border-gray-150 rounded-2xl p-6 md:p-8 shadow-xs flex flex-col gap-6">
              <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <MapPinIcon className="size-5" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Address & Social</h2>
              </div>

              {/* Address Sub-Section */}
              <div className="flex flex-col gap-4">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-100">
                  Address
                </div>

                {/* Street */}
                <div>
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Street</span>
                  {editing ? (
                    <Input
                      value={addressStreet}
                      onChange={(e) => setAddressStreet(e.target.value)}
                      className="mt-1.5 h-9 bg-gray-50/50"
                      maxLength={200}
                      placeholder="Street Address"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 mt-1">{addressStreet || "—"}</p>
                  )}
                </div>

                {/* City & State */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">City</span>
                    {editing ? (
                      <Input
                        value={addressCity}
                        onChange={(e) => setAddressCity(e.target.value)}
                        className="mt-1.5 h-9 bg-gray-50/50"
                        maxLength={200}
                        placeholder="City"
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 mt-1">{addressCity || "—"}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">State</span>
                    {editing ? (
                      <Input
                        value={addressState}
                        onChange={(e) => setAddressState(e.target.value)}
                        className="mt-1.5 h-9 bg-gray-50/50"
                        maxLength={200}
                        placeholder="State"
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 mt-1">{addressState || "—"}</p>
                    )}
                  </div>
                </div>

                {/* Country & Zip Code */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Country</span>
                    {editing ? (
                      <Input
                        value={addressCountry}
                        onChange={(e) => setAddressCountry(e.target.value)}
                        className="mt-1.5 h-9 bg-gray-50/50"
                        maxLength={200}
                        placeholder="Country"
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 mt-1">{addressCountry || "—"}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Zip Code</span>
                    {editing ? (
                      <Input
                        value={addressZip}
                        onChange={(e) => setAddressZip(e.target.value)}
                        className="mt-1.5 h-9 bg-gray-50/50"
                        maxLength={200}
                        placeholder="Zip Code"
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 mt-1">{addressZip || "—"}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Social Links Sub-Section */}
              <div className="flex flex-col gap-4 mt-2">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider pb-1 border-b border-gray-100">
                  Social Links
                </div>

                {/* LinkedIn & GitHub */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-2.5">
                    <LinkIcon className="size-4.5 text-gray-400 mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">LinkedIn</span>
                      {editing ? (
                        <Input
                          value={socialLinkedIn}
                          onChange={(e) => setSocialLinkedIn(e.target.value)}
                          className="mt-1.5 h-9 bg-gray-50/50"
                          maxLength={200}
                          placeholder="LinkedIn URL"
                        />
                      ) : socialLinkedIn ? (
                        <a href={socialLinkedIn} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline truncate block mt-1">
                          {socialLinkedIn}
                        </a>
                      ) : (
                        <p className="text-sm font-medium text-gray-900 mt-1">—</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <LinkIcon className="size-4.5 text-gray-400 mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">GitHub</span>
                      {editing ? (
                        <Input
                          value={socialGitHub}
                          onChange={(e) => setSocialGitHub(e.target.value)}
                          className="mt-1.5 h-9 bg-gray-50/50"
                          maxLength={200}
                          placeholder="GitHub URL"
                        />
                      ) : socialGitHub ? (
                        <a href={socialGitHub} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline truncate block mt-1">
                          {socialGitHub}
                        </a>
                      ) : (
                        <p className="text-sm font-medium text-gray-900 mt-1">—</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Twitter & Website */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-2.5">
                    <LinkIcon className="size-4.5 text-gray-400 mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Twitter</span>
                      {editing ? (
                        <Input
                          value={socialTwitter}
                          onChange={(e) => setSocialTwitter(e.target.value)}
                          className="mt-1.5 h-9 bg-gray-50/50"
                          maxLength={200}
                          placeholder="Twitter URL"
                        />
                      ) : socialTwitter ? (
                        <a href={socialTwitter} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline truncate block mt-1">
                          {socialTwitter}
                        </a>
                      ) : (
                        <p className="text-sm font-medium text-gray-900 mt-1">—</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <LinkIcon className="size-4.5 text-gray-400 mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Website</span>
                      {editing ? (
                        <Input
                          value={socialWebsite}
                          onChange={(e) => setSocialWebsite(e.target.value)}
                          className="mt-1.5 h-9 bg-gray-50/50"
                          maxLength={200}
                          placeholder="Website URL"
                        />
                      ) : socialWebsite ? (
                        <a href={socialWebsite} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline truncate block mt-1">
                          {socialWebsite}
                        </a>
                      ) : (
                        <p className="text-sm font-medium text-gray-900 mt-1">—</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "company" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Clinic / Company Information */}
            <div className="bg-white border border-gray-150 rounded-2xl p-6 md:p-8 shadow-xs flex flex-col gap-6">
              <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <BuildingOfficeIcon className="size-5" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Clinic Details</h2>
              </div>

              <div className="flex flex-col gap-4">
                {/* Clinic Name */}
                <div className="flex items-start gap-3.5 pb-3.5 border-b border-gray-50">
                  <BuildingOfficeIcon className="size-5 text-gray-400 mt-1 shrink-0" />
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Clinic Name</span>
                    {editing ? (
                      <Input
                        value={clinicName}
                        onChange={(e) => setClinicName(e.target.value)}
                        className="mt-1.5 h-9 bg-gray-50/50"
                        maxLength={120}
                        placeholder="Sunrise Clinic"
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 mt-1">{clinicName || "—"}</p>
                    )}
                  </div>
                </div>

                {/* Clinic Phone */}
                <div className="flex items-start gap-3.5 pb-3.5 border-b border-gray-50">
                  <PhoneIcon className="size-5 text-gray-400 mt-1 shrink-0" />
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Clinic Phone</span>
                    {editing ? (
                      <Input
                        value={clinicPhone}
                        onChange={(e) => setClinicPhone(e.target.value)}
                        className="mt-1.5 h-9 bg-gray-50/50"
                        maxLength={30}
                        placeholder="+91 98765 43210"
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 mt-1">{clinicPhone || "—"}</p>
                    )}
                  </div>
                </div>

                {/* Clinic Email */}
                <div className="flex items-start gap-3.5 pb-3.5 border-b border-gray-50">
                  <EnvelopeIcon className="size-5 text-gray-400 mt-1 shrink-0" />
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Clinic Email</span>
                    {editing ? (
                      <Input
                        value={clinicEmail}
                        onChange={(e) => setClinicEmail(e.target.value)}
                        className="mt-1.5 h-9 bg-gray-50/50"
                        maxLength={120}
                        placeholder="care@clinic.com"
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900 mt-1">{clinicEmail || "—"}</p>
                    )}
                  </div>
                </div>

                {/* Clinic Website */}
                <div className="flex items-start gap-3.5">
                  <GlobeAltIcon className="size-5 text-gray-400 mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Website</span>
                    {editing ? (
                      <Input
                        value={clinicWebsite}
                        onChange={(e) => setClinicWebsite(e.target.value)}
                        className="mt-1.5 h-9 bg-gray-50/50"
                        maxLength={120}
                        placeholder="https://www.clinic.com"
                      />
                    ) : clinicWebsite ? (
                      <a href={clinicWebsite} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline truncate block mt-1">
                        {clinicWebsite}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-gray-900 mt-1">—</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Clinic Address & Description */}
            <div className="bg-white border border-gray-150 rounded-2xl p-6 md:p-8 shadow-xs flex flex-col gap-6">
              <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <MapPinIcon className="size-5" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Clinic Info & Address</h2>
              </div>

              <div className="flex flex-col gap-4">
                {/* Clinic Address */}
                <div>
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Address</span>
                  {editing ? (
                    <Textarea
                      value={clinicAddress}
                      onChange={(e) => setClinicAddress(e.target.value)}
                      className="mt-1.5 bg-gray-50/50"
                      maxLength={300}
                      rows={3}
                      placeholder="Street, area, city, PIN code"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 mt-1 leading-relaxed">{clinicAddress || "—"}</p>
                  )}
                </div>

                {/* About Clinic */}
                <div>
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">About the Clinic</span>
                  {editing ? (
                    <Textarea
                      value={clinicDescription}
                      onChange={(e) => setClinicDescription(e.target.value)}
                      className="mt-1.5 bg-gray-50/50"
                      maxLength={500}
                      rows={4}
                      placeholder="Short description of services and details."
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 mt-1 leading-relaxed">{clinicDescription || "—"}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "terms" && (
          <div className="bg-white border border-gray-150 rounded-2xl p-6 md:p-8 shadow-xs flex flex-col gap-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-2.5 pb-2 border-b border-gray-100">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <DocumentTextIcon className="size-5" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Terms of Service</h2>
            </div>
            
            <div className="max-h-[500px] overflow-y-auto pr-2 flex flex-col gap-6 text-sm text-gray-600 leading-relaxed scrollbar-thin">
              <section className="flex flex-col gap-1.5">
                <h3 className="font-semibold text-gray-900">1. Acceptance of Terms</h3>
                <p>
                  By creating an account, booking an appointment, messaging the clinic through WhatsApp or using My Clinics (the &quot;Service&quot;), you agree to these Terms of Service and our Privacy Policy. If you do not agree, please do not use the Service.
                </p>
              </section>

              <section className="flex flex-col gap-1.5">
                <h3 className="font-semibold text-gray-900">2. The Service</h3>
                <p>
                  My Clinics is a clinic management platform that helps clinics and healthcare providers manage appointments, patient records, medical history, prescriptions, medicines, billing and reports. Patients may use the Service to book and manage appointments, chat with the clinic&apos;s assistant, receive reminders and access their own records.
                </p>
              </section>

              <section className="flex flex-col gap-1.5">
                <h3 className="font-semibold text-gray-900">3. Accounts & Registration</h3>
                <p>
                  You are responsible for safeguarding your account credentials and for all activity that occurs under your account. You must provide accurate information when creating an account and keep it up to date.
                </p>
              </section>

              <section className="flex flex-col gap-1.5">
                <h3 className="font-semibold text-gray-900">4. Medical Disclaimer</h3>
                <p>
                  The Service stores and organises health information but is not a medical service. Content on the Service — including prescriptions, diagnoses and reports — is provided by licensed healthcare professionals and is not a substitute for professional medical advice, diagnosis or treatment.
                </p>
              </section>

              <section className="flex flex-col gap-1.5">
                <h3 className="font-semibold text-gray-900">5. Appointments, Rescheduling & Cancellation</h3>
                <p>
                  Appointment availability, timings and doctors are subject to change at the clinic&apos;s discretion. You agree to attend booked appointments on time and to cancel or reschedule with reasonable notice.
                </p>
              </section>

              <section className="flex flex-col gap-1.5">
                <h3 className="font-semibold text-gray-900">6. Payments & Billing</h3>
                <p>
                  Bills generated through the Service reflect the clinic&apos;s charges for consultations, procedures and services. Bills are issued as PDFs through the portal and reflect the clinic&apos;s pricing.
                </p>
              </section>

              <section className="flex flex-col gap-1.5">
                <h3 className="font-semibold text-gray-900">7. Messaging & Notifications</h3>
                <p>
                  By providing your phone number or messaging the clinic&apos;s WhatsApp assistant, you consent to receive appointment confirmations and reminders via WhatsApp. Reminders are sent for booked appointments only.
                </p>
              </section>

              <section className="flex flex-col gap-1.5">
                <h3 className="font-semibold text-gray-900">8. AI Chat Assistant</h3>
                <p>
                  The clinic may offer an AI chat assistant that helps you find doctors, check availability and book, reschedule or cancel appointments. The assistant is not a medical professional and does not provide medical advice.
                </p>
              </section>

              <section className="flex flex-col gap-1.5">
                <h3 className="font-semibold text-gray-900">9. Reports & File Uploads</h3>
                <p>
                  You may upload medical reports and files through the portal. You are responsible for the content you upload and confirm that you have the right to share it.
                </p>
              </section>

              <section className="flex flex-col gap-1.5">
                <h3 className="font-semibold text-gray-900">10. Prescriptions & Medicines</h3>
                <p>
                  Prescriptions and medicine information displayed in the Service are provided by the clinic&apos;s doctors for your treatment. Follow your doctor&apos;s instructions for any medication.
                </p>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
