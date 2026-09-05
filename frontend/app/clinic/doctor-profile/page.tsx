"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRequireRole, sessionCan } from "@/hooks/use-clinic-session";
import {
  type Clinic,
  type Doctor,
  getDoctor,
  getOwnClinic,
  listDoctors,
  updateDoctor,
  uploadAvatar,
  getAvatarUrl,
} from "@/lib/clinic-api";
import { PersonAvatar, bustAvatarCache } from "@/components/clinic/person-avatar";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Activity,
  Award,
  BadgeCheck,
  Briefcase,
  Building,
  Building2,
  Calendar,
  Camera,
  Check,
  Clock,
  FileText,
  Globe,
  GraduationCap,
  HeartPulse,
  IndianRupee,
  Info,
  Languages,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { DoctorOverviewAnalytics } from "@/src/components/clinic/doctor-overview-analytics";

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SPECIALIZATIONS = [
  "General Medicine",
  "Cardiology",
  "Dermatology",
  "Pediatrics",
  "Gynecology & Obstetrics",
  "Orthopedics",
  "Neurology",
  "ENT (Ear, Nose, Throat)",
  "Ophthalmology",
  "Psychiatry",
  "Dental Surgery",
  "Urology",
];

function orDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

interface DoctorFormState {
  name: string;
  specialization: string;
  qualification: string;
  licenseNo: string;
  registrationNo: string;
  experienceYears: number;
  fee: number;
  phone: string;
  whatsapp: string;
  email: string;
  gender: "male" | "female" | "other";
  dateOfBirth: string;
  department: string;
  issuingAuthority: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  languages: string;
  about: string;
  scheduleDays: string[];
}

function doctorFormOf(doc: Doctor | null, sessionName?: string): DoctorFormState {
  return {
    name: doc?.name || sessionName || "",
    specialization: doc?.specialization || "General Medicine",
    qualification: doc?.qualification || "",
    licenseNo: doc?.licenseNo || "",
    registrationNo: doc?.registrationNo || "",
    experienceYears: doc?.experienceYears || 0,
    fee: doc?.fee || 0,
    phone: doc?.phone || "",
    whatsapp: doc?.whatsapp || "",
    email: doc?.email || "",
    gender: (doc?.gender as "male" | "female" | "other") || "male",
    dateOfBirth: doc?.dateOfBirth || "",
    department: doc?.department || "",
    issuingAuthority: doc?.issuingAuthority || "",
    address: doc?.address || "",
    city: doc?.city || "",
    state: doc?.state || "",
    pincode: doc?.pincode || "",
    languages: doc?.languages || "",
    about: doc?.about || "",
    scheduleDays: doc?.scheduleDays || ["Mon", "Tue", "Wed", "Thu", "Fri"],
  };
}

export default function DoctorProfilePage() {
  const session = useRequireRole("patient");
  const clinicId = session?.clinicId ?? "";
  const doctorIdFromSession = session?.doctorId ?? null;
  const router = useRouter();

  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoRefresh, setPhotoRefresh] = useState(0);

  const [form, setForm] = useState<DoctorFormState | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const targetDoctorId = doctor?.doctorId ?? doctorIdFromSession;

  const loadData = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      // Fetch clinic details
      const clinicData = await getOwnClinic(clinicId).catch(() => null);
      setClinic(clinicData);

      // Fetch doctor details
      let docData: Doctor | null = null;
      if (doctorIdFromSession) {
        try {
          docData = await getDoctor(clinicId, doctorIdFromSession);
        } catch {
          // fallback
        }
      }
      if (!docData) {
        const list = await listDoctors(clinicId, { limit: 10 });
        if (list.items.length > 0) {
          docData = list.items[0];
        }
      }

      setDoctor(docData);
      setForm(doctorFormOf(docData, session?.name ?? "Doctor"));

      if (docData?.doctorId) {
        try {
          const res = await getAvatarUrl(clinicId, "doctor", docData.doctorId);
          setAvatarUrl(res.url);
        } catch {
          setAvatarUrl(null);
        }
      }
    } catch (e) {
      toast.error("Failed to load doctor profile");
    } finally {
      setLoading(false);
    }
  }, [clinicId, doctorIdFromSession, session?.name]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const setField = <K extends keyof DoctorFormState>(key: K, value: DoctorFormState[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  };

  const toggleDay = (day: string) => {
    if (!form) return;
    const exists = form.scheduleDays.includes(day);
    setField(
      "scheduleDays",
      exists ? form.scheduleDays.filter((d) => d !== day) : [...form.scheduleDays, day]
    );
  };

  async function handlePhotoUpload(file: File) {
    if (!clinicId || !targetDoctorId) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Only JPG or PNG images are allowed");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be smaller than 2MB");
      return;
    }
    setUploadingPhoto(true);
    try {
      const res = await uploadAvatar(clinicId, "doctor", targetDoctorId, file);
      setAvatarUrl(res.url);
      bustAvatarCache(clinicId, "doctor", targetDoctorId);
      setPhotoRefresh((r) => r + 1);
      toast.success("Doctor profile photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to upload profile photo");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSave() {
    if (!clinicId || !targetDoctorId || !form) return;

    if (!form.name.trim()) {
      toast.error("Doctor name is required");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateDoctor(clinicId, targetDoctorId, {
        name: form.name.trim(),
        specialization: form.specialization.trim(),
        qualification: form.qualification.trim() || null,
        licenseNo: form.licenseNo.trim() || null,
        registrationNo: form.registrationNo.trim() || null,
        experienceYears: Number(form.experienceYears) || 0,
        fee: Number(form.fee) || 0,
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        gender: form.gender,
        dateOfBirth: form.dateOfBirth || null,
        department: form.department.trim() || null,
        issuingAuthority: form.issuingAuthority.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        pincode: form.pincode.trim() || null,
        languages: form.languages.trim() || null,
        about: form.about.trim() || null,
        scheduleDays: form.scheduleDays,
      });

      setDoctor(updated);
      setForm(doctorFormOf(updated, session?.name ?? "Doctor"));
      setEditing(false);
      toast.success("Doctor profile updated successfully!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save doctor profile");
    } finally {
      setSaving(false);
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("clinic_token");
    document.cookie = "clinic_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/login");
  };

  if (loading || !form) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
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

  const docName = doctor?.name || session?.name || "Doctor";
  const docEmail = doctor?.email || session?.email || "—";
  const docSpecialization = doctor?.specialization || "General Medicine";
  const docQualification = doctor?.qualification || "MBBS";
  const docExp = doctor?.experienceYears ? `${doctor.experienceYears} Years` : "—";
  const stats = [
    { label: "Experience", value: docExp },
    { label: "Qualification", value: docQualification },
    { label: "Specialization", value: docSpecialization },
  ];

  return (
    <div className="w-full min-h-[calc(100vh-4rem)]">
      <section className="w-full min-h-[calc(100vh-4rem)] rounded-xl border border-[#E3F2FD] bg-background overflow-hidden flex flex-col">
        {/* Cover Banner */}
        <div
          className="h-32 w-full bg-linear-to-br from-foreground/10 via-[#E3F2FD] to-[#E3F2FD]/60"
          aria-hidden="true"
        />

        <div className="px-6 pb-6">
          <div className="flex items-end justify-between gap-4">
            <div className="-mt-10 relative">
              {targetDoctorId ? (
                <PersonAvatar
                  clinicId={clinicId}
                  ownerType="doctor"
                  ownerId={targetDoctorId}
                  name={docName}
                  size="md"
                  refreshKey={photoRefresh}
                  className="size-20 rounded-full border-4 border-background object-cover shadow-sm"
                />
              ) : (
                <div className="flex size-20 items-center justify-center rounded-full border-4 border-background bg-primary/10 text-2xl font-bold text-primary shadow-sm">
                  {docName.charAt(0).toUpperCase()}
                </div>
              )}
              {editing && (
                <label className="absolute -bottom-1 -right-1 flex size-7 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-sm hover:bg-primary/90">
                  <Camera className="size-3.5" />
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) handlePhotoUpload(file);
                    }}
                  />
                </label>
              )}
            </div>

            <div className="flex items-center gap-2 pt-4">
              {!editing ? (
                <>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
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
              Dr. {docName}
            </h2>
            <Badge
              variant="outline"
              className="bg-success/10 text-success border-success/25"
            >
              <span className="mr-1.5 size-1.5 rounded-full bg-success" />
              Verified Doctor
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{docEmail}</p>
          <p className="mt-3 text-sm/relaxed text-foreground/80">
            {doctor?.about || `Specialist Doctor in ${docSpecialization} (${docQualification})`}
          </p>

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
              <Building2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
              <span>Associated Clinic: <strong className="font-semibold text-foreground">{clinic?.name || "My Clinic"}</strong></span>
            </li>
            <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" aria-hidden="true" />
              {[doctor?.city, doctor?.state].filter(Boolean).join(", ") || clinic?.address || "Address —"}
            </li>
            <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
              License No: {orDash(doctor?.licenseNo)}
            </li>
            <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Mail className="size-4 shrink-0" aria-hidden="true" />
              {orDash(doctor?.email || session?.email)}
            </li>
            <li className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <Phone className="size-4 shrink-0" aria-hidden="true" />
              {orDash(doctor?.phone || doctor?.whatsapp)}
            </li>
          </ul>

          <Tabs defaultValue="overview" className="mt-6 gap-4">
            <TabsList className="w-full bg-[#E3F2FD]">
              <TabsTrigger value="overview" className="flex-1">
                Overview
              </TabsTrigger>
              <TabsTrigger value="contact" className="flex-1">
                Contact & Address
              </TabsTrigger>
              <TabsTrigger value="credentials" className="flex-1">
                Credentials & Schedule
              </TabsTrigger>
              <TabsTrigger value="clinic" className="flex-1">
                Associated Clinic
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: OVERVIEW */}
            <TabsContent value="overview" className="flex flex-col gap-6">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <User className="size-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Basic Details</h3>
                </div>
                <FieldGrid cols={4}>
                  {editing ? (
                    <Field label="Full Name">
                      <Input
                        value={form.name}
                        onChange={(e) => setField("name", e.target.value)}
                        required
                      />
                    </Field>
                  ) : (
                    <Field label="Full Name" value={doctor?.name || docName} />
                  )}

                  <Field label="Gender">
                    {editing ? (
                      <Select
                        value={form.gender}
                        onValueChange={(v) => setField("gender", (v as "male" | "female" | "other") || "male")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      orDash(doctor?.gender?.toUpperCase())
                    )}
                  </Field>

                  <Field label="Date of Birth">
                    {editing ? (
                      <Input
                        type="date"
                        value={form.dateOfBirth}
                        onChange={(e) => setField("dateOfBirth", e.target.value)}
                      />
                    ) : (
                      orDash(doctor?.dateOfBirth)
                    )}
                  </Field>

                  <Field label="Languages Spoken">
                    {editing ? (
                      <Input
                        value={form.languages}
                        onChange={(e) => setField("languages", e.target.value)}
                        placeholder="English, Hindi, Tamil"
                      />
                    ) : (
                      orDash(doctor?.languages)
                    )}
                  </Field>
                </FieldGrid>
              </div>

              <Separator />

              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <FileText className="size-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Biography & Practice</h3>
                </div>
                <FieldGrid cols={2}>
                  <Field label="About Doctor" className="col-span-2">
                    {editing ? (
                      <Textarea
                        value={form.about}
                        onChange={(e) => setField("about", e.target.value)}
                        rows={3}
                        placeholder="Clinical expertise and practice overview..."
                      />
                    ) : (
                      orDash(doctor?.about)
                    )}
                  </Field>
                </FieldGrid>
              </div>

              <Separator />

              {/* Doctor Performance Dashboard — calculated from actual appointments, billing, and patient records */}
              {targetDoctorId && clinicId ? (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <Activity className="size-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Performance Overview</h3>
                      <p className="text-xs text-muted-foreground">Workload, visits, revenue & profitability — derived from appointments, billing and patient records</p>
                    </div>
                  </div>
                  <DoctorOverviewAnalytics clinicId={clinicId} doctorId={targetDoctorId} />
                </div>
              ) : null}
            </TabsContent>

            {/* TAB 2: CONTACT & ADDRESS */}
            <TabsContent value="contact" className="flex flex-col gap-6">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Phone className="size-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Contact Numbers & Email</h3>
                </div>
                <FieldGrid cols={3}>
                  <Field label="Phone Number">
                    {editing ? (
                      <Input
                        value={form.phone}
                        onChange={(e) => setField("phone", e.target.value)}
                        placeholder="+91 98765 43210"
                      />
                    ) : (
                      orDash(doctor?.phone)
                    )}
                  </Field>
                  <Field label="WhatsApp Number">
                    {editing ? (
                      <Input
                        value={form.whatsapp}
                        onChange={(e) => setField("whatsapp", e.target.value)}
                        placeholder="+91 98765 43210"
                      />
                    ) : (
                      orDash(doctor?.whatsapp)
                    )}
                  </Field>
                  <Field label="Email Address">
                    {editing ? (
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setField("email", e.target.value)}
                        placeholder="doctor@clinic.com"
                      />
                    ) : (
                      orDash(doctor?.email)
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
                  <h3 className="text-sm font-semibold text-foreground">Doctor Address</h3>
                </div>
                <FieldGrid cols={3}>
                  <Field label="Address Line" className="col-span-3">
                    {editing ? (
                      <Input
                        value={form.address}
                        onChange={(e) => setField("address", e.target.value)}
                        placeholder="Street / Suite Address"
                      />
                    ) : (
                      orDash(doctor?.address)
                    )}
                  </Field>
                  <Field label="City">
                    {editing ? (
                      <Input
                        value={form.city}
                        onChange={(e) => setField("city", e.target.value)}
                        placeholder="City"
                      />
                    ) : (
                      orDash(doctor?.city)
                    )}
                  </Field>
                  <Field label="State">
                    {editing ? (
                      <Input
                        value={form.state}
                        onChange={(e) => setField("state", e.target.value)}
                        placeholder="State"
                      />
                    ) : (
                      orDash(doctor?.state)
                    )}
                  </Field>
                  <Field label="Pincode">
                    {editing ? (
                      <Input
                        value={form.pincode}
                        onChange={(e) => setField("pincode", e.target.value)}
                        placeholder="Pincode"
                      />
                    ) : (
                      orDash(doctor?.pincode)
                    )}
                  </Field>
                </FieldGrid>
              </div>
            </TabsContent>

            {/* TAB 3: CREDENTIALS & SCHEDULE */}
            <TabsContent value="credentials" className="flex flex-col gap-6">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <GraduationCap className="size-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Professional Credentials</h3>
                </div>
                <FieldGrid cols={3}>
                  <Field label="Primary Specialization">
                    {editing ? (
                      <Select
                        value={form.specialization}
                        onValueChange={(v) => setField("specialization", v || "")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Specialization" />
                        </SelectTrigger>
                        <SelectContent>
                          {SPECIALIZATIONS.map((spec) => (
                            <SelectItem key={spec} value={spec}>
                              {spec}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      orDash(doctor?.specialization)
                    )}
                  </Field>

                  <Field label="Qualification (Degrees)">
                    {editing ? (
                      <Input
                        value={form.qualification}
                        onChange={(e) => setField("qualification", e.target.value)}
                        placeholder="MBBS, MD, DNB"
                      />
                    ) : (
                      orDash(doctor?.qualification)
                    )}
                  </Field>

                  <Field label="Experience (Years)">
                    {editing ? (
                      <Input
                        type="number"
                        min={0}
                        value={form.experienceYears}
                        onChange={(e) => setField("experienceYears", Number(e.target.value))}
                      />
                    ) : (
                      orDash(doctor?.experienceYears)
                    )}
                  </Field>

                  <Field label="License Number">
                    {editing ? (
                      <Input
                        value={form.licenseNo}
                        onChange={(e) => setField("licenseNo", e.target.value)}
                        placeholder="MCI-123456"
                      />
                    ) : (
                      orDash(doctor?.licenseNo)
                    )}
                  </Field>

                  <Field label="Registration No.">
                    {editing ? (
                      <Input
                        value={form.registrationNo}
                        onChange={(e) => setField("registrationNo", e.target.value)}
                        placeholder="REG-98765"
                      />
                    ) : (
                      orDash(doctor?.registrationNo)
                    )}
                  </Field>

                  <Field label="Department">
                    {editing ? (
                      <Input
                        value={form.department}
                        onChange={(e) => setField("department", e.target.value)}
                        placeholder="Internal Medicine"
                      />
                    ) : (
                      orDash(doctor?.department)
                    )}
                  </Field>
                </FieldGrid>
              </div>

              <Separator />

              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Calendar className="size-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Consultation Availability</h3>
                </div>
                <FieldGrid cols={2}>
                  <Field label="Available Consultation Days" className="col-span-2">
                    {editing ? (
                      <div className="flex flex-wrap gap-2.5 pt-1">
                        {DAYS_OF_WEEK.map((day) => {
                          const selected = form.scheduleDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => toggleDay(day)}
                              className={`flex h-9 w-14 items-center justify-center rounded-lg font-semibold text-xs transition-all ${
                                selected
                                  ? "bg-primary text-primary-foreground shadow-sm"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {(doctor?.scheduleDays || ["Mon", "Tue", "Wed", "Thu", "Fri"]).map((day) => (
                          <Badge key={day} variant="secondary" className="px-3 py-1 font-medium">
                            {day}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </Field>
                </FieldGrid>
              </div>
            </TabsContent>

            {/* TAB 4: ASSOCIATED CLINIC INFORMATION */}
            <TabsContent value="clinic" className="flex flex-col gap-6">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Building2 className="size-4 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Associated Clinic Information</h3>
                </div>
                <FieldGrid cols={3}>
                  <Field label="Clinic Name" value={clinic?.name ?? "My Clinic"} />
                  <Field label="Clinic Code / Slug" value={clinic?.slug ?? clinic?.clinicId ?? "—"} />
                  <Field label="Clinic Status" value={clinic?.status ?? "active"} />
                  <Field label="Clinic Phone" value={clinic?.phone ?? "—"} />
                  <Field label="Clinic Email" value={clinic?.email ?? "—"} />
                  <Field label="Clinic Website" value={clinic?.website ?? "—"} />
                  <Field label="Clinic Address" className="col-span-3" value={clinic?.address ?? "Address not updated"} />
                  <Field label="Working Hours" value={clinic?.settings?.workingHours ? `${clinic.settings.workingHours.open} – ${clinic.settings.workingHours.close}` : "9:00 AM – 6:00 PM"} />
                  <Field label="Slot Duration" value={`${clinic?.settings?.slotMinutes ?? 15} minutes`} />
                  <Field label="Currency" value={clinic?.settings?.currency ?? "INR"} />
                </FieldGrid>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
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
        cols === 4
          ? "sm:grid-cols-2 lg:grid-cols-4"
          : cols === 3
          ? "sm:grid-cols-2 lg:grid-cols-3"
          : cols === 2
          ? "sm:grid-cols-2"
          : ""
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
