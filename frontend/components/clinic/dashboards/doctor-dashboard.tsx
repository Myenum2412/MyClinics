"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";

import {
  type Appointment,
  type Bill,
  type Patient,
  type Doctor,
  type Prescription,
  getDashboard,
  listAppointments,
  listBills,
  listDoctors,
  listPatients,
  listPrescriptions,
  createPatient,
  uploadAvatar,
} from "@/lib/clinic-api";
import {
  KOLKATA_TZ,
  now,
  toLocalDateISO,
  parseLocalDate,
  formatDate,
} from "@/lib/datetime";
import { MetricStatGrid } from "@/components/metric-stat-cards";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PatientForm,
  EMPTY_FORM,
  type PatientFormState,
} from "@/components/clinic/patient-form";
import { PersonAvatar } from "@/components/clinic/person-avatar";
import {
  Folder,
  ArrowRight,
  Users,
  FileText,
  Plus,
  CalendarDays,
  IndianRupee,
  Stethoscope,
  Eye,
} from "lucide-react";

import { type ClinicSession } from "@/lib/clinic-api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO(): string {
  return toLocalDateISO(now());
}

function formatApptDate(dateStr: string, timeStr?: string): string {
  try {
    const d = parseLocalDate(dateStr);
    const dateFormatted = formatDate(d);
    return timeStr ? `${dateFormatted} · ${timeStr}` : dateFormatted;
  } catch {
    return timeStr ? `${dateStr} · ${timeStr}` : dateStr;
  }
}

interface Greeting {
  text: string;
  emoji: string;
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
  bgImage: string;
}

function getGreeting(): Greeting {
  const h = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: KOLKATA_TZ })
      .formatToParts(now())
      .find((p) => p.type === "hour")?.value ?? "0"
  ) % 24;
  if (h >= 5 && h < 12) {
    return {
      text: "Good Morning",
      emoji: "🌅",
      gradientFrom: "from-amber-500/15",
      gradientTo: "to-orange-400/5",
      accentColor: "text-amber-600 dark:text-amber-400",
      bgImage: "/goodmorning.png",
    };
  }
  if (h >= 12 && h < 17) {
    return {
      text: "Good Afternoon",
      emoji: "☀️",
      gradientFrom: "from-sky-500/15",
      gradientTo: "to-blue-400/5",
      accentColor: "text-sky-600 dark:text-sky-400",
      bgImage: "/GoodAfterNoon.png",
    };
  }
  if (h >= 17 && h < 21) {
    return {
      text: "Good Evening",
      emoji: "🌙",
      gradientFrom: "from-violet-500/15",
      gradientTo: "to-purple-400/5",
      accentColor: "text-violet-600 dark:text-violet-400",
      bgImage: "/GoodAfterNoon.png",
    };
  }
  return {
    text: "Good Night",
    emoji: "🌙",
    gradientFrom: "from-indigo-500/15",
    gradientTo: "to-blue-900/5",
    accentColor: "text-indigo-600 dark:text-indigo-400",
    bgImage: "/GoodNight.png",
  };
}

// ── Greeting Banner ───────────────────────────────────────────────────────────

function GreetingBanner({
  doctorName,
}: {
  doctorName: string;
}) {
  const greeting = useMemo(() => getGreeting(), []);

  // Friendly first name — strip "Dr." prefix if present
  const firstName = doctorName.replace(/^dr\.?\s*/i, "").split(" ")[0];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${greeting.gradientFrom} ${greeting.gradientTo} px-4 py-5 shadow-sm sm:px-6 sm:py-7`}
    >
      {/* Time-of-day Background Image - Fixed to card with increased brightness */}
      <div className="pointer-events-none absolute inset-0 select-none overflow-hidden rounded-2xl">
        <Image
          src={greeting.bgImage}
          alt={greeting.text}
          fill
          sizes="(max-width: 1200px) 100vw, 1200px"
          className="object-cover object-center opacity-85 brightness-110 dark:opacity-75 dark:brightness-105 transition-all duration-300"
          priority
        />
        {/* Soft gradient overlay for crisp text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/40 to-transparent dark:from-background/90 dark:via-background/55 dark:to-background/20" />
      </div>

      {/* Decorative blurred circles */}
      <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-white/5 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-8 -left-8 size-32 rounded-full bg-white/5 blur-2xl" />

      <div className="relative z-10 flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: greeting text */}
        <div className="rounded-xl bg-background/30 p-2.5 backdrop-blur-[2px] sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <p className={`text-xs font-bold uppercase tracking-widest sm:text-sm ${greeting.accentColor}`}>
            {greeting.emoji}&nbsp;&nbsp;{greeting.text}
          </p>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
            Dr. {firstName}
          </h1>
          <p className="mt-1 text-xs font-medium text-foreground/80 sm:text-sm">
            {new Intl.DateTimeFormat("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: KOLKATA_TZ,
            }).format(now())}
          </p>
        </div>

        {/* Right: Quick Fill + Medical Record */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
          <Link href="/clinic/quick-add" className="flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 sm:w-auto">
            <Plus className="size-4" /> Quick Fill
          </Link>
          <Link
            href="/clinic/medical-record"
            className="group flex w-full items-center justify-center gap-3 rounded-xl border border-border/80 bg-background/80 px-4 py-3 shadow-md backdrop-blur-md transition-all duration-200 hover:border-primary/40 hover:bg-background hover:shadow-lg active:scale-[0.97] sm:w-fit sm:justify-start sm:px-5 sm:py-4"
            title="Open medical records"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-100">
              <Folder className="size-5 text-indigo-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-foreground">Medical Record</p>
              <p className="text-xs text-muted-foreground">View patient files</p>
            </div>
            <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export function DoctorDashboard({ session }: { session: ClinicSession }) {
  const clinicId = session.clinicId ?? "";
  const isDoctorRole = session.role === "doctor";

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [counts, setCounts] = useState<{ appointments: number; patients: number; doctors: number; prescriptions: number; revenue: number; paidRevenue: number } | null>(null);

  const [createPatientOpen, setCreatePatientOpen] = useState(false);
  const [savingPatient, setSavingPatient] = useState(false);

  useEffect(() => {
    if (!clinicId) return;
    let active = true;
    setLoading(true);
    async function load() {
      try {
        const data = await getDashboard(clinicId);
        if (!active) return;
        setAppointments((data.appointments as Appointment[]) ?? []);
        setPatients((data.patients as Patient[]) ?? []);
        setDoctors((data.doctors as unknown as Doctor[]) ?? []);
        setCounts(data.counts);
        setPrescriptions(Array(data.counts.prescriptions).fill(null as any));
        setBills((data.bills as Bill[]) ?? []);
      } catch (e: any) {
        const is404 = e?.status === 404;
        if (!is404) { toast.error("Failed to load dashboard"); }
        try {
          const promises: Promise<any>[] = [
            listAppointments(clinicId, { limit: 50 }),
            listPatients(clinicId, { limit: 50 }),
            listDoctors(clinicId, { limit: 50 }),
            listPrescriptions(clinicId, { limit: 50 }),
            listBills(clinicId, { limit: 50 }),
          ];
          const [apptRes, patientRes, doctorRes, rxRes, billRes] = await Promise.allSettled(promises);
          if (!active) return;
          if (apptRes.status === "fulfilled") setAppointments((apptRes.value as any)?.items ?? []);
          if (patientRes.status === "fulfilled") setPatients((patientRes.value as any)?.items ?? []);
          if (doctorRes.status === "fulfilled") setDoctors((doctorRes.value as any)?.items ?? []);
          if (rxRes && rxRes.status === "fulfilled") setPrescriptions((rxRes.value as any)?.items ?? []);
          if (billRes && (billRes as any).status === "fulfilled") setBills(((billRes as any).value as any)?.items ?? []);
          setCounts(null);
        } catch {}
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [clinicId, isDoctorRole]);

  // Stats section cards
  const totalRevenue = counts ? counts.revenue : (bills ?? []).reduce((s, b) => (b.status !== "void" ? s + (b.total ?? 0) : s), 0);
  const apptCount = counts ? counts.appointments : appointments.length;
  const patientCount = counts ? counts.patients : patients.length;
  const doctorCount = counts ? counts.doctors : doctors.length;
  const rxCount = counts ? counts.prescriptions : prescriptions.length;
  const paidRevenue =
    counts?.paidRevenue ??
    (bills ?? []).filter((b) => b.status === "paid").reduce((s, b) => s + (b.total ?? 0), 0);
  const revenuePct = totalRevenue
    ? Math.min(100, Math.round((paidRevenue / Math.max(1, totalRevenue)) * 100))
    : 0;

  const iconCls = "size-4";
  const statsItems = isDoctorRole
    ? [
        {
          name: "My Patients",
          value: patientCount,
          detail: `${patientCount} of 100 assigned`,
          percentage: Math.min(100, Math.round((patientCount / 100) * 100)),
          accent: "var(--chart-1)",
          icon: <Users className={iconCls} />,
        },
        {
          name: "Appointments",
          value: apptCount,
          detail: `${apptCount} of 50 assigned`,
          percentage: Math.min(100, Math.round((apptCount / 50) * 100)),
          accent: "var(--chart-2)",
          icon: <CalendarDays className={iconCls} />,
        },
        {
          name: "Prescriptions",
          value: rxCount,
          detail: `${rxCount} of 100 assigned`,
          percentage: Math.min(100, Math.round((rxCount / 100) * 100)),
          accent: "var(--chart-3)",
          icon: <FileText className={iconCls} />,
        },
        {
          name: "Doctors Roster",
          value: doctorCount,
          detail: `${doctorCount} of 10 assigned`,
          percentage: Math.min(100, Math.round((doctorCount / 10) * 100)),
          accent: "var(--chart-4)",
          icon: <Stethoscope className={iconCls} />,
        },
      ]
    : [
        {
          name: "Patients",
          value: patientCount,
          detail: `${patientCount} of 100 used`,
          percentage: Math.min(100, Math.round((patientCount / 100) * 100)),
          accent: "var(--chart-1)",
          icon: <Users className={iconCls} />,
        },
        {
          name: "Appointments",
          value: apptCount,
          detail: `${apptCount} of 50 used`,
          percentage: Math.min(100, Math.round((apptCount / 50) * 100)),
          accent: "var(--chart-2)",
          icon: <CalendarDays className={iconCls} />,
        },
        {
          name: "Revenue",
          value: `₹${totalRevenue.toLocaleString("en-IN")}`,
          detail: `₹${paidRevenue.toLocaleString("en-IN")} collected`,
          percentage: revenuePct,
          accent: "var(--chart-3)",
          icon: <IndianRupee className={iconCls} />,
        },
        {
          name: "Doctors",
          value: doctorCount,
          detail: `${doctorCount} of 10 used`,
          percentage: Math.min(100, Math.round((doctorCount / 10) * 100)),
          accent: "var(--chart-4)",
          icon: <Stethoscope className={iconCls} />,
        },
      ];

  const patientMap = useMemo(() => {
    return new Map(patients.map((p) => [p.patientId, p.fullName]));
  }, [patients]);

  const today = useMemo(() => todayISO(), []);

  // Filter: strictly upcoming dates only (today onwards), sorted chronologically
  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter(
        (a) => a.status !== "cancelled" && a.status !== "no_show" && a.date >= today
      )
      .sort((a, b) =>
        a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)
      );
  }, [appointments, today]);

  const handleSavePatient = async (form: PatientFormState) => {
    setSavingPatient(true);
    try {
      const payload: Record<string, unknown> = {
        fullName: form.fullName.trim(),
        mobile: form.mobile.replace(/\D/g, ""),
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        gender: form.gender.toLowerCase() || null,
        dateOfBirth: form.dateOfBirth || null,
        bloodGroup: form.bloodGroup || null,
        height: form.height.trim() || null,
        weight: form.weight.trim() || null,
        bloodPressure: form.bloodPressure.trim() || null,
        temperature: form.temperature.trim() || null,
        pulse: form.pulse.trim() || null,
        respiratoryRate: form.respiratoryRate.trim() || null,
        spo2: form.spo2.trim() || null,
        occupation: form.occupation.trim() || null,
        maritalStatus: form.maritalStatus || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        pincode: form.pincode.trim() || null,
        emergencyContactName: form.emergencyContactName.trim() || null,
        emergencyContactRelationship: form.emergencyContactRelationship.trim() || null,
        emergencyContactMobile: form.emergencyContactMobile.trim() || null,
        allergies: form.allergies
          ? form.allergies.split(",").map((a) => a.trim()).filter(Boolean)
          : [],
        medicalConditions: form.medicalConditions?.trim() || null,
        previousSurgeries: form.previousSurgeries?.trim() || null,
        currentMedications: form.currentMedications?.trim() || null,
        familyHistory: form.familyHistory?.trim() || null,
        patientHistory: form.patientHistory?.trim() || null,
        habits: form.habits?.trim() || null,
        idType: form.idType || null,
        idNumber: form.idNumber?.trim() || null,
        insuranceProvider: form.insuranceProvider?.trim() || null,
        insurancePolicyNumber: form.insurancePolicyNumber?.trim() || null,
        insurancePolicyHolderName: form.insurancePolicyHolderName?.trim() || null,
        insuranceValidTill: form.insuranceValidTill || null,
        referredBy: form.referredBy?.trim() || null,
        howDidYouHear: form.howDidYouHear || null,
        notes: form.notes?.trim() || null,
        portalAccess: form.portalAccess,
        loginNotification: form.loginNotification,
        doctorId: form.doctorId || null,
        skipNotification: true,
      };

      if (form.portalAccess === "enable" && form.password) {
        payload.password = form.password;
      }

      const created = await createPatient(clinicId, payload);

      if (form.profileImage) {
        try {
          await uploadAvatar(clinicId, "patient", created.patientId, form.profileImage);
        } catch {
          // Non-critical avatar upload error ignored
        }
      }

      toast.success(`Patient "${created.fullName}" registered successfully`);
      setCreatePatientOpen(false);

      const res = await listPatients(clinicId, { limit: 20 });
      if (res?.items) {
        setPatients(res.items);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to create patient");
    } finally {
      setSavingPatient(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 sm:gap-6">
      {/* Greeting banner */}
      <GreetingBanner doctorName={session.name ?? "Doctor"} />

      {/* Stats section cards */}
      <MetricStatGrid items={statsItems} />

      {/* 1 row: Left side (Upcoming Appointments table) and Right side (Patients card with Create Patient) */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Left Side: Upcoming Appointments Table (Date and Patient Name only, without round border) */}
        <Card className="rounded-none border border-border shadow-sm flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center justify-between border-b border-border bg-muted/20 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <CalendarDays className="size-4 text-primary" />
                  Upcoming Appointments
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Appointments scheduled at this clinic.
                </p>
              </div>
              <Link href="/clinic/appointments">
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
                  View all <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            </div>

            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-6">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : upcomingAppointments.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No upcoming appointments scheduled.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
                        <TableHead className="font-semibold text-foreground">Date</TableHead>
                        <TableHead className="font-semibold text-foreground">Patient Name</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingAppointments.slice(0, 8).map((appt) => {
                        const patientName =
                          patientMap.get(appt.patientId) ??
                          (appt as any).patientName ??
                          "Patient";
                        const isToday = appt.date === today;
                        return (
                          <TableRow
                            key={appt.appointmentId}
                            className={`transition-colors ${
                              isToday
                                ? "bg-amber-500/10 hover:bg-amber-500/15 dark:bg-amber-500/20 dark:hover:bg-amber-500/25 border-l-4 border-l-amber-500 font-semibold"
                                : "hover:bg-muted/30"
                            }`}
                          >
                            <TableCell className="text-xs font-medium text-foreground py-3.5">
                              <div className="flex items-center gap-2">
                                <span>{formatApptDate(appt.date, appt.time)}</span>
                                {isToday && (
                                  <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                    Today
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-foreground py-3.5">
                              {patientName}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </div>
        </Card>

        {/* Right Side: Patients Card with Create Patient form trigger (without round border) */}
        <Card className="rounded-none border border-border shadow-sm flex flex-col justify-between overflow-hidden">
          <div>
            <div className="flex items-center justify-between border-b border-border bg-muted/20 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  Patients
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Patients registered at this clinic.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 shadow-sm"
                  onClick={() => setCreatePatientOpen(true)}
                >
                  <Plus className="size-3.5" />
                  Create Patient
                </Button>
                <Link href="/clinic/patients">
                  <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
                    View all <ArrowRight className="size-3.5" />
                  </Button>
                </Link>
              </div>
            </div>

            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-6">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : patients.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No patients registered yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
                        <TableHead className="font-semibold text-foreground">Name</TableHead>
                        <TableHead className="font-semibold text-foreground">Phone</TableHead>
                        <TableHead className="font-semibold text-foreground">Status</TableHead>
                        <TableHead className="text-right font-semibold text-foreground">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {patients.slice(0, 6).map((p) => (
                        <TableRow key={p.patientId} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2.5">
                              <PersonAvatar
                                clinicId={clinicId}
                                ownerType="patient"
                                ownerId={p.patientId}
                                name={p.fullName}
                                className="size-7 text-[10px]"
                              />
                              <span className="text-xs font-semibold text-foreground truncate max-w-[140px]">
                                {p.fullName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground py-3">
                            {p.mobile || "—"}
                          </TableCell>
                          <TableCell className="py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {p.status || "active"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-3">
                            <Link href={`/clinic/records?patientId=${p.patientId}`}>
                              <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1">
                                <Eye className="size-3" /> EHR File
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      </div>

      {/* Create Patient Dialog Form */}
      <Dialog open={createPatientOpen} onOpenChange={setCreatePatientOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-3 border-b">
            <DialogTitle className="text-lg font-bold">New Patient Registration</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Fill out patient details to register a new patient to this clinic.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <PatientForm
              clinicId={clinicId}
              initialData={EMPTY_FORM}
              mode="create"
              onSave={handleSavePatient}
              onClose={() => setCreatePatientOpen(false)}
              saving={savingPatient}
              doctors={doctors}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
