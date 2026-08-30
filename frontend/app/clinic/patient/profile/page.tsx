"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  getMyPatient,
  getOwnClinic,
  updatePatient,
  type Patient,
  type Clinic,
} from "@/lib/clinic-api";
import { PersonAvatar } from "@/components/clinic/person-avatar";
import { Button } from "@/components/ui/button";
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
  Clock,
  Globe,
  HeartPulse,
  Info,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  UserRound,
  X,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { formatMonthYear } from "@/lib/datetime";

interface FormState {
  fullName: string;
  mobile: string;
  whatsapp: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  bloodGroup: string;
  height: string;
  weight: string;
  bloodPressure: string;
  temperature: string;
  pulse: string;
  respiratoryRate: string;
  spo2: string;
  maritalStatus: string;
  occupation: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactMobile: string;
  allergies: string;
  medicalConditions: string;
  previousSurgeries: string;
  currentMedications: string;
  idType: string;
  idNumber: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  insurancePolicyHolderName: string;
  insuranceValidTill: string;
}

function patientToForm(p: Patient): FormState {
  return {
    fullName: p.fullName ?? "",
    mobile: p.mobile ?? "",
    whatsapp: p.whatsapp ?? "",
    email: p.email ?? "",
    gender: p.gender ?? "",
    dateOfBirth: p.dateOfBirth ?? "",
    bloodGroup: p.bloodGroup ?? "",
    height: p.height ?? "",
    weight: p.weight ?? "",
    bloodPressure: (p as any).bloodPressure ?? "",
    temperature: (p as any).temperature ?? "",
    pulse: (p as any).pulse ?? "",
    respiratoryRate: (p as any).respiratoryRate ?? "",
    spo2: (p as any).spo2 ?? "",
    maritalStatus: p.maritalStatus ?? "",
    occupation: p.occupation ?? "",
    address: p.address ?? "",
    city: p.city ?? "",
    state: p.state ?? "",
    pincode: p.pincode ?? "",
    emergencyContactName: p.emergencyContactName ?? "",
    emergencyContactRelationship: p.emergencyContactRelationship ?? "",
    emergencyContactMobile: p.emergencyContactMobile ?? "",
    allergies: (p.allergies ?? []).join(", "),
    medicalConditions: p.medicalConditions ?? "",
    previousSurgeries: p.previousSurgeries ?? "",
    currentMedications: p.currentMedications ?? "",
    idType: p.idType ?? "",
    idNumber: p.idNumber ?? "",
    insuranceProvider: p.insuranceProvider ?? "",
    insurancePolicyNumber: p.insurancePolicyNumber ?? "",
    insurancePolicyHolderName: p.insurancePolicyHolderName ?? "",
    insuranceValidTill: p.insuranceValidTill ?? "",
  };
}

function orDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function memberSince(createdAt: string | undefined): string {
  if (!createdAt) return "—";
  return formatMonthYear(createdAt);
}

function FieldGrid({ children, cols = 4 }: { children: React.ReactNode; cols?: number }) {
  const colClass =
    cols === 2
      ? "grid-cols-1 md:grid-cols-2"
      : cols === 3
      ? "grid-cols-1 md:grid-cols-3"
      : "grid-cols-1 sm:grid-cols-2 md:grid-cols-4";
  return <div className={`grid gap-4 ${colClass}`}>{children}</div>;
}

function Field({
  label,
  value,
  children,
  className = "",
}: {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children ? (
        children
      ) : (
        <p className="text-sm font-medium text-foreground">{value ?? "—"}</p>
      )}
    </div>
  );
}

export default function PatientProfilePage() {
  const session = useRequireRole("patient");
  const clinicId = session?.clinicId ?? "";
  const router = useRouter();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);

  const load = useCallback(async () => {
    if (!clinicId) return;
    try {
      const [me, clinicRes] = await Promise.all([
        getMyPatient(clinicId),
        getOwnClinic(clinicId).catch(() => null),
      ]);
      setPatient(me);
      setClinic(clinicRes);
      if (me) setForm(patientToForm(me));
    } catch {
      toast.error("Failed to load patient profile");
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    if (!clinicId) return;
    load();
  }, [clinicId, load]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  function startEdit() {
    if (!patient) return;
    setForm(patientToForm(patient));
    setEditing(true);
  }

  async function handleSave() {
    if (!clinicId || !patient || !form) return;
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        fullName: form.fullName,
        mobile: form.mobile,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        gender: form.gender || null,
        dateOfBirth: form.dateOfBirth || null,
        bloodGroup: form.bloodGroup || null,
        height: form.height || null,
        weight: form.weight || null,
        bloodPressure: form.bloodPressure || null,
        temperature: form.temperature || null,
        pulse: form.pulse || null,
        respiratoryRate: form.respiratoryRate || null,
        spo2: form.spo2 || null,
        maritalStatus: form.maritalStatus || null,
        occupation: form.occupation || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        pincode: form.pincode || null,
        emergencyContactName: form.emergencyContactName || null,
        emergencyContactRelationship: form.emergencyContactRelationship || null,
        emergencyContactMobile: form.emergencyContactMobile || null,
        allergies: form.allergies ? form.allergies.split(",").map(a => a.trim()).filter(Boolean) : [],
        medicalConditions: form.medicalConditions || null,
        previousSurgeries: form.previousSurgeries || null,
        currentMedications: form.currentMedications || null,
        idType: form.idType || null,
        idNumber: form.idNumber || null,
        insuranceProvider: form.insuranceProvider || null,
        insurancePolicyNumber: form.insurancePolicyNumber || null,
        insurancePolicyHolderName: form.insurancePolicyHolderName || null,
        insuranceValidTill: form.insuranceValidTill || null,
      };

      const updated = await updatePatient(clinicId, patient.patientId, payload);
      setPatient(updated);
      setEditing(false);
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("clinic_token");
    document.cookie = "clinic_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/login");
  };

  if (loading || !patient || !form) {
    if (!loading && (!patient || !form)) {
      return (
        <div className="mx-auto max-w-xl p-12 text-center my-12 rounded-xl border border-border bg-card shadow-sm">
          <UserRound className="mx-auto size-12 text-muted-foreground opacity-50 mb-3" />
          <h2 className="text-xl font-bold text-foreground">Profile Unavailable</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Unable to load patient profile details. Please contact clinic support.
          </p>
          <Button className="mt-4 gap-2" onClick={() => load()}>
            Reload Profile
          </Button>
        </div>
      );
    }
    return (
      <div className="w-full space-y-6">
        <Skeleton className="h-9 w-48 rounded-lg" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const locationLabel = [patient.city, patient.state].filter(Boolean).join(", ") || "—";
  const joinedDateLabel = `Member since ${memberSince(patient.createdAt)}`;
  const clinicName = clinic?.name || "Meenu Care";
  const stats = [
    { label: "Blood Group", value: orDash(patient.bloodGroup) },
    { label: "Gender", value: orDash(patient.gender) },
    { label: "DOB", value: orDash(patient.dateOfBirth) },
  ];

  return (
    <div className="w-full min-h-[calc(100vh-4rem)]">
      <section className="w-full min-h-[calc(100vh-4rem)] rounded-xl border border-purple-100/90 bg-background overflow-hidden flex flex-col shadow-2xs">
        {/* Soft Lavender Gradient Banner Header */}
        <div
          className="h-32 w-full bg-gradient-to-br from-indigo-500/15 via-purple-100/90 to-indigo-50/60"
          aria-hidden="true"
        />

        <div className="px-4 sm:px-6 pb-6">
          <div className="flex items-end justify-between gap-4">
            <div className="-mt-12 sm:-mt-14">
              <PersonAvatar
                clinicId={clinicId}
                ownerType="patient"
                ownerId={patient.patientId}
                name={patient.fullName}
                size="md"
                className="size-20 sm:size-24 rounded-full ring-4 ring-white shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2 pt-4">
              {!editing ? (
                <>
                  <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-purple-200 hover:bg-purple-50" onClick={startEdit}>
                    <Pencil className="size-4 text-indigo-600" />
                    <span>Edit Profile</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    onClick={handleLogout}
                  >
                    <LogOut className="size-4" />
                    <span>Logout</span>
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={() => setEditing(false)}>
                    <X className="size-4" />
                    <span>Cancel</span>
                  </Button>
                  <Button size="sm" className="gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={handleSave} disabled={saving}>
                    <Save className="size-4" />
                    <span>{saving ? "Saving..." : "Save"}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    onClick={handleLogout}
                  >
                    <LogOut className="size-4" />
                    <span>Logout</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {patient.fullName}
            </h2>
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-200/80 rounded-full px-2.5 py-0.5 text-xs font-bold"
            >
              <span className="mr-1.5 size-1.5 rounded-full bg-emerald-600" />
              Active Patient
            </Badge>
          </div>
          <p className="text-xs font-mono text-slate-500 mt-0.5">ID: {patient.patientId}</p>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs sm:text-sm">
            {stats.map((stat) => (
              <span key={stat.label} className="flex items-baseline gap-1.5">
                <span className="font-bold text-slate-900 tabular-nums">{stat.value}</span>
                <span className="text-slate-500">{stat.label}</span>
              </span>
            ))}
          </div>

          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <Building2 className="size-4 shrink-0 text-indigo-600" />
              <span className="font-semibold text-slate-900">Clinic: {clinicName}</span>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-indigo-600" />
              <span>{locationLabel}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-indigo-600" />
              <span>{orDash(patient.mobile)}</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 shrink-0 text-indigo-600" />
              <span>{orDash(patient.email)}</span>
            </li>
            <li className="flex items-center gap-2">
              <Calendar className="size-4 shrink-0 text-indigo-600" />
              <span>{joinedDateLabel}</span>
            </li>
          </ul>

          <Tabs defaultValue="overview" className="mt-6 gap-4">
            <TabsList className="w-full bg-purple-50/80 border border-purple-100 rounded-xl p-1 grid grid-cols-2 sm:grid-cols-4 gap-1 h-auto">
              <TabsTrigger value="overview" className="rounded-lg text-xs sm:text-sm font-semibold py-2 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs">
                Overview
              </TabsTrigger>
              <TabsTrigger value="contact" className="rounded-lg text-xs sm:text-sm font-semibold py-2 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs">
                Contact & Address
              </TabsTrigger>
              <TabsTrigger value="medical" className="rounded-lg text-xs sm:text-sm font-semibold py-2 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs">
                Medical & Health
              </TabsTrigger>
              <TabsTrigger value="clinic" className="rounded-lg text-xs sm:text-sm font-semibold py-2 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs">
                Clinic Details
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="flex flex-col gap-6 mt-4">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                    <UserRound className="size-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Personal Details</h3>
                </div>
                <FieldGrid cols={4}>
                  {editing ? (
                    <Field label="Full Name">
                      <Input
                        value={form.fullName}
                        onChange={(e) => setField("fullName", e.target.value)}
                        required
                      />
                    </Field>
                  ) : (
                    <Field label="Full Name" value={patient.fullName} />
                  )}
                  <Field label="Gender">
                    {editing ? (
                      <Select
                        value={form.gender}
                        onValueChange={(v) => setField("gender", v ?? "")}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      orDash(patient.gender)
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
                      orDash(patient.dateOfBirth)
                    )}
                  </Field>
                  <Field label="Blood Group">
                    {editing ? (
                      <Select
                        value={form.bloodGroup}
                        onValueChange={(v) => setField("bloodGroup", v ?? "")}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select blood group" />
                        </SelectTrigger>
                        <SelectContent>
                          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                            <SelectItem key={bg} value={bg}>
                              {bg}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      orDash(patient.bloodGroup)
                    )}
                  </Field>
                </FieldGrid>
              </div>

              <Separator className="bg-purple-50" />

              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                    <Activity className="size-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Physical & ID Information</h3>
                </div>
                <FieldGrid cols={4}>
                  <Field label="Height">
                    {editing ? (
                      <Input
                        value={form.height}
                        onChange={(e) => setField("height", e.target.value)}
                        placeholder="e.g. 175 cm"
                      />
                    ) : (
                      orDash(patient.height)
                    )}
                  </Field>
                  <Field label="Weight">
                    {editing ? (
                      <Input
                        value={form.weight}
                        onChange={(e) => setField("weight", e.target.value)}
                        placeholder="e.g. 70 kg"
                      />
                    ) : (
                      orDash(patient.weight)
                    )}
                  </Field>
                  <Field label="Blood Pressure">
                    {editing ? (
                      <Input
                        value={form.bloodPressure}
                        onChange={(e) => setField("bloodPressure", e.target.value)}
                        placeholder="120/80 mmHg"
                      />
                    ) : (
                      orDash((patient as any).bloodPressure ? `${(patient as any).bloodPressure} mmHg` : null)
                    )}
                  </Field>
                  <Field label="Temperature">
                    {editing ? (
                      <Input
                        value={form.temperature}
                        onChange={(e) => setField("temperature", e.target.value)}
                        placeholder="98.6 °F"
                      />
                    ) : (
                      orDash((patient as any).temperature ? `${(patient as any).temperature}°` : null)
                    )}
                  </Field>
                  <Field label="Pulse">
                    {editing ? (
                      <Input
                        value={form.pulse}
                        onChange={(e) => setField("pulse", e.target.value)}
                        placeholder="72 bpm"
                      />
                    ) : (
                      orDash((patient as any).pulse ? `${(patient as any).pulse} bpm` : null)
                    )}
                  </Field>
                  <Field label="Respiratory Rate">
                    {editing ? (
                      <Input
                        value={form.respiratoryRate}
                        onChange={(e) => setField("respiratoryRate", e.target.value)}
                        placeholder="16 /min"
                      />
                    ) : (
                      orDash((patient as any).respiratoryRate ? `${(patient as any).respiratoryRate} /min` : null)
                    )}
                  </Field>
                  <Field label="SpO₂">
                    {editing ? (
                      <Input
                        value={form.spo2}
                        onChange={(e) => setField("spo2", e.target.value)}
                        placeholder="98 %"
                      />
                    ) : (
                      orDash((patient as any).spo2 ? `${(patient as any).spo2} %` : null)
                    )}
                  </Field>
                  <Field label="Marital Status">
                    {editing ? (
                      <Input
                        value={form.maritalStatus}
                        onChange={(e) => setField("maritalStatus", e.target.value)}
                        placeholder="Single / Married"
                      />
                    ) : (
                      orDash(patient.maritalStatus)
                    )}
                  </Field>
                  <Field label="Occupation">
                    {editing ? (
                      <Input
                        value={form.occupation}
                        onChange={(e) => setField("occupation", e.target.value)}
                        placeholder="e.g. Software Engineer"
                      />
                    ) : (
                      orDash(patient.occupation)
                    )}
                  </Field>
                  <Field label="ID Type">
                    {editing ? (
                      <Input
                        value={form.idType}
                        onChange={(e) => setField("idType", e.target.value)}
                        placeholder="Aadhaar / Passport"
                      />
                    ) : (
                      orDash(patient.idType)
                    )}
                  </Field>
                  <Field label="ID Number">
                    {editing ? (
                      <Input
                        value={form.idNumber}
                        onChange={(e) => setField("idNumber", e.target.value)}
                        placeholder="XXXX-XXXX-XXXX"
                      />
                    ) : (
                      orDash(patient.idNumber)
                    )}
                  </Field>
                </FieldGrid>
              </div>
            </TabsContent>

            {/* Contact & Address Tab */}
            <TabsContent value="contact" className="flex flex-col gap-6 mt-4">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                    <Phone className="size-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Contact Channels</h3>
                </div>
                <FieldGrid cols={3}>
                  <Field label="Mobile Number">
                    {editing ? (
                      <Input
                        value={form.mobile}
                        onChange={(e) => setField("mobile", e.target.value)}
                        required
                      />
                    ) : (
                      orDash(patient.mobile)
                    )}
                  </Field>
                  <Field label="WhatsApp Number">
                    {editing ? (
                      <Input
                        value={form.whatsapp}
                        onChange={(e) => setField("whatsapp", e.target.value)}
                      />
                    ) : (
                      orDash(patient.whatsapp)
                    )}
                  </Field>
                  <Field label="Email Address">
                    {editing ? (
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setField("email", e.target.value)}
                      />
                    ) : (
                      orDash(patient.email)
                    )}
                  </Field>
                </FieldGrid>
              </div>

              <Separator className="bg-purple-50" />

              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                    <MapPin className="size-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Address Details</h3>
                </div>
                <FieldGrid cols={4}>
                  <Field label="Street Address" className="col-span-2">
                    {editing ? (
                      <Input
                        value={form.address}
                        onChange={(e) => setField("address", e.target.value)}
                        placeholder="House no, Street name..."
                      />
                    ) : (
                      orDash(patient.address)
                    )}
                  </Field>
                  <Field label="City">
                    {editing ? (
                      <Input
                        value={form.city}
                        onChange={(e) => setField("city", e.target.value)}
                      />
                    ) : (
                      orDash(patient.city)
                    )}
                  </Field>
                  <Field label="State">
                    {editing ? (
                      <Input
                        value={form.state}
                        onChange={(e) => setField("state", e.target.value)}
                      />
                    ) : (
                      orDash(patient.state)
                    )}
                  </Field>
                  <Field label="Pincode">
                    {editing ? (
                      <Input
                        value={form.pincode}
                        onChange={(e) => setField("pincode", e.target.value)}
                      />
                    ) : (
                      orDash(patient.pincode)
                    )}
                  </Field>
                </FieldGrid>
              </div>

              <Separator className="bg-purple-50" />

              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                    <Info className="size-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Emergency Contact</h3>
                </div>
                <FieldGrid cols={3}>
                  <Field label="Contact Name">
                    {editing ? (
                      <Input
                        value={form.emergencyContactName}
                        onChange={(e) => setField("emergencyContactName", e.target.value)}
                      />
                    ) : (
                      orDash(patient.emergencyContactName)
                    )}
                  </Field>
                  <Field label="Relationship">
                    {editing ? (
                      <Input
                        value={form.emergencyContactRelationship}
                        onChange={(e) => setField("emergencyContactRelationship", e.target.value)}
                      />
                    ) : (
                      orDash(patient.emergencyContactRelationship)
                    )}
                  </Field>
                  <Field label="Emergency Mobile">
                    {editing ? (
                      <Input
                        value={form.emergencyContactMobile}
                        onChange={(e) => setField("emergencyContactMobile", e.target.value)}
                      />
                    ) : (
                      orDash(patient.emergencyContactMobile)
                    )}
                  </Field>
                </FieldGrid>
              </div>
            </TabsContent>

            {/* Medical & Health Tab */}
            <TabsContent value="medical" className="flex flex-col gap-6 mt-4">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                    <HeartPulse className="size-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Medical History</h3>
                </div>
                <FieldGrid cols={2}>
                  <Field label="Known Allergies" className="col-span-2">
                    {editing ? (
                      <Input
                        value={form.allergies}
                        onChange={(e) => setField("allergies", e.target.value)}
                        placeholder="Dust, Penicillin (comma separated)"
                      />
                    ) : (
                      orDash(form.allergies)
                    )}
                  </Field>
                  <Field label="Medical Conditions" className="col-span-2">
                    {editing ? (
                      <Textarea
                        value={form.medicalConditions}
                        onChange={(e) => setField("medicalConditions", e.target.value)}
                        rows={2}
                      />
                    ) : (
                      orDash(patient.medicalConditions)
                    )}
                  </Field>
                  <Field label="Current Medications" className="col-span-2">
                    {editing ? (
                      <Textarea
                        value={form.currentMedications}
                        onChange={(e) => setField("currentMedications", e.target.value)}
                        rows={2}
                      />
                    ) : (
                      orDash(patient.currentMedications)
                    )}
                  </Field>
                  <Field label="Previous Surgeries" className="col-span-2">
                    {editing ? (
                      <Textarea
                        value={form.previousSurgeries}
                        onChange={(e) => setField("previousSurgeries", e.target.value)}
                        rows={2}
                      />
                    ) : (
                      orDash(patient.previousSurgeries)
                    )}
                  </Field>
                </FieldGrid>
              </div>

              <Separator className="bg-purple-50" />

              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                    <ShieldCheck className="size-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Insurance Details</h3>
                </div>
                <FieldGrid cols={4}>
                  <Field label="Insurance Provider">
                    {editing ? (
                      <Input
                        value={form.insuranceProvider}
                        onChange={(e) => setField("insuranceProvider", e.target.value)}
                      />
                    ) : (
                      orDash(patient.insuranceProvider)
                    )}
                  </Field>
                  <Field label="Policy Number">
                    {editing ? (
                      <Input
                        value={form.insurancePolicyNumber}
                        onChange={(e) => setField("insurancePolicyNumber", e.target.value)}
                      />
                    ) : (
                      orDash(patient.insurancePolicyNumber)
                    )}
                  </Field>
                  <Field label="Policy Holder Name">
                    {editing ? (
                      <Input
                        value={form.insurancePolicyHolderName}
                        onChange={(e) => setField("insurancePolicyHolderName", e.target.value)}
                      />
                    ) : (
                      orDash(patient.insurancePolicyHolderName)
                    )}
                  </Field>
                  <Field label="Valid Till">
                    {editing ? (
                      <Input
                        type="date"
                        value={form.insuranceValidTill}
                        onChange={(e) => setField("insuranceValidTill", e.target.value)}
                      />
                    ) : (
                      orDash(patient.insuranceValidTill)
                    )}
                  </Field>
                </FieldGrid>
              </div>
            </TabsContent>

            {/* Clinic Details Tab */}
            <TabsContent value="clinic" className="flex flex-col gap-6 mt-4">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                    <Building2 className="size-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Clinic Overview</h3>
                </div>
                <FieldGrid cols={4}>
                  <Field label="Clinic Name" value={clinic?.name || "Meenu Care"} />
                  <Field label="Clinic Type" value={orDash(clinic?.profile?.clinicType || "General Healthcare / Polyclinic")} />
                  <Field label="Registration Number" value={orDash(clinic?.profile?.registrationNumber)} />
                  <Field label="Established Year" value={orDash(clinic?.profile?.establishedYear)} />
                </FieldGrid>
              </div>

              <Separator className="bg-purple-50" />

              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                    <Phone className="size-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Clinic Contact & Location</h3>
                </div>
                <FieldGrid cols={4}>
                  <Field label="Clinic Phone" value={orDash(clinic?.phone)} />
                  <Field label="WhatsApp Support" value={orDash(clinic?.profile?.whatsapp)} />
                  <Field label="Clinic Email" value={orDash(clinic?.email)} />
                  <Field
                    label="Website"
                    value={
                      clinic?.website ? (
                        <a href={clinic.website} target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold hover:underline">
                          {clinic.website}
                        </a>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <Field
                    label="Clinic Address"
                    className="col-span-2"
                    value={
                      [
                        clinic?.profile?.addressLine1,
                        clinic?.profile?.addressLine2,
                        clinic?.profile?.city,
                        clinic?.profile?.state,
                        clinic?.profile?.pincode,
                      ]
                        .filter(Boolean)
                        .join(", ") || "—"
                    }
                  />
                  <Field
                    label="Working Hours"
                    value={
                      clinic?.settings?.workingHours
                        ? `${clinic.settings.workingHours.open} - ${clinic.settings.workingHours.close}`
                        : "09:00 AM - 06:00 PM"
                    }
                  />
                  <Field label="Emergency Contact" value={orDash(clinic?.profile?.emergencyContact)} />
                </FieldGrid>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}