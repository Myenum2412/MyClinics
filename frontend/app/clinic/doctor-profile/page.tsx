"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Award,
  BadgeCheck,
  Building,
  Calendar,
  Camera,
  Check,
  Clock,
  DollarSign,
  Edit3,
  FileText,
  Globe,
  GraduationCap,
  HeartPulse,
  IndianRupee,
  Languages,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
  UserCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type Doctor,
  getDoctor,
  listDoctors,
  updateDoctor,
  uploadAvatar,
} from "@/lib/clinic-api";
import { PersonAvatar, bustAvatarCache } from "@/components/clinic/person-avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export default function DoctorProfilePage() {
  const session = useRequireRole("patient");
  const clinicId = session?.clinicId ?? "";
  const doctorIdFromSession = session?.doctorId ?? null;

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoRefresh, setPhotoRefresh] = useState(0);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Form Fields State
  const [formData, setFormData] = useState({
    name: "",
    specialization: "",
    qualification: "",
    licenseNo: "",
    registrationNo: "",
    experienceYears: 0,
    fee: 0,
    phone: "",
    whatsapp: "",
    email: "",
    gender: "male" as "male" | "female" | "other",
    dateOfBirth: "",
    department: "",
    issuingAuthority: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    languages: "",
    about: "",
    scheduleDays: [] as string[],
  });

  useEffect(() => {
    if (!clinicId) return;
    let active = true;
    setLoading(true);

    async function loadDoctorProfile() {
      try {
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

        if (active && docData) {
          setDoctor(docData);
          setFormData({
            name: docData.name || "",
            specialization: docData.specialization || "General Medicine",
            qualification: docData.qualification || "",
            licenseNo: docData.licenseNo || "",
            registrationNo: docData.registrationNo || "",
            experienceYears: docData.experienceYears || 0,
            fee: docData.fee || 0,
            phone: docData.phone || "",
            whatsapp: docData.whatsapp || "",
            email: docData.email || "",
            gender: (docData.gender as "male" | "female" | "other") || "male",
            dateOfBirth: docData.dateOfBirth || "",
            department: docData.department || "",
            issuingAuthority: docData.issuingAuthority || "",
            address: docData.address || "",
            city: docData.city || "",
            state: docData.state || "",
            pincode: docData.pincode || "",
            languages: docData.languages || "",
            about: docData.about || "",
            scheduleDays: docData.scheduleDays || ["Mon", "Tue", "Wed", "Thu", "Fri"],
          });
        }
      } catch (e) {
        if (active) toast.error("Failed to load doctor profile");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDoctorProfile();
    return () => {
      active = false;
    };
  }, [clinicId, doctorIdFromSession]);

  const targetDoctorId = doctor?.doctorId ?? doctorIdFromSession;

  async function handlePhotoUpload(file: File | null) {
    if (!file || !targetDoctorId) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Only JPG or PNG images are allowed");
      return;
    }
    setUploadingPhoto(true);
    try {
      await uploadAvatar(clinicId, "doctor", targetDoctorId, file);
      bustAvatarCache(clinicId, "doctor", targetDoctorId);
      setPhotoRefresh((r) => r + 1);
      toast.success("Profile photo updated successfully");
    } catch {
      toast.error("Failed to upload profile photo");
    } finally {
      setUploadingPhoto(false);
    }
  }

  const toggleDay = (day: string) => {
    setFormData((prev) => {
      const exists = prev.scheduleDays.includes(day);
      return {
        ...prev,
        scheduleDays: exists
          ? prev.scheduleDays.filter((d) => d !== day)
          : [...prev.scheduleDays, day],
      };
    });
  };

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!targetDoctorId) {
      toast.error("Doctor record not found");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Doctor name is required");
      return;
    }
    if (!formData.specialization.trim()) {
      toast.error("Specialization is required");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateDoctor(clinicId, targetDoctorId, {
        name: formData.name.trim(),
        specialization: formData.specialization.trim(),
        qualification: formData.qualification.trim() || null,
        licenseNo: formData.licenseNo.trim() || null,
        registrationNo: formData.registrationNo.trim() || null,
        experienceYears: Number(formData.experienceYears) || 0,
        fee: Number(formData.fee) || 0,
        phone: formData.phone.trim() || null,
        whatsapp: formData.whatsapp.trim() || null,
        email: formData.email.trim() || null,
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth || null,
        department: formData.department.trim() || null,
        issuingAuthority: formData.issuingAuthority.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        pincode: formData.pincode.trim() || null,
        languages: formData.languages.trim() || null,
        about: formData.about.trim() || null,
        scheduleDays: formData.scheduleDays,
      });

      setDoctor(updated);
      setIsEditing(false);
      toast.success("Doctor profile updated successfully!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update doctor profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Breadcrumb className="mb-2">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/clinic">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Doctor Profile</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            My Doctor Profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your personal details, clinical specialization, fees, and consultation hours.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isEditing ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={saving}
                className="gap-1.5"
              >
                <X className="size-4" /> Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                className="gap-1.5 shadow-sm"
              >
                {saving ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  <Save className="size-4" />
                )}
                Save Profile
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={() => setIsEditing(true)}
              className="gap-1.5 shadow-sm"
            >
              <Edit3 className="size-4" /> Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Hero Doctor Card */}
      <Card className="relative overflow-hidden border-border bg-card shadow-sm">
        <div className="h-32 bg-gradient-to-r from-sky-500/20 via-indigo-500/15 to-primary/10" />

        <CardContent className="relative px-6 pb-6 pt-0 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12 mb-6">
            <div className="relative flex items-center justify-center">
              {targetDoctorId ? (
                <PersonAvatar
                  clinicId={clinicId}
                  ownerType="doctor"
                  ownerId={targetDoctorId}
                  name={doctor?.name ?? session?.name ?? "Doctor"}
                  size="md"
                  refreshKey={photoRefresh}
                  className="size-24 sm:size-28 rounded-2xl ring-4 ring-background shadow-md border border-border"
                />
              ) : (
                <div className="flex size-24 sm:size-28 items-center justify-center rounded-2xl bg-muted ring-4 ring-background">
                  <Stethoscope className="size-12 text-muted-foreground" />
                </div>
              )}
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto || !targetDoctorId}
                aria-label="Upload profile photo"
                className="absolute bottom-1 right-1 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Camera className="size-4" />
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => {
                  handlePhotoUpload(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 font-medium px-3 py-1 text-xs">
                <Stethoscope className="size-3.5 mr-1" /> Specialist Doctor
              </Badge>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-medium px-3 py-1 text-xs">
                <ShieldCheck className="size-3.5 mr-1" /> Active Roster
              </Badge>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Dr. {doctor?.name || session?.name || "Doctor"}
              </h2>
              <BadgeCheck className="size-6 text-sky-500" />
            </div>
            <p className="text-sm font-medium text-muted-foreground flex flex-wrap items-center gap-3">
              <span>{doctor?.specialization || "General Medicine"}</span>
              <span>•</span>
              <span>{doctor?.qualification || "MBBS"}</span>
              {doctor?.experienceYears ? (
                <>
                  <span>•</span>
                  <span>{doctor.experienceYears} Years Exp.</span>
                </>
              ) : null}
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400">
                <IndianRupee className="size-4.5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Consultation Fee</p>
                <p className="text-sm font-semibold text-foreground">
                  ₹{doctor?.fee ?? 0}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="size-4.5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">License No.</p>
                <p className="text-sm font-semibold text-foreground truncate max-w-[120px]">
                  {doctor?.licenseNo || "N/A"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400">
                <Building className="size-4.5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Department</p>
                <p className="text-sm font-semibold text-foreground">
                  {doctor?.department || "General Practice"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                <Languages className="size-4.5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Languages</p>
                <p className="text-sm font-semibold text-foreground truncate max-w-[120px]">
                  {doctor?.languages || "English, Hindi"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Profile Form & Details */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Personal & Contact Information */}
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <User className="size-4 text-primary" /> Personal & Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Dr. Full Name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  {isEditing ? (
                    <Select
                      value={formData.gender}
                      onValueChange={(val) =>
                        setFormData({ ...formData, gender: val as "male" | "female" | "other" })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={formData.gender.toUpperCase()} disabled />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!isEditing}
                    placeholder="+91 9876543210"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp Number</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    disabled={!isEditing}
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing}
                  placeholder="doctor@myclinic.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Clinic Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Street / Suite No."
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Credentials & Specialization */}
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <GraduationCap className="size-4 text-primary" /> Professional Credentials
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="space-y-2">
                <Label htmlFor="specialization">Primary Specialization *</Label>
                {isEditing ? (
                  <Select
                    value={formData.specialization}
                    onValueChange={(val) => setFormData({ ...formData, specialization: val || "" })}
                  >
                    <SelectTrigger className="w-full">
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
                  <Input value={formData.specialization} disabled />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="qualification">Qualification (Degrees)</Label>
                <Input
                  id="qualification"
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  disabled={!isEditing}
                  placeholder="MBBS, MD (General Medicine), DNB"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="experienceYears">Experience (Years)</Label>
                  <Input
                    id="experienceYears"
                    type="number"
                    value={formData.experienceYears}
                    onChange={(e) =>
                      setFormData({ ...formData, experienceYears: Number(e.target.value) })
                    }
                    disabled={!isEditing}
                    min={0}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fee">Consultation Fee (₹)</Label>
                  <Input
                    id="fee"
                    type="number"
                    value={formData.fee}
                    onChange={(e) => setFormData({ ...formData, fee: Number(e.target.value) })}
                    disabled={!isEditing}
                    min={0}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="licenseNo">License Number</Label>
                  <Input
                    id="licenseNo"
                    value={formData.licenseNo}
                    onChange={(e) => setFormData({ ...formData, licenseNo: e.target.value })}
                    disabled={!isEditing}
                    placeholder="MCI-123456"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registrationNo">Registration No.</Label>
                  <Input
                    id="registrationNo"
                    value={formData.registrationNo}
                    onChange={(e) => setFormData({ ...formData, registrationNo: e.target.value })}
                    disabled={!isEditing}
                    placeholder="REG-98765"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Internal Medicine"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="issuingAuthority">Issuing Authority</Label>
                  <Input
                    id="issuingAuthority"
                    value={formData.issuingAuthority}
                    onChange={(e) =>
                      setFormData({ ...formData, issuingAuthority: e.target.value })
                    }
                    disabled={!isEditing}
                    placeholder="State Medical Council"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="languages">Languages Spoken</Label>
                <Input
                  id="languages"
                  value={formData.languages}
                  onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                  disabled={!isEditing}
                  placeholder="English, Hindi, Tamil"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Schedule & Bio Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Consultation Days */}
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Calendar className="size-4 text-primary" /> Consultation Days
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <p className="text-xs text-muted-foreground">
                Select the days of the week when you are available for patient consultations at the clinic.
              </p>
              <div className="flex flex-wrap gap-2.5 pt-2">
                {DAYS_OF_WEEK.map((day) => {
                  const selected = formData.scheduleDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!isEditing}
                      onClick={() => toggleDay(day)}
                      className={`flex h-10 w-14 items-center justify-center rounded-xl font-semibold text-xs transition-all ${
                        selected
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      } ${!isEditing ? "cursor-default opacity-80" : "cursor-pointer"}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* About / Professional Biography */}
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <FileText className="size-4 text-primary" /> About & Practice Bio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="space-y-2">
                <Label htmlFor="about">Doctor Biography</Label>
                <Textarea
                  id="about"
                  rows={4}
                  value={formData.about}
                  onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Share a brief overview of your clinical experience, special procedures, and patient care philosophy..."
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Bar when editing */}
        {isEditing && (
          <div className="sticky bottom-6 flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-lg">
            <span className="text-xs font-medium text-muted-foreground">
              You are currently editing your doctor profile.
            </span>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
                {saving ? (
                  <span className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  <Save className="size-3.5" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </form>
    </main>
  );
}
