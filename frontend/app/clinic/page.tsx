"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

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
import { Button } from "@/components/ui/button";
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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const chartConfig = {
  total: {
    label: "Billing Total",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export default function ClinicPage() {
  const session = useRequireRole("doctor");
  const clinicId = session?.clinicId ?? "";

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [activeChart, setActiveChart] =
    React.useState<keyof typeof chartConfig>("total");

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

  const recentAppointments = useMemo(() => {
    return [...appointments]
      .sort((a, b) => {
        if (a.date === b.date) return b.time.localeCompare(a.time);
        return b.date.localeCompare(a.date);
      })
      .slice(0, 8);
  }, [appointments]);

  // Last 12 calendar months including the current one, oldest → newest.
  const monthlyBilling = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; total: number }[] = [];
    for (let offset = 11; offset >= 0; offset--) {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({
        key,
        label: `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
        total: 0,
      });
    }

    for (const bill of bills) {
      if (bill.status === "void") continue;
      const invoice = new Date(bill.invoiceDate);
      if (Number.isNaN(invoice.getTime())) continue;
      const key = `${invoice.getFullYear()}-${String(invoice.getMonth() + 1).padStart(2, "0")}`;
      const bucket = buckets.find((b) => b.key === key);
      if (bucket) bucket.total += bill.total;
    }

    return buckets.map(({ key, label, total }) => ({
      date: key,
      label,
      total: Math.round(total),
    }));
  }, [bills]);

  const yearTotal = useMemo(
    () => monthlyBilling.reduce((sum, m) => sum + m.total, 0),
    [monthlyBilling]
  );

  return (
    <div className="w-full">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border bg-muted/20 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Recent Appointments
                </CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Latest 8 appointments across all doctors.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link href="/clinic/appointments">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-2 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full rounded-md" />
                ))}
              </div>
            ) : recentAppointments.length === 0 ? (
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
                  {recentAppointments.map((appt) => {
                    const patient = patientById.get(appt.patientId);
                    return (
                      <TableRow key={appt.appointmentId}>
                        <TableCell className="font-medium text-foreground">
                          {patient?.fullName ?? `Patient #${appt.patientId.slice(-6)}`}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {appt.reason || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex flex-col">
                            <span className="text-foreground">
                              {formatDate(appt.date)}
                            </span>
                            <span className="text-xs">{formatTime(appt.time)}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-xl border-border bg-card shadow-sm">
          <CardHeader className="flex flex-col items-stretch border-b border-border bg-muted/20 p-0 sm:flex-row">
            <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-4">
              <CardTitle className="text-base font-semibold text-foreground">
                Billing — Last 12 Months
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Total invoiced amount per month (excludes voided bills).
              </p>
            </div>
            <div className="flex">
              <button
                data-active={activeChart === "total"}
                className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t border-border px-6 py-4 text-left data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0"
                onClick={() => setActiveChart("total")}
              >
                <span className="text-xs text-muted-foreground">Year Total</span>
                <span className="text-lg leading-none font-bold sm:text-2xl">
                  ₹
                  {loading
                    ? "—"
                    : yearTotal.toLocaleString("en-IN", {
                        maximumFractionDigits: 0,
                      })}
                </span>
              </button>
              <button
                data-active={activeChart === "month"}
                className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t border-l border-border px-6 py-4 text-left data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0"
                onClick={() => setActiveChart("month")}
              >
                <span className="text-xs text-muted-foreground">Months Shown</span>
                <span className="text-lg leading-none font-bold sm:text-2xl">
                  12
                </span>
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-2 pt-4 pb-6 sm:px-6">
            {loading ? (
              <Skeleton className="h-[250px] w-full rounded-lg" />
            ) : (
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[250px] w-full"
              >
                <BarChart
                  accessibilityLayer
                  data={monthlyBilling}
                  margin={{ left: 12, right: 12 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={16}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        className="w-[180px]"
                        nameKey="total"
                        labelFormatter={(value) => String(value)}
                        formatter={(value) => [
                          `₹${Number(value).toLocaleString("en-IN", {
                            maximumFractionDigits: 0,
                          })}`,
                          "Billing Total",
                        ]}
                      />
                    }
                  />
                  <Bar
                    dataKey="total"
                    fill={`var(--color-${activeChart === "month" ? "total" : "total"})`}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
