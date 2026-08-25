"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useClinicSession } from "@/hooks/use-clinic-session";
import {
  type Clinic,
  type Patient,
  activateClinic,
  getAnyClinic,
  listPatients,
  suspendClinic,
} from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/datetime";

export default function OrgClinicDetailPage() {
  const session = useClinicSession();
  const { clinicId } = useParams<{ clinicId: string }>();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPatients, setLoadingPatients] = useState(true);

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    getAnyClinic(clinicId)
      .then(setClinic)
      .catch(() => toast.error("Failed to load clinic"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  const loadPatients = useCallback(() => {
    if (!clinicId) return;
    setLoadingPatients(true);
    listPatients(clinicId, { limit: 100 })
      .then((res) => setPatients(res.items))
      .catch(() => toast.error("Failed to load patients"))
      .finally(() => setLoadingPatients(false));
  }, [clinicId]);

  useEffect(() => {
    if (session.session) {
      load();
      loadPatients();
    }
  }, [session.session, load, loadPatients]);

  async function handleSuspend() {
    if (!clinic) return;
    if (!confirm(`Suspend ${clinic.name}? Its members will be blocked from login.`)) return;
    try {
      await suspendClinic(clinic.clinicId);
      toast.success("Clinic suspended");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to suspend clinic");
    }
  }

  async function handleActivate() {
    if (!clinic) return;
    try {
      await activateClinic(clinic.clinicId);
      toast.success("Clinic activated");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to activate clinic");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>{loading ? "Loading..." : clinic?.name}</CardTitle>
              {clinic && (
                <p className="mt-1 font-mono text-xs text-muted-foreground">{clinic.clinicId}</p>
              )}
            </div>
            {clinic && (
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    clinic.status === "active"
                      ? "bg-success/10 text-success"
                      : clinic.status === "suspended"
                        ? "bg-warning/10 text-warning"
                        : "bg-muted text-muted-foreground"
                  }
                >
                  {clinic.status}
                </Badge>
                {clinic.status === "active" ? (
                  <Button variant="outline" size="sm" onClick={handleSuspend}>
                    Suspend
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={handleActivate}>
                    Activate
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading || !clinic ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          ) : (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Email</dt>
                <dd>{clinic.email ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Phone</dt>
                <dd>{clinic.phone ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Address</dt>
                <dd>{clinic.address ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Website</dt>
                <dd>{clinic.website ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Created</dt>
                <dd>{formatDate(clinic.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Working hours</dt>
                <dd>
                  {clinic.settings.workingHours.open}–{clinic.settings.workingHours.close}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Currency</dt>
                <dd>{clinic.settings.currency}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Timezone</dt>
                <dd>{clinic.settings.timezone}</dd>
              </div>
              {clinic.description && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Description</dt>
                  <dd className="mt-1">{clinic.description}</dd>
                </div>
              )}
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Patients</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPatients ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : patients.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No patients in this clinic.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((p) => (
                  <TableRow key={p.patientId}>
                    <TableCell className="font-medium">{p.fullName}</TableCell>
                    <TableCell>{p.mobile}</TableCell>
                    <TableCell>{p.email ?? "—"}</TableCell>
                    <TableCell>{p.doctorId ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          p.status === "active"
                            ? "bg-success/10 text-success"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {p.status}
                      </Badge>
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
