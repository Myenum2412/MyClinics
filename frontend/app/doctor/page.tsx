import Link from "next/link";
import { formatTime } from "@/lib/format-time";
import { cn } from "@/lib/utils";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { statusBadgeClass } from "@/lib/appointment-status";
import {
  startOfMonthDate,
  todayDateString,
  dateString,
} from "@/lib/stats";

export const dynamic = "force-dynamic";

type AppointmentDoc = {
  _id: { toString(): string };
  fullName: string;
  mobile?: string | null;
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
  // Next 7 calendar days (tomorrow … +7)
  const next7 = dateString(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const doctorFilter =
    isDoctor && userId ? { doctorId: userId } : {};

  const [
    appointmentsTodayAll,
    myAppointmentsToday,
    totalPatients,
    thisMonthRx,
    totalReports,
    todayAppointments,
    upcomingAppointments,
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
    // Today's appointments
    db
      .collection("appointments")
      .find({ date: today, ...doctorFilter })
      .sort({ time: 1 })
      .limit(50)
      .toArray(),
    // Upcoming appointments (tomorrow → +7 days)
    db
      .collection("appointments")
      .find({ date: { $gt: today, $lte: next7 }, ...doctorFilter })
      .sort({ date: 1, time: 1 })
      .limit(20)
      .toArray(),
    db
      .collection("patients")
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray(),
  ]);

  const schedule = todayAppointments as unknown as AppointmentDoc[];
  const upcoming = upcomingAppointments as unknown as AppointmentDoc[];
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
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead className="h-9">Time</TableHead>
                  <TableHead className="h-9">Patient</TableHead>
                  {!isDoctor && <TableHead className="h-9">Doctor</TableHead>}
                  <TableHead className="h-9">Type</TableHead>
                  <TableHead className="h-9 pr-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={isDoctor ? 4 : 5}
                      className="h-20 text-center text-sm text-muted-foreground"
                    >
                      {isDoctor
                        ? "You have no appointments scheduled today."
                        : "No appointments scheduled today."}
                    </TableCell>
                  </TableRow>
                ) : (
                  schedule.map((appt) => (
                    <TableRow key={appt._id.toString()}>
                      <TableCell className="py-2.5 text-sm font-medium tabular-nums">
                        {formatTime(appt.time)}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span className="truncate text-sm font-medium">
                          {appt.fullName}
                        </span>
                      </TableCell>
                      {!isDoctor && (
                        <TableCell className="py-2.5 text-sm text-muted-foreground">
                          {appt.doctorName ?? "—"}
                        </TableCell>
                      )}
                      <TableCell className="py-2.5">
                        {appt.type === "video" ? (
                          <Badge variant="outline">Video</Badge>
                        ) : (
                          <Badge variant="secondary">In-person</Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5 pr-4">
                        <Badge
                          className={cn(
                            "border-transparent text-white shrink-0 capitalize",
                            statusBadgeClass(appt.status)
                          )}
                        >
                          {appt.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Upcoming Schedule */}
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Upcoming Schedule</CardTitle>
              <CardDescription>
                {isDoctor ? "Your appointments" : "Appointments"} in the next 7 days
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
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead className="h-9">Date</TableHead>
                  <TableHead className="h-9">Time</TableHead>
                  <TableHead className="h-9">Patient</TableHead>
                  {!isDoctor && <TableHead className="h-9">Doctor</TableHead>}
                  <TableHead className="h-9 pr-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcoming.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={isDoctor ? 4 : 5}
                      className="h-20 text-center text-sm text-muted-foreground"
                    >
                      {isDoctor
                        ? "No upcoming appointments in the next 7 days."
                        : "No upcoming appointments in the next 7 days."}
                    </TableCell>
                  </TableRow>
                ) : (
                  upcoming.map((appt) => (
                    <TableRow key={appt._id.toString()}>
                      <TableCell className="py-2.5 text-sm tabular-nums">
                        {formatDate(appt.date)}
                      </TableCell>
                      <TableCell className="py-2.5 text-sm font-medium tabular-nums">
                        {formatTime(appt.time)}
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span className="truncate text-sm font-medium">
                          {appt.fullName}
                        </span>
                      </TableCell>
                      {!isDoctor && (
                        <TableCell className="py-2.5 text-sm text-muted-foreground">
                          {appt.doctorName ?? "—"}
                        </TableCell>
                      )}
                      <TableCell className="py-2.5 pr-4">
                        <Badge
                          className={cn(
                            "border-transparent text-white shrink-0 capitalize",
                            statusBadgeClass(appt.status)
                          )}
                        >
                          {appt.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead className="h-9">Patient</TableHead>
                  <TableHead className="h-9">Details</TableHead>
                  <TableHead className="h-9 pr-4 text-right">Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={3}
                      className="h-20 text-center text-sm text-muted-foreground"
                    >
                      No patients added yet. Add your first patient to get
                      started.
                    </TableCell>
                  </TableRow>
                ) : (
                  recent.map((patient) => (
                    <TableRow key={patient._id.toString()}>
                      <TableCell className="py-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Avatar className="size-8 shrink-0">
                            <AvatarFallback>
                              {initials(patient.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate text-sm font-medium">
                            {patient.fullName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 text-sm text-muted-foreground">
                        <span className="truncate">
                          {[patient.gender, patient.age ? `${patient.age} yrs` : null]
                            .filter(Boolean)
                            .join(", ") || "Patient"}
                          {patient.mobile ? ` · ${patient.mobile}` : ""}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5 pr-4 text-right text-sm text-muted-foreground tabular-nums">
                        {patient.createdAt
                          ? formatDate(patient.createdAt.toISOString())
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
