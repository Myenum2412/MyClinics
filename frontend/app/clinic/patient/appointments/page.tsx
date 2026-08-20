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
      scheduled: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700",
      no_show: "bg-slate-200 text-slate-600",
    };
    return classes[status] ?? "bg-slate-100 text-slate-600";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-slate-200 rounded w-1/4 animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Appointments</h2>
          <p className="text-slate-500 mt-1">View and manage your upcoming and past appointments</p>
        </div>
      </div>

      {appointments.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <Calendar className="size-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No appointments yet</h3>
          <p className="text-slate-500 mt-2">Your upcoming appointments will appear here.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 bg-slate-50/50">
                <TableHead className="font-medium text-slate-500">Date & Time</TableHead>
                <TableHead className="font-medium text-slate-500">Doctor</TableHead>
                <TableHead className="font-medium text-slate-500">Reason</TableHead>
                <TableHead className="font-medium text-slate-500">Status</TableHead>
                <TableHead className="font-medium text-slate-500 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((appt) => (
                <TableRow key={appt.appointmentId} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <TableCell className="font-medium text-slate-900 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="size-4 text-slate-400" />
                      {formatDate(appt.date)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                      <Clock className="size-4" />
                      {formatTime(appt.time)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-slate-900">Dr. {appt.doctorId?.slice(0, 8) || "Unknown"}</p>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600">{appt.reason || "General Consultation"}</span>
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