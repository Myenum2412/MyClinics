"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Plus, Stethoscope } from "lucide-react";

import { listDoctors, type Doctor } from "@/lib/clinic-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PersonAvatar } from "@/components/clinic/person-avatar";

const PREVIEW_LIMIT = 5;

function DoctorsTableCard({ clinicId, canManage }: { clinicId: string; canManage: boolean }) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId) return;
    let active = true;
    listDoctors(clinicId, { limit: PREVIEW_LIMIT })
      .then((res) => {
        if (active) setDoctors((res as unknown as { items?: Doctor[] })?.items ?? []);
      })
      .catch(() => {
        if (active) toast.error("Failed to load doctors");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [clinicId]);

  return (
    <Card className="flex flex-col border-border shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/20 px-4 py-3.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Stethoscope className="size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">Doctors</h3>
            <p className="hidden text-xs text-muted-foreground sm:block">Doctors registered at this clinic.</p>
          </div>
        </div>
        {canManage && (
          <Button size="sm" className="h-8 shrink-0 gap-1.5" render={<Link href="/clinic/doctors" />}>
            <Plus className="size-3.5" />
            Add Doctor
          </Button>
        )}
      </div>

      <CardContent className="p-0">
        {loading ? (
          <div className="space-y-3 p-4 sm:p-6">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : doctors.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No doctors found.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Specialization</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead className="text-right pr-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctors.slice(0, PREVIEW_LIMIT).map((d) => (
                  <TableRow key={d.doctorId} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <PersonAvatar clinicId={clinicId} ownerType="doctor" ownerId={d.doctorId} name={d.name} />
                        <div className="min-w-0">
                          <span className="block truncate font-medium text-foreground">{d.name}</span>
                          <span className="block truncate text-[11px] text-muted-foreground sm:hidden">{d.specialization}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{d.specialization}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{d.phone ?? "—"}</TableCell>
                    <TableCell className="text-right pr-4">
                      <Badge
                        className={
                          d.status === "active"
                            ? "bg-success/10 text-success border-success/25 hover:bg-success/10"
                            : "bg-muted text-muted-foreground border-border hover:bg-muted"
                        }
                        variant="outline"
                      >
                        {d.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <div className="mt-auto flex items-center justify-end border-t border-border px-4 py-2.5 sm:px-6">
        <Link
          href="/clinic/doctors"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View all doctors
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </Card>
  );
}

export { DoctorsTableCard };
