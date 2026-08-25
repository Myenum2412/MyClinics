"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useClinicSession } from "@/hooks/use-clinic-session";
import {
  type Clinic,
  activateClinic,
  listAllClinics,
  suspendClinic,
} from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import StatsGeneric from "@/components/stats-generic";
import { formatDate } from "@/lib/datetime";

export default function OrgMenuDashboardPage() {
  const session = useClinicSession();
  const [items, setItems] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    listAllClinics({
      status: statusFilter === "all" ? undefined : statusFilter,
      q: q || undefined,
      limit: 100,
    })
      .then((res) => setItems(res.items))
      .catch(() => toast.error("Failed to load clinics"))
      .finally(() => setLoading(false));
  }, [statusFilter, q]);

  useEffect(() => {
    if (session.session) load();
  }, [session.session, load]);

  async function handleSuspend(clinic: Clinic) {
    if (!confirm(`Suspend ${clinic.name}? Its members will be blocked from login.`)) return;
    try {
      await suspendClinic(clinic.clinicId);
      toast.success("Clinic suspended");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to suspend clinic");
    }
  }

  async function handleActivate(clinic: Clinic) {
    try {
      await activateClinic(clinic.clinicId);
      toast.success("Clinic activated");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to activate clinic");
    }
  }

  const totalClinics = items.length;
  const activeCount = items.filter((c) => c.status === "active").length;
  const suspendedCount = items.filter((c) => c.status === "suspended").length;

  const orgStatsItems = [
    {
      name: "Total Clinics",
      percentage: Math.min(100, Math.round((totalClinics / 20) * 100)),
      current: totalClinics,
      allowed: 20,
      allowedLabel: "target",
      fill: "var(--chart-1)",
    },
    {
      name: "Active Clinics",
      percentage: totalClinics ? Math.round((activeCount / totalClinics) * 100) : 0,
      current: activeCount,
      allowed: totalClinics,
      allowedLabel: "total clinics",
      fill: "var(--chart-2)",
    },
    {
      name: "Suspended Clinics",
      percentage: totalClinics ? Math.round((suspendedCount / totalClinics) * 100) : 0,
      current: suspendedCount,
      allowed: totalClinics,
      allowedLabel: "total clinics",
      fill: "var(--chart-3)",
    },
    {
      name: "System Capacity",
      percentage: 100,
      current: totalClinics,
      allowed: 100,
      allowedLabel: "max clinics",
      fill: "var(--chart-4)",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {!loading && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <StatsGeneric
            title="Organization Clinics"
            description="Every clinic deployed on the platform, its account status, and system insights."
            items={orgStatsItems}
            searchTerm={q}
            onSearchChange={setQ}
            searchPlaceholder="Search clinic name, admin, email..."
            action={
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
                  <SelectTrigger className="h-9 w-36">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All clinics</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No clinics found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead>Clinic</TableHead>
                  <TableHead>Clinic ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.clinicId}>
                    <TableCell>
                      <Link
                        href={`/orgmenu/clinics/${c.clinicId}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{c.clinicId}</TableCell>
                    <TableCell>{c.email ?? "—"}</TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    <TableCell>{formatDate(c.createdAt)}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          c.status === "active"
                            ? "bg-success/10 text-success"
                            : c.status === "suspended"
                              ? "bg-warning/10 text-warning"
                              : "bg-muted text-muted-foreground"
                        }
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {c.status === "active" ? (
                        <Button variant="ghost" size="sm" onClick={() => handleSuspend(c)}>
                          Suspend
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => handleActivate(c)}>
                          Activate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
