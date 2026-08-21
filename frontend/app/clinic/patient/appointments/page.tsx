"use client";

import { useEffect, useState } from "react";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { myAppointments, type Appointment } from "@/lib/clinic-api";
import { formatDate, formatTime } from "@/lib/format-time";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ChevronRight } from "lucide-react";

export default function PatientAppointmentsPage() {
  const session = useRequireRole("patient");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.clinicId) return;
    myAppointments(session.clinicId)
      .then((res) => {
        setAppointments(res.items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session?.clinicId]);

  const getStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      scheduled: "bg-primary/10 text-primary",
      completed: "bg-success/10 text-success",
      cancelled: "bg-destructive/10 text-destructive",
      no_show: "bg-muted text-muted-foreground",
    };
    return classes[status] ?? "bg-muted text-muted-foreground";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Appointments</h2>
          <p className="text-muted-foreground mt-1">View and manage your upcoming and past appointments</p>
        </div>
      </div>

      {appointments.length === 0 ? (
        <div className="rounded-xl border border-border bg-background p-12 text-center">
          <Calendar className="size-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">No appointments yet</h3>
          <p className="text-muted-foreground mt-2">Your upcoming appointments will appear here.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/50">
                <TableHead className="font-medium text-muted-foreground">Date & Time</TableHead>
                <TableHead className="font-medium text-muted-foreground">Doctor</TableHead>
                <TableHead className="font-medium text-muted-foreground">Reason</TableHead>
                <TableHead className="font-medium text-muted-foreground">Status</TableHead>
                <TableHead className="font-medium text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((appt) => (
                <TableRow key={appt.appointmentId} className="border-b border-border hover:bg-muted/50">
                  <TableCell className="font-medium text-foreground whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="size-4 text-muted-foreground" />
                      {formatDate(appt.date)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                      <Clock className="size-4" />
                      {formatTime(appt.time)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-foreground">Dr. {appt.doctorId?.slice(0, 8) || "Unknown"}</p>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{appt.reason || "General Consultation"}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusClass(appt.status)} variant="outline">
                      {appt.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="gap-1.5">
                      <ChevronRight className="size-4" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}