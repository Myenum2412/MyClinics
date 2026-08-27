"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useClinicSession } from "@/hooks/use-clinic-session";
import {
  connectMeta,
  getMetaStatus,
  listLeads,
  type Lead,
  type MetaIntegrationPublic,
} from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
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
  const [error, setError] = useState<string | null>(null);
  const [integration, setIntegration] = useState<MetaIntegrationPublic | null>(null);
  const [busy, setBusy] = useState(false);
  const metaChecked = useRef(false);

  const load = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    setError(null);
    try {
      const [status, r] = await Promise.all([
        getMetaStatus(clinicId).catch(() => null),
        listLeads(clinicId),
      ]);
      setIntegration(status?.integration ?? null);
      setLeads(r.leads);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads");
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
      metaChecked.current = true;
    }
  }, [clinicId]);

  useEffect(() => {
    if (!session.session) return;
    void (async () => {
      await load();
    })();
  }, [session.session, load]);

  // When the OAuth popup returns focus to this window, refresh status.
  useEffect(() => {
    const onFocus = () => {
      if (clinicId) void load();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [clinicId, load]);

  async function handleConnect() {
    if (!clinicId) return;
    try {
      setBusy(true);
      const { authUrl } = await connectMeta(clinicId);
      window.open(authUrl, "metaOAuth", "width=600,height=800");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start Meta connection");
    } finally {
      setBusy(false);
    }
  }

  const connected = integration?.status === "connected";

  return (
    <div className="flex flex-col gap-4">
      {!loading && !connected && (
        <Card className="border-dashed">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-sm text-muted-foreground">
              Connect Meta Business to automatically capture leads from Meta Lead Ads.
            </p>
            <Button onClick={handleConnect} disabled={busy}>
              {busy ? "Connecting…" : "Connect Meta Business"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Leads</CardTitle>
            {loading && <Skeleton className="h-5 w-24" />}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={() => void load()}>Retry</Button>
            </div>
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
