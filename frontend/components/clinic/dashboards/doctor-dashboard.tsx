"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  type Appointment,
  type Bill,
  type Patient,
  listAppointments,
  listBills,
  listPatients,
} from "@/lib/clinic-api";
import { formatDate, formatTime } from "@/lib/format-time";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartBarInteractive,
  type ChartBarInteractiveDatum,
} from "@/components/chart-bar-interactive";

import { type ClinicSession } from "@/lib/clinic-api";

export function DoctorDashboard({ session }: { session: ClinicSession }) {
  const clinicId = session.clinicId ?? "";

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);

  useEffect(() => {
    if (!clinicId) return;
    let active = true;
    setLoading(true);
    Promise.allSettled([
      listAppointments(clinicId, { limit: 50 }),
      listPatients(clinicId, { limit: 100 }),
      listBills(clinicId, { limit: 200 }),
    ])
      .then(([apptRes, patientRes, billRes]) => {
        if (!active) return;
        if (apptRes.status === "fulfilled") setAppointments(apptRes.value.items);
        if (patientRes.status === "fulfilled") setPatients(patientRes.value.items);
        if (billRes.status === "fulfilled") setBills(billRes.value.items);
        if (
          apptRes.status === "rejected" &&
          patientRes.status === "rejected" &&
          billRes.status === "rejected"
        ) {
          toast.error("Failed to load dashboard data");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [clinicId]);

  const patientById = useMemo(() => {
    const map = new Map<string, Patient>();
    for (const p of patients) map.set(p.patientId, p);
    return map;
  }, [patients]);

  const recentAppointment = useMemo(() => {
    if (appointments.length === 0) return null;
    return [...appointments].sort((a, b) => {
      if (a.date === b.date) return b.time.localeCompare(a.time);
      return b.date.localeCompare(a.date);
    })[0];
  }, [appointments]);

  // Last 12 calendar months including the current one, oldest → newest.
  // `total` is the invoiced amount per month; `paid` is the collected
  // portion. Voided bills are excluded from both.
  const monthlyBilling: ChartBarInteractiveDatum[] = useMemo(() => {
    const now = new Date();
    const totalsByKey = new Map<string, number>();
    const paidByKey = new Map<string, number>();
    for (const bill of bills) {
      if (bill.status === "void") continue;
      const invoice = new Date(bill.invoiceDate);
      if (Number.isNaN(invoice.getTime())) continue;
      const key = `${invoice.getFullYear()}-${String(
        invoice.getMonth() + 1
      ).padStart(2, "0")}-01`;
      totalsByKey.set(key, (totalsByKey.get(key) ?? 0) + bill.total);
      if (bill.status === "paid") {
        paidByKey.set(key, (paidByKey.get(key) ?? 0) + bill.total);
      }
    }

    const out: ChartBarInteractiveDatum[] = [];
    for (let offset = 11; offset >= 0; offset--) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-01`;
      out.push({
        date: key,
        total: Math.round(totalsByKey.get(key) ?? 0),
        paid: Math.round(paidByKey.get(key) ?? 0),
      });
    }
    return out;
  }, [bills]);

  return (
    <div className="w-full">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden rounded-none border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Recent Appointment
                </CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Latest appointment across all doctors.
                </p>
              </div>
              <Link
                href="/clinic/appointments"
                className="inline-flex h-7 items-center justify-center gap-1.5 rounded-none border border-border bg-background px-3 text-[0.8rem] font-medium transition-all hover:bg-muted hover:text-foreground"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-2 p-6">
                <Skeleton className="h-9 w-full rounded-none" />
              </div>
            ) : !recentAppointment ? (
              <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                No appointments yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Patient
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Reason
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Date & Time
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const patient = patientById.get(
                      recentAppointment.patientId
                    );
                    return (
                      <TableRow>
                        <TableCell className="font-medium text-foreground">
                          {patient?.fullName ??
                            `Patient #${recentAppointment.patientId.slice(-6)}`}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {recentAppointment.reason || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex flex-col">
                            <span className="text-foreground">
                              {formatDate(recentAppointment.date)}
                            </span>
                            <span className="text-xs">
                              {formatTime(recentAppointment.time)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })()}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <Card className="overflow-hidden rounded-none border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
              <div className="h-5 w-40 animate-pulse rounded-none bg-muted" />
            </CardHeader>
            <CardContent className="p-6">
              <Skeleton className="h-[250px] w-full rounded-none" />
            </CardContent>
          </Card>
        ) : (
          <ChartBarInteractive
            title="Billing — Last 12 Months"
            subtitle="Total invoiced amount per month (excludes voided bills)."
            data={monthlyBilling}
          />
        )}
      </div>
    </div>
  );
}
