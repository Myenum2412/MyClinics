"use client";

import { useCallback, useEffect, useState } from "react";
import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type Appointment,
  type Bill,
  type MedicalRecord,
  type Patient,
  type Prescription,
  type Report,
  listAppointments,
  listBills,
  listPatients,
  myAppointments,
  myBills,
  myPrescriptions,
  myRecords,
  myReports,
} from "@/lib/clinic-api";
import { formatTime } from "@/lib/format-time";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function today(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ApptStatus({ status }: { status: string }) {
  const classes: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    no_show: "bg-slate-200 text-slate-600",
  };
  return (
    <Badge className={classes[status] ?? "bg-slate-100 text-slate-600"}>
      {status.replace("_", " ")}
    </Badge>
  );
}

export default function ClinicDashboardPage() {
  const session = useRequireRole("patient");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  const isPatient = session?.role === "patient";

  const loadStaffStats = useCallback(
    async (clinicId: string) => {
      const [p, a, b] = await Promise.all([
        listPatients(clinicId, { limit: 100 }),
        listAppointments(clinicId, { date: today(), limit: 50 }),
        listBills(clinicId, { status: "issued", limit: 50 }),
      ]);
      setPatients(p.items);
      setAppointments(a.items);
      setBills(b.items);
    },
    []
  );

  useEffect(() => {
    if (!session?.clinicId) return;
    if (isPatient) return;
    setLoading(true);
    loadStaffStats(session.clinicId)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session?.clinicId, isPatient, loadStaffStats]);

  if (isPatient) {
    return <PatientPortal clinicId={session?.clinicId ?? ""} />;
  }

  const unpaidTotal = bills.reduce((sum, b) => sum + b.total, 0);
  const upcoming = appointments.filter((a) => a.status === "scheduled").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Patients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : patients.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Appointments today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {loading ? <Skeleton className="h-8 w-16" /> : appointments.length}
            </p>
            {!loading && (
              <p className="text-xs text-muted-foreground">{upcoming} scheduled</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding bills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                `₹${unpaidTotal.toLocaleString("en-IN")}`
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {bills.length} issued bill(s)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : appointments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No appointments scheduled for today.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((a) => (
                  <TableRow key={a.appointmentId}>
                    <TableCell className="font-medium">{formatTime(a.time)}</TableCell>
                    <TableCell>{a.patientId}</TableCell>
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
    </div>
  );
}

// ── Patient portal dashboard (own data only via /me/*) ─────────────────────

function PatientPortal({ clinicId }: { clinicId: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId) return;
    setLoading(true);
    Promise.all([
      myAppointments(clinicId, { limit: 20 }),
      myBills(clinicId, { limit: 20 }),
      myPrescriptions(clinicId, { limit: 20 }),
      myRecords(clinicId, { limit: 20 }),
      myReports(clinicId, { limit: 20 }),
    ])
      .then(([a, b, p, r, rep]) => {
        setAppointments(a.items);
        setBills(b.items);
        setPrescriptions(p.items);
        setRecords(r.items);
        setReports(rep.items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clinicId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="appointments" className="flex flex-col gap-4">
      <TabsList className="w-fit">
        <TabsTrigger value="appointments">Appointments</TabsTrigger>
        <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
        <TabsTrigger value="records">Medical Records</TabsTrigger>
        <TabsTrigger value="bills">Bills</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>

      <TabsContent value="appointments">
        <Card>
          <CardHeader>
            <CardTitle>My appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No appointments yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((a) => (
                    <TableRow key={a.appointmentId}>
                      <TableCell>{a.date}</TableCell>
                      <TableCell>{formatTime(a.time)}</TableCell>
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
      </TabsContent>

      <TabsContent value="prescriptions">
        <Card>
          <CardHeader>
            <CardTitle>My prescriptions</CardTitle>
          </CardHeader>
          <CardContent>
            {prescriptions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No prescriptions yet.
              </p>
            ) : (
              <div className="space-y-3">
                {prescriptions.map((p) => (
                  <div
                    key={p.prescriptionId}
                    className="rounded-lg border p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{formatDate(p.visitDate)}</span>
                      <span className="text-muted-foreground">
                        {p.medicines.length} medicine(s)
                      </span>
                    </div>
                    {p.diagnosis && (
                      <p className="mt-1 text-muted-foreground">{p.diagnosis}</p>
                    )}
                    <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
                      {p.medicines.map((m, i) => (
                        <li key={i}>
                          {m.name}
                          {m.dosage ? ` — ${m.dosage}` : ""}
                          {m.frequency ? ` (${m.frequency})` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="records">
        <Card>
          <CardHeader>
            <CardTitle>My medical records</CardTitle>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No medical records yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Treatment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.recordId}>
                      <TableCell>{formatDate(r.visitDate)}</TableCell>
                      <TableCell>{r.diagnosis}</TableCell>
                      <TableCell>{r.treatment ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="bills">
        <Card>
          <CardHeader>
            <CardTitle>My bills</CardTitle>
          </CardHeader>
          <CardContent>
            {bills.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No bills yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill no.</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bills.map((b) => (
                    <TableRow key={b.billId}>
                      <TableCell className="font-medium">{b.billNumber}</TableCell>
                      <TableCell>{formatDate(b.createdAt)}</TableCell>
                      <TableCell>₹{b.total.toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <ApptStatus status={b.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="reports">
        <Card>
          <CardHeader>
            <CardTitle>My reports</CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No reports yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r) => (
                    <TableRow key={r.reportId}>
                      <TableCell className="font-medium">{r.title}</TableCell>
                      <TableCell>{r.type}</TableCell>
                      <TableCell>{formatDate(r.createdAt)}</TableCell>
                      <TableCell>
                        <ApptStatus status={r.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}