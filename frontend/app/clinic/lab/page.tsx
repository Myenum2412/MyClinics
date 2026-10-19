"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { useRequireRole } from "@/hooks/use-clinic-session";
import {
  listInvestigations,
  listLabs,
  type Investigation,
  type Lab,
} from "@/lib/clinic-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricStatGrid } from "@/components/metric-stat-cards";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format-time";
import { now, KOLKATA_TZ } from "@/lib/datetime";
import {
  INVESTIGATION_CATEGORY_BADGE,
  INVESTIGATION_STATUS_BADGE,
  investigationCategoryLabel,
  investigationStatusLabel,
} from "@/lib/investigation-meta";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FlaskConical,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

function todayLabel(): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: KOLKATA_TZ,
  }).format(now());
}

/** Matches the signed-in lab account to its Lab record, newest-created fallback. */
function resolveMyLab(labs: Lab[], userId: string, email: string | null): Lab | null {
  const byUser = labs.find((l) => l.userId && l.userId === userId);
  if (byUser) return byUser;
  const byEmail = email
    ? labs.find((l) => l.email && l.email.toLowerCase() === email.toLowerCase())
    : undefined;
  return byEmail ?? labs[0] ?? null;
}

export default function LabDashboardPage() {
  const session = useRequireRole("lab_technician");
  const clinicId = session?.clinicId ?? "";

  const [loading, setLoading] = useState(true);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [reports, setReports] = useState<Investigation[]>([]);

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    Promise.all([
      listLabs(clinicId).catch(() => ({ items: [] as Lab[], total: 0 })),
      listInvestigations(clinicId, { limit: 100 }).catch(() => ({
        items: [] as Investigation[],
        total: 0,
      })),
    ])
      .then(([labRes, reportRes]) => {
        setLabs(((labRes as { items?: Lab[] })?.items ?? []) as Lab[]);
        setReports(reportRes.items ?? []);
      })
      .catch(() => toast.error("Failed to load lab dashboard"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  const myLab = useMemo(
    () =>
      session
        ? resolveMyLab(labs, session.userId, session.email)
        : null,
    [labs, session]
  );

  const stats = useMemo(() => {
    const pending = reports.filter((r) => r.status === "pending").length;
    const inProgress = reports.filter((r) => r.status === "in-progress").length;
    const completed = reports.filter((r) => r.status === "completed").length;
    return { total: reports.length, pending, inProgress, completed };
  }, [reports]);

  const recent = useMemo(() => reports.slice(0, 5), [reports]);

  const iconCls = "size-4";
  const statItems = [
    {
      name: "Total Reports",
      value: stats.total,
      detail: "All lab reports in this clinic",
      percentage: 100,
      accent: "var(--chart-1)",
      icon: <FileText className={iconCls} />,
    },
    {
      name: "Pending",
      value: stats.pending,
      detail: "Awaiting processing",
      percentage: stats.total ? Math.round((stats.pending / stats.total) * 100) : 0,
      accent: "var(--chart-4)",
      icon: <Clock className={iconCls} />,
    },
    {
      name: "In Progress",
      value: stats.inProgress,
      detail: "Currently being worked on",
      percentage: stats.total ? Math.round((stats.inProgress / stats.total) * 100) : 0,
      accent: "var(--chart-2)",
      icon: <Loader2 className={iconCls} />,
    },
    {
      name: "Completed",
      value: stats.completed,
      detail: "Reports finalised",
      percentage: stats.total ? Math.round((stats.completed / stats.total) * 100) : 0,
      accent: "var(--chart-3)",
      icon: <CheckCircle2 className={iconCls} />,
    },
  ];

  return (
    <div className="flex w-full flex-col gap-4 sm:gap-6">
      {/* Header banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-gradient-to-br from-sky-500/10 to-cyan-400/5 px-4 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-6">
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FlaskConical className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Lab Workspace
            </p>
            <h1 className="truncate text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
              {loading && !myLab ? "Loading…" : myLab?.labName ?? "Lab Dashboard"}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              {todayLabel()}
            </p>
          </div>
        </div>
        <Button
          className="w-full justify-center gap-1.5 sm:w-auto"
          render={<Link href="/clinic/lab/reports" />}
        >
          View Lab Reports
          <ArrowRight className="size-4" />
        </Button>
      </div>

      <MetricStatGrid items={statItems} />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Recent reports */}
        <Card className="border-border shadow-sm lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2 border-b bg-muted/20 py-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <FileText className="size-4 text-primary" />
                Recent Lab Reports
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Latest investigations recorded for this clinic.
              </p>
            </div>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" render={<Link href="/clinic/lab/reports" />}>
              View all <ArrowRight className="size-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : recent.length === 0 ? (
              <div className="py-14 text-center text-sm text-muted-foreground">
                No lab reports yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[560px]">
                  <TableHeader>
                    <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
                      <TableHead>Patient</TableHead>
                      <TableHead>Report</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right pr-6">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recent.map((r) => (
                      <TableRow key={r.investigationId} className="border-b last:border-0 hover:bg-muted/30">
                        <TableCell className="font-medium">{r.patientName || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{r.title || "—"}</TableCell>
                        <TableCell>
                          <Badge className={INVESTIGATION_CATEGORY_BADGE[investigationCategoryKey(r)]}>
                            {investigationCategoryLabel(r.category)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(r.visitDate)}</TableCell>
                        <TableCell className="text-right pr-6">
                          <Badge className={INVESTIGATION_STATUS_BADGE[r.status]}>
                            {investigationStatusLabel(r.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lab profile */}
        <Card className="border-border shadow-sm">
          <CardHeader className="border-b bg-muted/20 py-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <FlaskConical className="size-4 text-primary" />
              My Lab
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Laboratory details linked to your account.
            </p>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : !myLab ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No lab is linked to this account yet. Please contact your clinic admin.
              </p>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold text-foreground">
                    {myLab.labName ?? myLab.name ?? "—"}
                  </p>
                  <Badge variant="outline" className="shrink-0 capitalize">
                    {myLab.status}
                  </Badge>
                </div>
                <dl className="space-y-3">
                  {myLab.contactPerson ? (
                    <div>
                      <dt className="text-xs text-muted-foreground">Contact person</dt>
                      <dd className="font-medium">{myLab.contactPerson}</dd>
                    </div>
                  ) : null}
                  {myLab.phone ? (
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5 text-muted-foreground" />
                      <dd className="text-foreground">{myLab.phone}</dd>
                    </div>
                  ) : null}
                  {myLab.email ? (
                    <div className="flex items-center gap-2">
                      <Mail className="size-3.5 text-muted-foreground" />
                      <dd className="truncate text-foreground">{myLab.email}</dd>
                    </div>
                  ) : null}
                  {myLab.address || myLab.city ? (
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                      <dd className="text-foreground">
                        {[myLab.address, myLab.city, myLab.state, myLab.pincode]
                          .filter(Boolean)
                          .join(", ")}
                      </dd>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {myLab.labType ? (
                      <div>
                        <dt className="text-xs text-muted-foreground">Lab type</dt>
                        <dd className="font-medium capitalize">{myLab.labType}</dd>
                      </div>
                    ) : null}
                    {myLab.licenseNo ? (
                      <div>
                        <dt className="text-xs text-muted-foreground">License</dt>
                        <dd className="truncate font-medium">{myLab.licenseNo}</dd>
                      </div>
                    ) : null}
                  </div>
                </dl>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Narrow the report category to a key present in the badge maps. */
function investigationCategoryKey(r: Investigation) {
  const value = r.category ?? "other";
  return (
    value in INVESTIGATION_CATEGORY_BADGE
      ? value
      : "other"
  ) as keyof typeof INVESTIGATION_CATEGORY_BADGE;
}
