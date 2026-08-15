import Link from "next/link";
import {
  ArrowLeftIcon as ArrowLeft,
  CalendarDaysIcon as CalendarClock,
  PencilIcon as Pencil,
} from "@heroicons/react/24/outline";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PatientAppointmentPanel, type AppointmentRecord } from "@/components/patient-appointment-panel";
import { ReportDownloadButton } from "@/components/report-download-button";

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

const billStatusVariant: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  paid: "default",
  pending: "secondary",
  cancelled: "destructive",
};

export type PatientRecord = {
  id: string;
  fullName: string;
  mobile: string;
  secondaryMobile: string | null;
  age: number | null;
  gender: string | null;
  email: string | null;
  whatsapp: string | null;
  bloodGroup: string | null;
  dateOfBirth: string | null;
  weight: number | null;
  height: number | null;
  guardianName: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  maritalStatus: string | null;
  smoking: string | null;
  alcohol: string | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
  occupation: string | null;
  medicalHistory: string | null;
  allergies: string | null;
  currentMedications: string | null;
  previousSurgeries: string | null;
  familyHistory: string | null;
  notes: string | null;
};

type PrescriptionRecord = {
  id: string;
  visitDate: string;
  diagnosis: string;
  doctorName: string | null;
  medicines: { name: string }[];
};

type BillRecord = {
  id: string;
  billNumber: string;
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

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function PatientDetails({
  patient,
  appointments,
  prescriptions,
  bills,
  reports,
}: {
  patient: PatientRecord;
  appointments: AppointmentRecord[];
  prescriptions: PrescriptionRecord[];
  bills: BillRecord[];
  reports: ReportRecord[];
}) {
  const lastAppointment = appointments[0] ?? null;

  const formatBytes = (bytes: number | null) => {
    if (bytes == null) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar size="lg" className="size-14 data-[size=lg]:size-14">
              <AvatarFallback className="text-lg">
                {initials(patient.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight">
                <span className="truncate">{patient.fullName}</span>
                {patient.bloodGroup && (
                  <Badge variant="outline" className="text-xs">
                    {patient.bloodGroup}
                  </Badge>
                )}
              </h1>
              <p className="truncate text-sm text-muted-foreground">
                {[patient.gender, patient.age ? `${patient.age} yrs` : null]
                  .filter(Boolean)
                  .join(" · ")}{" "}
                · {patient.mobile}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/doctor/patients" />}
              nativeButton={false}
            >
              <ArrowLeft className="mr-1 size-3.5" aria-hidden="true" />
              Back to Patients
            </Button>
            <Button
              size="sm"
              render={<Link href={`/doctor/patients/${patient.id}/edit`} />}
              nativeButton={false}
            >
              <Pencil className="mr-1 size-3.5" aria-hidden="true" />
              Edit Patient
            </Button>
          </div>
        </div>
      </div>

      {lastAppointment && (
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
          <div className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <p className="font-medium">
              {formatDate(lastAppointment.date)} · {lastAppointment.time}
            </p>
            <p>
              <span className="text-muted-foreground">Doctor: </span>
              {lastAppointment.doctorName ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Department: </span>
              {lastAppointment.department ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Type: </span>
              {lastAppointment.type === "video" ? "Video" : "In-person"}
              {lastAppointment.counter != null && (
                <span className="text-muted-foreground">
                  {" "}· Counter #{lastAppointment.counter}
                </span>
              )}
            </p>
            <p className="sm:col-span-2 lg:col-span-2">
              <span className="text-muted-foreground">Reason: </span>
              {lastAppointment.reason ?? "—"}
            </p>
            {lastAppointment.notes && (
              <p className="sm:col-span-2 lg:col-span-3">
                <span className="text-muted-foreground">Notes: </span>
                {lastAppointment.notes}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Personal Details">
          <Row label="Full Name" value={patient.fullName} />
          <Row label="Mobile" value={patient.mobile} />
          <Row label="Secondary Mobile" value={patient.secondaryMobile ?? "—"} />
          <Row label="Date of Birth" value={patient.dateOfBirth ?? "—"} />
          <Row label="Age" value={patient.age ?? "—"} />
          <Row label="Gender" value={patient.gender ?? "—"} />
          <Row
            label="Weight / Height"
            value={`${patient.weight ?? "—"} kg / ${patient.height ?? "—"} cm`}
          />
          <Row label="Marital Status" value={patient.maritalStatus ?? "—"} />
          <Row label="Occupation" value={patient.occupation ?? "—"} />
          <Row label="Email" value={patient.email ?? "—"} />
          <Row label="WhatsApp" value={patient.whatsapp ?? "—"} />
          <Row label="Guardian" value={patient.guardianName ?? "—"} />
        </Section>

        <Section title="Address & Emergency Contact">
          <Row label="Address" value={patient.address ?? "—"} />
          <Row label="City" value={patient.city ?? "—"} />
          <Row label="Pincode" value={patient.pincode ?? "—"} />
          <Row
            label="Emergency Contact"
            value={
              patient.emergencyContactName || patient.emergencyContactPhone
                ? `${patient.emergencyContactName ?? "—"} (${patient.emergencyContactPhone ?? "—"})`
                : "—"
            }
          />
          <Row label="Smoking" value={patient.smoking ?? "—"} />
          <Row label="Alcohol" value={patient.alcohol ?? "—"} />
          <Row label="Allergies" value={patient.allergies ?? "—"} />
        </Section>

        <Section title="Medical History">
          <Row label="Medical History" value={patient.medicalHistory ?? "—"} />
          <Row
            label="Current Medications"
            value={patient.currentMedications ?? "—"}
          />
          <Row
            label="Previous Surgeries"
            value={patient.previousSurgeries ?? "—"}
          />
          <Row label="Family History" value={patient.familyHistory ?? "—"} />
          <Row label="Notes" value={patient.notes ?? "—"} />
        </Section>
      </div>

      <PatientAppointmentPanel appointments={appointments} />

      <div className="grid gap-4 lg:grid-cols-2">
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
      </div>
    </div>
  );
}