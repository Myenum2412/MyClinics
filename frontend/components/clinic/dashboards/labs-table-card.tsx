"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, FlaskConical, Plus } from "lucide-react";

import { listLabs, type Lab } from "@/lib/clinic-api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PREVIEW_LIMIT = 5;

function labName(l: Lab): string {
  return l.labName ?? l.name ?? "—";
}

function LabsTableCard({ clinicId, canManage }: { clinicId: string; canManage: boolean }) {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId) return;
    let active = true;
    listLabs(clinicId)
      .then((res) => {
        if (active) setLabs((res as unknown as { items?: Lab[] })?.items ?? []);
      })
      .catch(() => {
        if (active) toast.error("Failed to load labs");
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
          <FlaskConical className="size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">Labs</h3>
            <p className="hidden text-xs text-muted-foreground sm:block">Laboratories linked to this clinic.</p>
          </div>
        </div>
        {canManage && (
          <Button size="sm" className="h-8 shrink-0 gap-1.5" render={<Link href="/clinic/labs/new" />}>
            <Plus className="size-3.5" />
            Create Lab
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
        ) : labs.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No labs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  <TableHead>Lab Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Contact</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead className="text-right pr-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labs.slice(0, PREVIEW_LIMIT).map((l) => (
                  <TableRow key={l.labId} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <FlaskConical className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <span className="block truncate font-medium text-foreground">{labName(l)}</span>
                          {l.labType ? (
                            <span className="block truncate text-[11px] text-muted-foreground sm:hidden">{l.labType}</span>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{l.contactPerson ?? "—"}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{l.phone ?? "—"}</TableCell>
                    <TableCell className="text-right pr-4">
                      <Badge variant="outline" className="capitalize">{l.status}</Badge>
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
          href="/clinic/labs"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View all labs
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </Card>
  );
}

export { LabsTableCard };
