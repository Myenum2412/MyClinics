"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDaysIcon as CalendarClock,
  ArrowTopRightOnSquareIcon as ExternalLink,
} from "@heroicons/react/24/outline";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ReportDownloadButton } from "@/components/report-download-button";
import type { Patient } from "@/components/patients-table";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateFmt.format(parsed);
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const appointmentStatusVariant: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "secondary",
  confirmed: "default",
  completed: "outline",
  cancelled: "destructive",
  rescheduled: "outline",
  no_show: "destructive",
};

const billStatusVariant: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  paid: "default",
  pending: "secondary",
  cancelled: "destructive",
};

type ApptRecord = {
  id: string;
  fullName: string;
  mobile: string;
  date: string;
  time: string;
  type: string;
  status: string;
  doctorName: string | null;
  department: string | null;
  reason: string | null;
  notes: string | null;
  counter: number | null;
};

type RxRecord = {
  id: string;
  patientName: string;
  visitDate: string;
  diagnosis: string;
  doctorName: string | null;
  medicines: { name: string }[];
};

type BillRecord = {
  id: string;
  billNumber: string;
  patientName: string;
  patientPhone: string | null;
  date: string;
  paymentMethod: string;
  status: string;
  total: number;
  items: { name: string }[];
};

type ReportRecord = {
  id: string;
  name: string;
  category: string | null;
  size: number | null;
  createdAt: string;
};

function listFrom(data: unknown, key: string): unknown[] {
  const value = (data as Record<string, unknown> | null)?.[key];
  if (Array.isArray(value)) return value;
  if (Array.isArray((value as { rows?: unknown } | null)?.rows)) {
    return (value as { rows: unknown[] }).rows;
  }
  return [];
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Section({
  title,
  loading,
  children,
}: {
  title: string;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export function PatientPreviewPanel({
  patient,
  onClose,
}: {
  patient: Patient;
  onClose: () => void;
}) {
  return (
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        <PanelContent key={patient.id} patient={patient} />
      </SheetContent>
    </Sheet>
  );
}

function PanelContent({ patient }: { patient: Patient }) {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<ApptRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<RxRecord[]>([]);
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);

  useEffect(() => {
    let active = true;
    const q = encodeURIComponent(patient.fullName);
    const nameLower = patient.fullName.toLowerCase();
    const mobile = patient.mobile;

    Promise.all([
      fetch(`/api/appointments?q=${q}&pageSize=200`).then((r) =>
        r.ok ? r.json() : { appointments: [] }
      ),
      fetch(`/api/prescriptions?q=${q}&pageSize=200`).then((r) =>
        r.ok ? r.json() : { prescriptions: [] }
      ),
      fetch(`/api/bills?q=${q}&pageSize=200`).then((r) =>
        r.ok ? r.json() : { bills: [] }
      ),
      fetch(`/api/reports?patient=${encodeURIComponent(patient.id)}`).then((r) =>
        r.ok ? r.json() : { files: [] }
      ),
    ])
      .then(([apptData, rxData, billData, reportData]) => {
        if (!active) return;
        setAppointments(
          (listFrom(apptData, "appointments") as ApptRecord[]).filter(
            (a) =>
              a.fullName?.toLowerCase() === nameLower || a.mobile === mobile
          )
        );
        setPrescriptions(
          (listFrom(rxData, "prescriptions") as RxRecord[]).filter(
            (p) => p.patientName?.toLowerCase() === nameLower
          )
        );
        setBills(
          (listFrom(billData, "bills") as BillRecord[]).filter(
            (b) =>
              b.patientName?.toLowerCase() === nameLower ||
              b.patientPhone === mobile
          )
        );
        setReports(listFrom(reportData, "files") as ReportRecord[]);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [patient]);

  const lastAppointment = appointments[0] ?? null;

  const formatBytes = (bytes: number | null) => {
    if (bytes == null) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-3">
          <Avatar size="lg" className="size-12 data-[size=lg]:size-12">
            <AvatarFallback className="text-base">
              {initials(patient.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <SheetTitle className="flex flex-wrap items-center gap-2">
              <span className="truncate">{patient.fullName}</span>
              {patient.bloodGroup && (
                <Badge variant="outline" className="text-xs">
                  {patient.bloodGroup}
                </Badge>
              )}
            </SheetTitle>
            <p className="truncate text-sm text-muted-foreground">
              {[patient.gender, patient.age ? `${patient.age} yrs` : null]
                .filter(Boolean)
                .join(" · ")}{" "}
              · {patient.mobile}
            </p>
          </div>
        </div>
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
        {loading && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {!loading && lastAppointment && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-foreground uppercase">
                <CalendarClock className="size-4" aria-hidden="true" />
                Last Appointment
              </h2>
              <Badge
                variant={
                  appointmentStatusVariant[lastAppointment.status] ?? "secondary"
                }
                className="text-xs capitalize"
              >
                {lastAppointment.status}
              </Badge>
            </div>
            <div className="mt-3 flex flex-col gap-1.5 text-sm">
              <p className="font-medium">
                {formatDate(lastAppointment.date)} · {lastAppointment.time}
              </p>
              <p>
                <span className="text-muted-foreground">Doctor: </span>
                {lastAppointment.doctorName ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Reason: </span>
                {lastAppointment.reason ?? "—"}
              </p>
            </div>
          </div>
        )}

        {!loading && (
          <>
            <Section title="Personal Details">
              <Field label="Full Name" value={patient.fullName} />
              <Field label="Mobile" value={patient.mobile} />
              <Field
                label="Secondary Mobile"
                value={patient.secondaryMobile ?? "—"}
              />
              <Field label="Date of Birth" value={patient.dateOfBirth ?? "—"} />
              <Field label="Age" value={patient.age ?? "—"} />
              <Field label="Gender" value={patient.gender ?? "—"} />
              <Field
                label="Weight / Height"
                value={`${patient.weight ?? "—"} kg / ${patient.height ?? "—"} cm`}
              />
              <Field label="Marital Status" value={patient.maritalStatus ?? "—"} />
              <Field label="Occupation" value={patient.occupation ?? "—"} />
              <Field label="Email" value={patient.email ?? "—"} />
              <Field label="WhatsApp" value={patient.whatsapp ?? "—"} />
              <Field label="Guardian" value={patient.guardianName ?? "—"} />
            </Section>

            <Section title="Address & Emergency Contact">
              <Field label="Address" value={patient.address ?? "—"} />
              <Field label="City" value={patient.city ?? "—"} />
              <Field label="Pincode" value={patient.pincode ?? "—"} />
              <Field
                label="Emergency Contact"
                value={
                  patient.emergencyContactName || patient.emergencyContactPhone
                    ? `${patient.emergencyContactName ?? "—"} (${patient.emergencyContactPhone ?? "—"})`
                    : "—"
                }
              />
              <Field label="Smoking" value={patient.smoking ?? "—"} />
              <Field label="Alcohol" value={patient.alcohol ?? "—"} />
              <Field label="Allergies" value={patient.allergies ?? "—"} />
            </Section>

            <Section title="Medical History">
              {patient.medicalHistory && patient.medicalHistory.length ? (
                <div className="flex flex-col gap-2">
                  {patient.medicalHistory.map((entry, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <p className="text-xs font-medium text-muted-foreground">
                        {formatDate(entry.date)}
                      </p>
                      <p>{entry.record}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <Field label="Medical History" value="—" />
              )}
            </Section>

            <Section title={`Appointments (${appointments.length})`}>
              {appointments.length ? (
                <div className="flex flex-col gap-2">
                  {appointments.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          {formatDate(a.date)} · {a.time}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.doctorName ?? "—"} ·{" "}
                          {a.type === "video" ? "Video" : "In-person"}
                        </p>
                      </div>
                      <Badge
                        variant={
                          appointmentStatusVariant[a.status] ?? "secondary"
                        }
                        className="text-xs capitalize"
                      >
                        {a.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No appointments.</p>
              )}
            </Section>

            <Section title={`Prescriptions (${prescriptions.length})`}>
              {prescriptions.length ? (
                <div className="flex flex-col gap-2">
                  {prescriptions.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          {formatDate(p.visitDate)} · {p.diagnosis}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.doctorName ?? "—"} · {p.medicines.length}{" "}
                          {p.medicines.length === 1 ? "medicine" : "medicines"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No prescriptions.</p>
              )}
            </Section>

            <Section title={`Bills (${bills.length})`}>
              {bills.length ? (
                <div className="flex flex-col gap-2">
                  {bills.map((b) => (
                    <div
                      key={b.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          {b.billNumber} · {formatDate(b.date)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {b.paymentMethod} · {b.items.length} items
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium tabular-nums">
                          ₹{b.total.toLocaleString("en-IN")}
                        </span>
                        <Badge
                          variant={billStatusVariant[b.status] ?? "secondary"}
                          className="text-xs capitalize"
                        >
                          {b.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No bills.</p>
              )}
            </Section>

            <Section title={`Reports (${reports.length})`}>
              {reports.length ? (
                <div className="flex flex-col gap-2">
                  {reports.map((f) => (
                    <div
                      key={f.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="min-w-0 truncate font-medium">{f.name}</p>
                        <p className="shrink-0 text-xs text-muted-foreground">
                          {formatDate(f.createdAt)}
                          {f.category ? ` · ${f.category}` : ""}
                          {formatBytes(f.size) ? ` · ${formatBytes(f.size)}` : ""}
                        </p>
                      </div>
                      <ReportDownloadButton id={f.id} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No reports.</p>
              )}
            </Section>
          </>
        )}
      </div>

      <SheetFooter className="border-t border-border">
        <Button
          className="w-full"
          render={<Link href={`/doctor/patients/${patient.id}`} />}
          nativeButton={false}
        >
          <ExternalLink className="mr-1 size-3.5" aria-hidden="true" />
          Open Full Patient Page
        </Button>
      </SheetFooter>
    </>
  );
}