"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ClinicSession, Clinic, Doctor } from "@/lib/clinic-api";
import {
  getOwnClinic,
  getDoctor,
  listDoctors,
  updateDoctor,
  updateClinicUser,
  uploadAvatar,
} from "@/lib/clinic-api";
import { PersonAvatar, bustAvatarCache } from "@/components/clinic/person-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Stethoscope,
  Building2,
  Lock,
  Camera,
  Mail,
  Phone,
  Calendar,
  Award,
  IndianRupee,
  MapPin,
  Clock,
  Globe,
  Save,
  Pencil,
  X,
  CheckCircle2,
  UserCheck,
  Briefcase,
  ShieldCheck,
} from "lucide-react";

export function DoctorProfileView({ session }: { session: ClinicSession }) {
  const clinicId = session.clinicId ?? "";
  const doctorId = session.doctorId ?? "";

  const [loading, setLoading] = useState(true);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [photoRefresh, setPhotoRefresh] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Doctor profile editing state
  const [editing, setEditing] = useState(false);
  const [savingDoctor, setSavingDoctor] = useState(false);
  const [docForm, setDocForm] = useState({
    name: "",
    specialization: "",
    qualification: "",
    registrationNo: "",
    department: "",
    experienceYears: "",
    fee: "",
    phone: "",
    whatsapp: "",
    email: "",
    about: "",
    languages: "",
  });

  // Password Reset state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    if (!clinicId) return;
    let active = true;
    setLoading(true);

    const clinicPromise = getOwnClinic(clinicId).catch(() => null);
    
    // Fetch doctor record either by doctorId directly or list search
    const doctorPromise = doctorId
      ? getDoctor(clinicId, doctorId).catch(() => null)
      : listDoctors(clinicId, { limit: 50 }).then((res) => {
          return res.items.find((d) => d.userId === session.userId || d.email === session.email) ?? res.items[0] ?? null;
        }).catch(() => null);

    Promise.all([clinicPromise, doctorPromise])
      .then(([c, d]) => {
        if (!active) return;
        setClinic(c);
        setDoctor(d);
        if (d) {
          setDocForm({
            name: d.name || "",
            specialization: d.specialization || "",
            qualification: d.qualification || "",
            registrationNo: d.registrationNo || d.licenseNo || "",
            department: d.department || "",
            experienceYears: d.experienceYears ? String(d.experienceYears) : "",
            fee: d.fee ? String(d.fee) : "",
            phone: d.phone || "",
            whatsapp: d.whatsapp || "",
            email: d.email || "",
            about: d.about || "",
            languages: d.languages || "",
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [clinicId, doctorId, session.userId, session.email]);

  // Handle Doctor Avatar upload
  async function handleAvatarUpload(file: File | null) {
    if (!file || !doctor) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Only JPG or PNG images are allowed");
      return;
    }
    setUploadingPhoto(true);
    try {
      await uploadAvatar(clinicId, "doctor", doctor.doctorId, file);
      bustAvatarCache(clinicId, "doctor", doctor.doctorId);
      setPhotoRefresh((r) => r + 1);
      toast.success("Profile photo updated");
    } catch {
      toast.error("Failed to upload profile photo");
    } finally {
      setUploadingPhoto(false);
    }
  }

  // Handle Save Doctor Profile
  async function handleSaveDoctor() {
    if (!doctor) return;
    setSavingDoctor(true);
    try {
      const updated = await updateDoctor(clinicId, doctor.doctorId, {
        name: docForm.name,
        specialization: docForm.specialization,
        qualification: docForm.qualification || null,
        registrationNo: docForm.registrationNo || null,
        department: docForm.department || null,
        experienceYears: docForm.experienceYears ? Number(docForm.experienceYears) : null,
        fee: docForm.fee ? Number(docForm.fee) : null,
        phone: docForm.phone || null,
        whatsapp: docForm.whatsapp || null,
        email: docForm.email || null,
        about: docForm.about || null,
        languages: docForm.languages || null,
      });
      setDoctor(updated);
      setEditing(false);
      toast.success("Doctor profile updated successfully");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update doctor profile");
    } finally {
      setSavingDoctor(false);
    }
  }

  // Handle Reset Password
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }

    setResettingPassword(true);
    try {
      await updateClinicUser(clinicId, session.userId, {
        password: newPassword,
      });
      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setResettingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const doctorName = doctor?.name ?? session.name ?? "Doctor";
  const formattedDoctorName = doctorName.startsWith("Dr.") ? doctorName : `Dr. ${doctorName}`;
  const workingHours = clinic?.settings?.workingHours;
  const hoursRange = workingHours
    ? `${workingHours.open} – ${workingHours.close}`
    : "9:00 AM – 6:00 PM";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-2">
      {/* ── Top Header Banner Card ── */}
      <Card className="overflow-hidden border-border shadow-sm">
        <div className="relative h-28 bg-gradient-to-r from-indigo-500/20 via-sky-500/15 to-primary/10" />
        <div className="relative px-6 pb-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
              <div className="relative">
                <PersonAvatar
                  clinicId={clinicId}
                  ownerType="doctor"
                  ownerId={doctor?.doctorId ?? "me"}
                  name={doctorName}
                  size="md"
                  refreshKey={photoRefresh}
                  className="size-24 rounded-full ring-4 ring-background shadow-md bg-card"
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground hover:bg-muted"
                  title="Upload profile photo"
                >
                  <Camera className="size-4" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    handleAvatarUpload(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="text-center sm:text-left space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {formattedDoctorName}
                  </h1>
                  <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 gap-1 font-medium">
                    <Stethoscope className="size-3" />
                    {doctor?.specialization || "General Physician"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  {doctor?.qualification || "Medical Specialist"} • {doctor?.department || "Clinical Medicine"}
                </p>
                {doctor?.registrationNo && (
                  <p className="text-xs text-muted-foreground">
                    Reg / License: <span className="font-semibold text-foreground">{doctor.registrationNo}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-end gap-2">
              {!editing ? (
                <Button onClick={() => setEditing(true)} variant="outline" size="sm" className="gap-1.5 shadow-xs">
                  <Pencil className="size-4" /> Edit Profile
                </Button>
              ) : (
                <>
                  <Button onClick={() => setEditing(false)} variant="ghost" size="sm" className="gap-1.5">
                    <X className="size-4" /> Cancel
                  </Button>
                  <Button onClick={handleSaveDoctor} disabled={savingDoctor} size="sm" className="gap-1.5 shadow-xs">
                    <Save className="size-4" /> {savingDoctor ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Main Content Grid ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Doctor Profile Details (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Doctor Details Card */}
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UserCheck className="size-4.5 text-primary" />
                Doctor Professional Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {editing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Full Name</Label>
                    <Input
                      value={docForm.name}
                      onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
                      placeholder="Doctor Name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Specialization</Label>
                    <Input
                      value={docForm.specialization}
                      onChange={(e) => setDocForm({ ...docForm, specialization: e.target.value })}
                      placeholder="e.g. General Physician, Pediatrics"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Qualifications</Label>
                    <Input
                      value={docForm.qualification}
                      onChange={(e) => setDocForm({ ...docForm, qualification: e.target.value })}
                      placeholder="e.g. MBBS, MD, MS"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Registration / License No</Label>
                    <Input
                      value={docForm.registrationNo}
                      onChange={(e) => setDocForm({ ...docForm, registrationNo: e.target.value })}
                      placeholder="e.g. MC-98765"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Department</Label>
                    <Input
                      value={docForm.department}
                      onChange={(e) => setDocForm({ ...docForm, department: e.target.value })}
                      placeholder="e.g. Outpatient Department"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Experience (Years)</Label>
                    <Input
                      type="number"
                      value={docForm.experienceYears}
                      onChange={(e) => setDocForm({ ...docForm, experienceYears: e.target.value })}
                      placeholder="e.g. 8"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Consulting Fee (₹)</Label>
                    <Input
                      type="number"
                      value={docForm.fee}
                      onChange={(e) => setDocForm({ ...docForm, fee: e.target.value })}
                      placeholder="e.g. 500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone Number</Label>
                    <Input
                      value={docForm.phone}
                      onChange={(e) => setDocForm({ ...docForm, phone: e.target.value })}
                      placeholder="+91 9876543210"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">WhatsApp Number</Label>
                    <Input
                      value={docForm.whatsapp}
                      onChange={(e) => setDocForm({ ...docForm, whatsapp: e.target.value })}
                      placeholder="+91 9876543210"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email Address</Label>
                    <Input
                      value={docForm.email}
                      onChange={(e) => setDocForm({ ...docForm, email: e.target.value })}
                      placeholder="doctor@clinic.com"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">About / Bio</Label>
                    <Input
                      value={docForm.about}
                      onChange={(e) => setDocForm({ ...docForm, about: e.target.value })}
                      placeholder="Short professional summary..."
                    />
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  <div className="flex justify-between py-3 text-sm">
                    <span className="text-muted-foreground">Full Name</span>
                    <span className="font-medium text-foreground">{formattedDoctorName}</span>
                  </div>
                  <div className="flex justify-between py-3 text-sm">
                    <span className="text-muted-foreground">Specialization</span>
                    <span className="font-medium text-foreground">{doctor?.specialization || "General Medicine"}</span>
                  </div>
                  <div className="flex justify-between py-3 text-sm">
                    <span className="text-muted-foreground">Qualification</span>
                    <span className="font-medium text-foreground">{doctor?.qualification || "MBBS"}</span>
                  </div>
                  <div className="flex justify-between py-3 text-sm">
                    <span className="text-muted-foreground">Registration / License No</span>
                    <span className="font-medium text-foreground">{doctor?.registrationNo || doctor?.licenseNo || "—"}</span>
                  </div>
                  <div className="flex justify-between py-3 text-sm">
                    <span className="text-muted-foreground">Department</span>
                    <span className="font-medium text-foreground">{doctor?.department || "General OP"}</span>
                  </div>
                  <div className="flex justify-between py-3 text-sm">
                    <span className="text-muted-foreground">Experience</span>
                    <span className="font-medium text-foreground">{doctor?.experienceYears ? `${doctor.experienceYears} Years` : "—"}</span>
                  </div>
                  <div className="flex justify-between py-3 text-sm">
                    <span className="text-muted-foreground">Consultation Fee</span>
                    <span className="font-medium text-foreground">{doctor?.fee ? `₹${doctor.fee}` : "—"}</span>
                  </div>
                  <div className="flex justify-between py-3 text-sm">
                    <span className="text-muted-foreground">Contact Phone</span>
                    <span className="font-medium text-foreground">{doctor?.phone || "—"}</span>
                  </div>
                  <div className="flex justify-between py-3 text-sm">
                    <span className="text-muted-foreground">Email Address</span>
                    <span className="font-medium text-foreground">{doctor?.email || session.email || "—"}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Practicing Clinic Details Card ── */}
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building2 className="size-4.5 text-primary" />
                Practicing Clinic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="divide-y divide-border">
                <div className="flex justify-between py-3 text-sm">
                  <span className="text-muted-foreground">Clinic Name</span>
                  <span className="font-semibold text-foreground">{clinic?.name || "My Clinic"}</span>
                </div>
                <div className="flex justify-between py-3 text-sm">
                  <span className="text-muted-foreground">Registration / ID</span>
                  <span className="font-mono text-xs text-foreground">{clinic?.slug || clinic?.clinicId || "—"}</span>
                </div>
                <div className="flex justify-between py-3 text-sm">
                  <span className="text-muted-foreground">Clinic Address</span>
                  <span className="font-medium text-foreground text-right">{clinic?.address || "Address not specified"}</span>
                </div>
                <div className="flex justify-between py-3 text-sm">
                  <span className="text-muted-foreground">Clinic Phone</span>
                  <span className="font-medium text-foreground">{clinic?.phone || "—"}</span>
                </div>
                <div className="flex justify-between py-3 text-sm">
                  <span className="text-muted-foreground">Clinic Email</span>
                  <span className="font-medium text-foreground">{clinic?.email || "—"}</span>
                </div>
                <div className="flex justify-between py-3 text-sm">
                  <span className="text-muted-foreground">Clinic Working Hours</span>
                  <span className="font-medium text-foreground">{hoursRange}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Reset Password & Quick Security */}
        <div className="space-y-6">
          {/* Reset Password Form */}
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Lock className="size-4.5 text-primary" />
                Reset Password
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Update your doctor account password for secure portal access.
                </p>

                <div className="space-y-1.5">
                  <Label className="text-xs">New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    minLength={6}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    minLength={6}
                  />
                </div>

                <Button type="submit" disabled={resettingPassword} className="w-full gap-1.5 shadow-xs">
                  <ShieldCheck className="size-4" />
                  {resettingPassword ? "Updating..." : "Reset Password"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Account Status Card */}
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShieldCheck className="size-4.5 text-success" />
                Account & Credentials
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-foreground">{session.userId}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Account Role</span>
                <Badge variant="outline" className="capitalize text-[11px] bg-primary/10 text-primary border-primary/20">
                  {session.role}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Account Status</span>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
