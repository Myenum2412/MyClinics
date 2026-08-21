"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDaysIcon, FolderOpenIcon } from "@heroicons/react/24/outline";

import { type ClinicSession, type Appointment, listAppointments, type Patient, getMyPatient } from "@/lib/clinic-api";
import { formatDate, formatTime } from "@/lib/format-time";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PatientDashboard({ session }: { session: ClinicSession }) {
  const clinicId = session.clinicId ?? "";
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);

  useEffect(() => {
    if (!clinicId) return;
    let active = true;
    setLoading(true);

    Promise.allSettled([
      listAppointments(clinicId, { limit: 10, patientId: session.patientId ?? undefined }),
      getMyPatient(clinicId),
    ]).then(([apptRes, patRes]) => {
      if (!active) return;
      if (apptRes.status === "fulfilled") setAppointments(apptRes.value.items);
      if (patRes.status === "fulfilled") setPatient(patRes.value);
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [clinicId, session.patientId]);

  const upcomingAppointments = appointments.filter(a => a.status === "scheduled");

  return (
    <div className="w-full space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="overflow-hidden border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border bg-muted/20 px-6 py-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                My Upcoming Appointments
              </CardTitle>
            </div>
            <CalendarDaysIcon className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground text-center">
                You have no upcoming appointments.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {upcomingAppointments.slice(0, 3).map((appt) => (
                  <div key={appt.appointmentId} className="flex items-center justify-between p-6">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{formatDate(appt.date)}</span>
                      <span className="text-sm text-muted-foreground">{formatTime(appt.time)}</span>
                    </div>
                    <span className="text-sm text-primary bg-primary/10 px-2.5 py-1 rounded-full font-medium">
                      {appt.reason || "Visit"}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="border-t border-border bg-muted/10 p-4">
              <Link href="/clinic/appointments" className="text-sm text-primary hover:underline font-medium">
                View all appointments &rarr;
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border bg-muted/20 px-6 py-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                My Profile
              </CardTitle>
            </div>
            <FolderOpenIcon className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-6">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : patient ? (
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">Name</div>
                  <div className="font-medium">{patient.fullName}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Mobile</div>
                  <div className="font-medium">{patient.mobile}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Blood Group</div>
                  <div className="font-medium">{patient.bloodGroup || "Not specified"}</div>
                </div>
              </div>
            ) : (
               <p className="text-sm text-muted-foreground">Profile not found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
