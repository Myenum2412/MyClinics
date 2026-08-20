"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  bookAppointment,
  getMyPatient,
  listDoctors,
  myAppointments,
  type Doctor,
  type Patient,
} from "@/lib/clinic-api";
import {
  AppointmentForm,
  buildNotes,
  emptyAppointmentForm,
  type AppointmentFormState,
} from "@/components/clinic/appointment-form";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, CalendarPlus } from "lucide-react";

export default function BookAppointmentPage() {
  const session = useRequireRole("patient");
  const router = useRouter();
  const clinicId = session?.clinicId ?? "";
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<
    Awaited<ReturnType<typeof myAppointments>>["items"]
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!clinicId) return;
    try {
      const [patient, docsRes, apptRes] = await Promise.all([
        getMyPatient(clinicId),
        listDoctors(clinicId, { status: "active", limit: 100 }),
        myAppointments(clinicId, { limit: 100 }),
      ]);
      if (patient) {
        setPatients([patient]);
      }
      setDoctors(docsRes.items);
      setAppointments(apptRes.items);
    } catch {
      toast.error("Failed to load booking details");
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(form: AppointmentFormState) {
    if (!clinicId) return;
    setSaving(true);
    try {
      await bookAppointment(clinicId, {
        doctorId: form.doctorId,
        date: form.date,
        time: form.time,
        reason: form.reason || null,
        notes: buildNotes(form),
      });
      toast.success("Appointment booked. WhatsApp alerts queued!");
      router.push("/clinic/patient/appointments");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to book appointment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 border-b border-blue-200 bg-white">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-start gap-4">
            <button
              onClick={() => router.back()}
              className="mt-1 inline-flex items-center justify-center rounded-lg p-2 hover:bg-blue-100"
            >
              <ChevronLeft size={20} className="text-blue-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Book Appointment</h1>
              <p className="mt-1 text-sm text-gray-600">
                Schedule your visit. Automated WhatsApp alerts will be instantly queued for you and the doctor.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : patients.length === 0 ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-12 text-center">
            <CalendarPlus className="mx-auto mb-4 size-12 text-blue-300" />
            <h3 className="text-lg font-medium text-gray-900">Patient profile not found</h3>
            <p className="mt-2 text-sm text-gray-600">
              We couldn&apos;t find your patient profile. Please contact the clinic.
            </p>
          </div>
        ) : (
          <AppointmentForm
            clinicId={clinicId}
            appointments={appointments}
            patients={patients}
            doctors={doctors}
            initial={{
              ...emptyAppointmentForm(),
              patientId: patients[0].patientId,
            }}
            onSave={handleSave}
            saving={saving}
            lockPatient
          />
        )}

        <div className="mt-6">
          <Button variant="outline" onClick={() => router.back()} className="gap-1.5">
            <ChevronLeft className="size-4" />
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}