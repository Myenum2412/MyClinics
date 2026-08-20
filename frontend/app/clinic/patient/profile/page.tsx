"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  getMyPatient,
  listDoctors,
  type Patient,
} from "@/lib/clinic-api";
import { PatientForm, type PatientFormState } from "@/components/clinic/patient-form";
import { PersonAvatar } from "@/components/clinic/person-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, CalendarDays, Phone, Mail, UserRound } from "lucide-react";

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

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="sticky top-0 z-10 border-b border-blue-200 bg-white">
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
        <UserRound className="size-12 text-slate-300" />
        <p className="text-sm text-slate-500">We couldn&apos;t find your patient profile.</p>
        <p className="text-xs text-slate-400">Please contact your clinic for assistance.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 border-b border-blue-200 bg-white">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-start gap-4">
            <button
              onClick={() => router.push("/clinic/patient")}
              className="mt-1 inline-flex items-center justify-center rounded-lg p-2 hover:bg-blue-100"
            >
              <ChevronLeft size={20} className="text-blue-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
              <p className="mt-1 text-sm text-gray-600">
                Your personal and medical details as registered with the clinic.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-8 sm:px-6 lg:px-8">
        {/* Profile summary card */}
        <div className="mb-8 overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-b from-blue-50/50 to-white">
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
                <h2 className="text-xl font-bold text-gray-900">{patient.fullName}</h2>
                <Badge
                  variant="outline"
                  className="border-green-200 bg-green-50 text-green-700"
                >
                  Active
                </Badge>
              </div>
              <p className="mt-1 font-mono text-xs text-gray-500">ID: {patient.patientId}</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600">
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5 text-blue-600" />
                  {patient.mobile || "—"}
                </span>
                {patient.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="size-3.5 text-blue-600" />
                    {patient.email}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-blue-600" />
                  Member since {memberSince(patient.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Reuse the New Patient form in view mode */}
        <PatientForm
          clinicId={session?.clinicId ?? ""}
          initialData={patientToForm(patient)}
          mode="view"
          doctors={doctors}
          onClose={() => router.push("/clinic/patient")}
        />
      </div>
    </div>
  );
}