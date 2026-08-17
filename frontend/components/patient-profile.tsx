import {
  BeakerIcon as Pill,
  CalendarDaysIcon,
  DocumentTextIcon as FileText,
  IdentificationIcon as Stethoscope,
  MapPinIcon as MapPin,
  PhoneIcon as Phone,
  ReceiptPercentIcon as ReceiptText,
  UserCircleIcon as UserCircle,
} from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PatientProfile } from "@/lib/patient";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

function formatDate(value: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateFmt.format(parsed);
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-muted/30 px-3 py-2">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-tight tabular-nums">
          {value}
        </p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function PatientProfileView({
  patient,
  appointments,
  prescriptions,
  bills,
  reports,
}: {
  patient: PatientProfile;
  appointments: number;
  prescriptions: number;
  bills: number;
  reports: number;
}) {
  const emergencyContact =
    patient.emergencyContactName || patient.emergencyContactPhone
      ? `${patient.emergencyContactName ?? "—"} (${patient.emergencyContactPhone ?? "—"})`
      : null;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xl font-semibold">
            {initials(patient.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">
                {patient.fullName}
              </h1>
              {patient.bloodGroup && (
                <Badge className="border-transparent bg-red-600 text-white">
                  {patient.bloodGroup}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {patient.age ? `${patient.age} years` : "Age n/a"}
              {patient.gender ? ` · ${patient.gender}` : ""}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
              {patient.mobile && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="size-3.5" aria-hidden="true" />
                  {patient.mobile}
                </span>
              )}
              {patient.email && (
                <span className="inline-flex items-center gap-1">
                  <UserCircle className="size-3.5" aria-hidden="true" />
                  {patient.email}
                </span>
              )}
              {(patient.city || patient.address) && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  {[patient.city, patient.pincode].filter(Boolean).join(" · ")}
                </span>
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<CalendarDaysIcon className="size-4" aria-hidden="true" />}
          label="Appointments"
          value={appointments}
        />
        <StatCard
          icon={<FileText className="size-4" aria-hidden="true" />}
          label="Medical Reports"
          value={reports}
        />
        <StatCard
          icon={<ReceiptText className="size-4" aria-hidden="true" />}
          label="Invoices"
          value={bills}
        />
        <StatCard
          icon={<Pill className="size-4" aria-hidden="true" />}
          label="Prescriptions"
          value={prescriptions}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Details</CardTitle>
          <CardDescription>Your basic information at the clinic.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Full Name" value={patient.fullName || "—"} />
            <Field label="Mobile" value={patient.mobile ?? "—"} />
            <Field label="Secondary Mobile" value={patient.secondaryMobile ?? "—"} />
            <Field label="Date of Birth" value={formatDate(patient.dateOfBirth)} />
            <Field label="Age" value={patient.age ?? "—"} />
            <Field label="Gender" value={patient.gender ?? "—"} />
            <Field
              label="Weight / Height"
              value={`${patient.weight ?? "—"} kg / ${patient.height ?? "—"} cm`}
            />
            <Field label="Blood Group" value={patient.bloodGroup ?? "—"} />
            <Field label="Marital Status" value={patient.maritalStatus ?? "—"} />
            <Field label="Occupation" value={patient.occupation ?? "—"} />
            <Field label="Email" value={patient.email ?? "—"} />
            <Field label="WhatsApp" value={patient.whatsapp ?? "—"} />
            <Field label="Guardian" value={patient.guardianName ?? "—"} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address & Emergency Contact</CardTitle>
          <CardDescription>Where to reach you when needed.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Address" value={patient.address ?? "—"} />
            <Field label="City" value={patient.city ?? "—"} />
            <Field label="Pincode" value={patient.pincode ?? "—"} />
            <Field label="Emergency Contact" value={emergencyContact ?? "—"} />
            <Field label="Smoking" value={patient.smoking ?? "—"} />
            <Field label="Alcohol" value={patient.alcohol ?? "—"} />
            <Field label="Allergies" value={patient.allergies ?? "—"} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="size-4 text-primary" aria-hidden="true" />
            Medical History
          </CardTitle>
          <CardDescription>Past conditions and notes recorded by the clinic.</CardDescription>
        </CardHeader>
        <CardContent>
          {patient.medicalHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No medical history recorded yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {patient.medicalHistory.map((entry, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border bg-muted/30 px-3 py-2"
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    {formatDate(entry.date)}
                  </p>
                  <p className="mt-0.5 text-sm">{entry.record}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}