"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  getMyPatient,
  listDoctors,
  updatePatient,
  type Patient,
} from "@/lib/clinic-api";
import { PatientForm, type PatientFormState } from "@/components/clinic/patient-form";
import { PersonAvatar } from "@/components/clinic/person-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, CalendarDays, Phone, Mail, UserRound } from "lucide-react";
import { toast } from "sonner";

function patientToForm(p: Patient): PatientFormState {
  return {
    fullName: p.fullName,
    mobile: p.mobile,
    whatsapp: p.whatsapp ?? "",
    email: p.email ?? "",
    gender: p.gender ?? "",
    dateOfBirth: p.dateOfBirth ?? "",
    bloodGroup: p.bloodGroup ?? "",
    height: p.height ?? "",
    weight: p.weight ?? "",
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
    referredBy: p.referredBy ?? "",
    howDidYouHear: p.howDidYouHear ?? "",
    notes: p.notes ?? "",
    doctorId: p.doctorId,
    password: "",
    confirmPassword: "",
    portalAccess: "disable",
    loginNotification: "none",
    attachments: [],
    patientId: p.patientId,
    profileImage: null,
  };
}

function memberSince(createdAt: string | undefined): string {
  if (!createdAt) return "—";
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export default function PatientProfilePage() {
  const session = useRequireRole("patient");
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [doctors, setDoctors] = useState<{ doctorId: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!session?.clinicId) return;
    try {
      const [me, docsRes] = await Promise.all([
        getMyPatient(session.clinicId),
        listDoctors(session.clinicId, { status: "active", limit: 100 }),
      ]);
      setPatient(me);
      setDoctors(docsRes.items.map((d) => ({ doctorId: d.doctorId, name: d.name })));
    } catch {
      // leave empty state visible
    } finally {
      setLoading(false);
    }
  }, [session?.clinicId]);

  useEffect(() => {
    if (!session?.clinicId) return;
    load();
  }, [session?.clinicId, load]);

  async function handleSave(form: PatientFormState) {
    if (!session?.clinicId || !patient) return;
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
        referredBy: form.referredBy || null,
        howDidYouHear: form.howDidYouHear || null,
        notes: form.notes || null,
      };
      if (form.password) {
        payload.password = form.password;
      }
      
      const updated = await updatePatient(session.clinicId, patient.patientId, payload);
      setPatient(updated);
      setMode("view");
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 border-b border-border bg-background">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
        </div>
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="mt-6 h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <UserRound className="size-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">We couldn&apos;t find your patient profile.</p>
        <p className="text-xs text-muted-foreground">Please contact your clinic for assistance.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-start gap-4">
            <button
              onClick={() => {
                if (mode === "edit") {
                  setMode("view");
                } else {
                  router.push("/clinic/patient");
                }
              }}
              className="mt-1 inline-flex items-center justify-center rounded-lg p-2 hover:bg-muted"
            >
              <ChevronLeft size={20} className="text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Your personal and medical details as registered with the clinic.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-8 sm:px-6 lg:px-8">
        {/* Profile summary card */}
        <div className="mb-8 overflow-hidden rounded-xl border border-border bg-gradient-to-b from-muted/50 to-background">
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center md:p-8">
            <PersonAvatar
              clinicId={session?.clinicId ?? ""}
              ownerType="patient"
              ownerId={patient.patientId}
              name={patient.fullName}
              size="md"
              className="size-20 rounded-full ring-4 ring-white shadow-sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{patient.fullName}</h2>
                <Badge
                  variant="outline"
                  className="border-success/25 bg-success/10 text-success"
                >
                  Active
                </Badge>
              </div>
              <p className="mt-1 font-mono text-xs text-muted-foreground">ID: {patient.patientId}</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5 text-muted-foreground" />
                  {patient.mobile || "—"}
                </span>
                {patient.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="size-3.5 text-muted-foreground" />
                    {patient.email}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-muted-foreground" />
                  Member since {memberSince(patient.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Reuse the Patient form in view/edit mode */}
        <PatientForm
          clinicId={session?.clinicId ?? ""}
          initialData={patientToForm(patient)}
          mode={mode}
          doctors={doctors}
          onClose={() => {
            if (mode === "edit") {
              setMode("view");
            } else {
              router.push("/clinic/patient");
            }
          }}
          onEdit={() => setMode("edit")}
          onSave={handleSave}
          saving={saving}
        />
      </div>
    </div>
  );
}