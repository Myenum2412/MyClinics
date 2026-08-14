import Link from "next/link";
import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Stats07 from "@/components/stats-07";
import {
  startOfMonthDate,
  todayDateString,
} from "@/lib/stats";
import {
  CalendarPlusIcon,
  CalendarDaysIcon,
  UserPlusIcon,
  UsersIcon,
  ArrowRightIcon,
} from "lucide-react";

type AppointmentDoc = {
  _id: { toString(): string };
  fullName: string;
  doctorId?: string | null;
  doctorName?: string | null;
  date: string;
  time: string;
  type?: string;
  status: string;
};

type PatientDoc = {
  _id: { toString(): string };
  fullName: string;
  mobile: string | null;
  age: number | null;
  gender: string | null;
  createdAt?: Date;
};

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "secondary",
  confirmed: "default",
  completed: "outline",
  cancelled: "destructive",
  rescheduled: "outline",
  no_show: "destructive",
};

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default async function DashboardPage() {
  const session = await auth();
  const db = await getDb();

  const userId = session?.user?.id as string | undefined;
  const role = session?.user?.role;
  const isDoctor = role === "doctor";

  const today = todayDateString();
  const doctorFilter =
    isDoctor && userId ? { doctorId: userId } : {};

  const [
    appointmentsTodayAll,
    myAppointmentsToday,
    totalPatients,
    thisMonthRx,
    totalReports,
    todayAppointments,
    recentPatients,
  ] = await Promise.all([
    db.collection("appointments").countDocuments({ date: today }),
    isDoctor && userId
      ? db.collection("appointments").countDocuments({ date: today, doctorId: userId })
      : Promise.resolve(0),
    db.collection("patients").countDocuments(),
    db
      .collection("prescriptions")
      .countDocuments({ createdAt: { $gte: startOfMonthDate() } }),
    db.collection("reports").countDocuments(),
    db
      .collection("appointments")
      .find({ date: today, ...doctorFilter })
      .sort({ time: 1 })
      .limit(8)
      .toArray(),
    db
      .collection("patients")
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray(),
  ]);

  const schedule = todayAppointments as unknown as AppointmentDoc[];
  const recent = recentPatients as unknown as PatientDoc[];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {session?.user.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isDoctor
            ? `You have ${myAppointmentsToday} appointment${myAppointmentsToday === 1 ? "" : "s"} today. Here's your schedule.`
            : "Here's what's happening at your clinic today."}
        </p>
      </div>

      <Stats07
        title="Overview"
        description="A snapshot of activity at your clinic."
        items={[
          {
            name: isDoctor ? "My Appointments Today" : "Today's Appointments",
            current: isDoctor ? myAppointmentsToday : appointmentsTodayAll,
            allowed: 20,
            fill: "var(--chart-1)",
          },
          {
            name: "Total Patients",
            current: totalPatients,
            allowed: 100,
            fill: "var(--chart-2)",
          },
          {
            name: "Prescriptions This Month",
            current: thisMonthRx,
            allowed: 60,
            fill: "var(--chart-3)",
          },
          {
            name: "Medical Reports",
            current: totalReports,
            allowed: 200,
            fill: "var(--chart-4)",
          },
        ]}
      />

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
          Quick Actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/doctor/appointments"
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm font-medium shadow-none transition-colors hover:bg-accent"
          >
            <CalendarPlusIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            Book Appointment
            <ArrowRightIcon className="ml-auto size-4 text-muted-foreground" aria-hidden="true" />
          </Link>
          <Link
            href="/doctor/patients"
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm font-medium shadow-none transition-colors hover:bg-accent"
          >
            <UserPlusIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            Add Patient
            <ArrowRightIcon className="ml-auto size-4 text-muted-foreground" aria-hidden="true" />
          </Link>
          <Link
            href="/doctor/appointments"
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm font-medium shadow-none transition-colors hover:bg-accent"
          >
            <CalendarDaysIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            View Appointments
            <ArrowRightIcon className="ml-auto size-4 text-muted-foreground" aria-hidden="true" />
          </Link>
          <Link
            href="/doctor/patients"
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm font-medium shadow-none transition-colors hover:bg-accent"
          >
            <UsersIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            View Patients
            <ArrowRightIcon className="ml-auto size-4 text-muted-foreground" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Today&apos;s Schedule</CardTitle>
              <CardDescription>
                {isDoctor ? "Your appointments for " : "Appointments for "}
                {today}
              </CardDescription>
            </div>
            <Link
              href="/doctor/appointments"
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {schedule.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isDoctor
                  ? "You have no appointments scheduled today."
                  : "No appointments scheduled today."}
              </p>
            ) : (
              <ul className="space-y-3">
                {schedule.map((appt) => (
                  <li
                    key={appt._id.toString()}
                    className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
                  >
                    <div className="w-16 shrink-0 text-sm font-medium tabular-nums">
                      {formatTime(appt.time)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{appt.fullName}</p>
                      {!isDoctor && appt.doctorName && (
                        <p className="truncate text-xs text-muted-foreground">
                          {appt.doctorName}
                        </p>
                      )}
                    </div>
                    {appt.type === "video" && (
                      <Badge variant="outline" className="shrink-0">
                        Video
                      </Badge>
                    )}
                    <Badge
                      variant={statusVariant[appt.status] ?? "secondary"}
                      className="shrink-0 capitalize"
                    >
                      {appt.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Recent Patients</CardTitle>
              <CardDescription>Latest patient records</CardDescription>
            </div>
            <Link
              href="/doctor/patients"
              className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No patients added yet. Add your first patient to get started.
              </p>
            ) : (
              <ul className="space-y-3">
                {recent.map((patient) => (
                  <li
                    key={patient._id.toString()}
                    className="flex items-center gap-3"
                  >
                    <Avatar className="size-9 shrink-0">
                      <AvatarFallback>{initials(patient.fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{patient.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[patient.gender, patient.age ? `${patient.age} yrs` : null]
                          .filter(Boolean)
                          .join(", ") || "Patient"}
                        {patient.mobile ? ` · ${patient.mobile}` : ""}
                      </p>
                    </div>
                    {patient.createdAt && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(patient.createdAt.toISOString())}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
