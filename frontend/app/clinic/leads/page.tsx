"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useClinicSession } from "@/hooks/use-clinic-session";
import { listLeads, type Lead } from "@/lib/clinic-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function LeadsPage() {
  const session = useClinicSession();
  const router = useRouter();
  const clinicId = session.session?.clinicId;
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!clinicId) return;
    listLeads(clinicId)
      .then((r) => setLeads(r.leads))
      .catch(() => toast.error("Failed to load leads"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    if (session.session) void load();
  }, [session.session, load]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Leads</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : leads.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No leads yet. Connect Meta Business to capture Meta Lead Ads automatically.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((l) => (
                  <TableRow key={l.leadId} className="cursor-pointer" onClick={() => router.push(`/clinic/leads/${l.leadId}`)}>
                    <TableCell className="font-medium">{l.name ?? "—"}</TableCell>
                    <TableCell><Badge className="bg-muted text-muted-foreground">{l.source}</Badge></TableCell>
                    <TableCell>{l.phone ?? "—"}</TableCell>
                    <TableCell>{l.email ?? "—"}</TableCell>
                    <TableCell><Badge>{l.status}</Badge></TableCell>
                    <TableCell>{l.priority}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">View</TableCell>
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
