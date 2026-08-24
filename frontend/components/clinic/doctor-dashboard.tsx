"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  type Appointment,
  type Patient,
  type Prescription,
  listAppointments,
  listPatients,
  listPrescriptions,
} from "@/lib/clinic-api";
import { formatTime } from "@/lib/format-time";
import { PersonAvatar } from "@/components/clinic/person-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Calendar, ClipboardList, Stethoscope, Users } from "lucide-react";
import StatsGeneric from "@/components/stats-generic";
import StatsAppointments from "@/components/stats-appointments";
import { appointmentStatusTone } from "@/lib/status-styles";

function today(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function ApptStatus({ status }: { status: string }) {
  return (
    <Badge className={appointmentStatusTone(status)}>
      {status.replace("_", " ")}
    </Badge>
  );
}

/**
 * Doctor dashboard — every fetch is scoped server-side to the signed-in
 * doctor (PatientRepository / AppointmentRepository / PrescriptionRepository
 * inject `doctorId: ctx.doctorId` for the `doctor` role), so this view only
 * ever shows the doctor's OWN patients, appointments and prescriptions.
 */
export function DoctorDashboard({ clinicId }: { clinicId: string }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!clinicId) return;
    return Promise.all([
      listPatients(clinicId, { limit: 50 }),
      listAppointments(clinicId, { date: today(), limit: 100 }),
      listPrescriptions(clinicId, { limit: 100 }),
      listAppointments(clinicId, { limit: 50 }),
    ])
      .then(([p, a, pr, allA]) => {
        setPatients(p.items);
        setAppointments(a.items);
        setPrescriptions(pr.items);
        setAllAppointments(allA.items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  const patientLookup = useMemo(() => {
    const map: Record<string, string> = {};
    patients.forEach((p) => {
      map[p.patientId] = p.fullName;
    });
    return map;
  }, [patients]);

  const stats = useMemo(() => {
    const totalPatients = patients.length;
    const totalApptsToday = appointments.length;
    const totalPrescriptions = prescriptions.length;

    return [
      {
        name: "My Patients",
        percentage: Math.min(100, Math.round((totalPatients / 200) * 100)),
        current: totalPatients,
        allowed: 200,
        allowedLabel: "assigned to me",
        fill: "var(--chart-1)",
      },
      {
        name: "Appointments Today",
        percentage: Math.min(100, Math.round((totalApptsToday / 30) * 100)),
        current: totalApptsToday,
        allowed: 30,
        allowedLabel: "capacity",
        fill: "var(--chart-2)",
      },
      {
        name: "Prescriptions Written",
        percentage: Math.min(100, Math.round((totalPrescriptions / 200) * 100)),
        current: totalPrescriptions,
        allowed: 200,
        allowedLabel: "issued",
        fill: "var(--chart-3)",
      },
    ];
  }, [patients, appointments, prescriptions]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Doctor header card */}
      <Card className="border-border bg-gradient-to-r from-primary/10 to-primary/5 shadow-sm">
        <CardHeader className="p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-primary p-3 text-primary-foreground">
              <Stethoscope className="size-6" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                Doctor Dashboard
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Welcome back — here is your schedule, your patients, and your prescriptions.
                You can only see data for patients assigned to you.
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <StatsGeneric
          title="My Overview"
          description="Real-time analytics scoped to your own patients, appointments, and prescriptions."
          items={stats}
        />
      </div>

      {/* Appointment Analytics Stats Card */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <StatsAppointments appointments={allAppointments} />
      </div>

      {/* Today's appointments */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          {appointments.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No appointments scheduled for you today.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead>Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((a) => (
                  <TableRow
                    key={a.appointmentId}
                    className="hover:bg-muted/30 border-b border-border last:border-0"
                  >
                    <TableCell className="font-medium text-foreground">
                      {formatTime(a.time)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <PersonAvatar clinicId={clinicId} ownerType="patient" ownerId={a.patientId} name={patientLookup[a.patientId] ?? a.patientId} />
                        <span>{patientLookup[a.patientId] ?? a.patientId}</span>
                      </div>
                    </TableCell>
                    <TableCell>{a.reason ?? "—"}</TableCell>
                    <TableCell>
                      <ApptStatus status={a.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* My patients */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          {patients.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No patients are assigned to you yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.slice(0, 10).map((p) => (
                  <TableRow
                    key={p.patientId}
                    className="hover:bg-muted/30 border-b border-border last:border-0"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <PersonAvatar clinicId={clinicId} ownerType="patient" ownerId={p.patientId} name={p.fullName} />
                        <span className="font-medium text-foreground">{p.fullName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.mobile}</TableCell>
                    <TableCell className="text-muted-foreground">{p.email ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          p.status === "active"
                            ? "bg-success/10 text-success hover:bg-success/10 border-success/25"
                            : "bg-muted text-muted-foreground hover:bg-muted border-border"
                        }
                        variant="outline"
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent prescriptions */}
      {prescriptions.length > 0 && (
        <Card className="border-border shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead>Medicines</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.slice(0, 5).map((pr) => (
                  <TableRow
                    key={pr.prescriptionId}
                    className="hover:bg-muted/30 border-b border-border last:border-0"
                  >
                    <TableCell className="font-medium text-foreground">{pr.visitDate}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <PersonAvatar clinicId={clinicId} ownerType="patient" ownerId={pr.patientId} name={patientLookup[pr.patientId] ?? pr.patientId} />
                        <span>{patientLookup[pr.patientId] ?? pr.patientId}</span>
                      </div>
                    </TableCell>
                    <TableCell>{pr.diagnosis ?? "—"}</TableCell>
                    <TableCell>{pr.medicines.length} medicine(s)</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}