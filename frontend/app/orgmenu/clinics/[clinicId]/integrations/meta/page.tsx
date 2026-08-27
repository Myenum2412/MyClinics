"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useClinicSession } from "@/hooks/use-clinic-session";
import {
  connectMeta,
  disconnectMeta,
  getMetaAssets,
  getMetaAnalytics,
  getMetaStatus,
  listCampaignMappings,
  listMetaSyncJobs,
  listMetaWebhookEvents,
  reconnectMeta,
  syncMetaNow,
  type MetaAnalytics,
  type MetaAssets,
  type MetaCampaignMapping,
  type MetaHealth,
  type MetaIntegrationPublic,
  type MetaSyncJob,
  type MetaWebhookEvent,
  upsertCampaignMapping,
  deleteCampaignMapping,
  retryMetaWebhooks,
} from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function StatusBadge({ status }: { status: string }) {
  const ok = status === "connected" || status === "active" || status === "healthy";
  const warn = status === "expired" || status === "reauthorization_required" || status === "error";
  return (
    <Badge className={ok ? "bg-success/10 text-success" : warn ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"}>
      {status}
    </Badge>
  );
}

export default function MetaIntegrationPage() {
  const session = useClinicSession();
  const { clinicId } = useParams<{ clinicId: string }>();
  const router = useRouter();
  const search = useSearchParams();

  const [integration, setIntegration] = useState<MetaIntegrationPublic | null>(null);
  const [health, setHealth] = useState<MetaHealth | null>(null);
  const [assets, setAssets] = useState<MetaAssets | null>(null);
  const [mappings, setMappings] = useState<MetaCampaignMapping[]>([]);
  const [jobs, setJobs] = useState<MetaSyncJob[]>([]);
  const [events, setEvents] = useState<MetaWebhookEvent[]>([]);
  const [analytics, setAnalytics] = useState<MetaAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!clinicId) return;
    try {
      const [status, a, m, j, e, an] = await Promise.all([
        getMetaStatus(clinicId),
        getMetaAssets(clinicId).catch(() => null),
        listCampaignMappings(clinicId).catch(() => ({ mappings: [] })),
        listMetaSyncJobs(clinicId).catch(() => ({ jobs: [] })),
        listMetaWebhookEvents(clinicId).catch(() => ({ events: [] })),
        getMetaAnalytics(clinicId).catch(() => null),
      ]);
      setIntegration(status.integration);
      setHealth(status.health);
      setAssets(a);
      setMappings(m.mappings);
      setJobs(j.jobs);
      setEvents(e.events);
      setAnalytics(an);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load Meta integration");
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    if (!session.session) return;
    void (async () => {
      await load();
    })();
  }, [session.session, load]);

  // After returning from Meta OAuth, the URL carries ?meta=connected.
  useEffect(() => {
    if (search.get("meta") === "connected") {
      toast.success("Meta Business connected");
      router.replace(`/orgmenu/clinics/${clinicId}/integrations/meta`);
      void (async () => {
        await load();
      })();
    }
  }, [search, clinicId, router, load]);

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

  async function handleReconnect() {
    if (!clinicId) return;
    try {
      setBusy(true);
      const { authUrl } = await reconnectMeta(clinicId);
      window.open(authUrl, "metaOAuth", "width=600,height=800");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reconnect Meta");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    if (!clinicId) return;
    if (!confirm("Disconnect Meta Business? Previously imported leads and attribution are preserved, but new lead ingestion stops.")) return;
    try {
      setBusy(true);
      await disconnectMeta(clinicId);
      toast.success("Meta Business disconnected");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setBusy(false);
    }
  }

  async function handleSyncNow() {
    if (!clinicId) return;
    try {
      setBusy(true);
      await syncMetaNow(clinicId);
      toast.success("Synchronization started");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleRetry() {
    if (!clinicId) return;
    try {
      const r = await retryMetaWebhooks(clinicId);
      toast.success(`Retried ${r.retried} webhook event(s)`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Retry failed");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const connected = integration?.status === "connected";

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Meta Business Integration</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Clinic-specific, tenant-isolated connection to Meta Business, Facebook Pages, Instagram, Lead Ads and WhatsApp.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!connected ? (
                <Button onClick={handleConnect} disabled={busy}>
                  Connect Meta Business
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleReconnect} disabled={busy}>
                    Reconnect
                  </Button>
                  <Button variant="destructive" onClick={handleDisconnect} disabled={busy}>
                    Disconnect
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoTile label="Connection">
              {integration ? <StatusBadge status={integration.status} /> : <span className="text-muted-foreground">Not connected</span>}
            </InfoTile>
            <InfoTile label="Business">
              {integration?.metaBusinessName ?? <span className="text-muted-foreground">—</span>}
            </InfoTile>
            <InfoTile label="Webhook">
              {integration ? <StatusBadge status={integration.webhookStatus} /> : <span className="text-muted-foreground">—</span>}
            </InfoTile>
            <InfoTile label="Last Sync">{integration?.lastSyncedAt ? new Date(integration.lastSyncedAt).toLocaleString() : "—"}</InfoTile>
            <InfoTile label="Token Expires">
              {integration?.tokenExpiresAt ? new Date(integration.tokenExpiresAt).toLocaleString() : "—"}
            </InfoTile>
            <InfoTile label="Health">
              {health ? <StatusBadge status={health.status} /> : "—"}
            </InfoTile>
          </div>
          {health && health.issues.length > 0 && (
            <div className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
              <p className="font-medium">Attention required</p>
              <ul className="mt-1 list-disc pl-5">
                {health.issues.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="assets">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="assets">Connected Assets</TabsTrigger>
          <TabsTrigger value="campaigns">Campaign Routing</TabsTrigger>
          <TabsTrigger value="sync">Synchronization</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="assets">
          <AssetTable title="Facebook Pages" rows={assets?.pages ?? []} columns={[["Page", "pageName"], ["ID", "pageId"], ["Status", "status"]]} />
          <AssetTable title="Instagram Accounts" rows={assets?.instagram ?? []} columns={[["Username", "username"], ["Name", "name"], ["Status", "status"]]} />
          <AssetTable title="Ad Accounts" rows={assets?.adAccounts ?? []} columns={[["Name", "name"], ["Account ID", "accountId"], ["Currency", "currency"], ["Status", "status"]]} />
          <AssetTable title="Lead Forms" rows={assets?.leadForms ?? []} columns={[["Form", "formName"], ["Page", "metaPageId"], ["Status", "status"]]} />
          <AssetTable title="WhatsApp Business" rows={assets?.whatsapp ?? []} columns={[["Name", "name"], ["Phone ID", "phoneNumberId"], ["Status", "status"]]} />
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>Campaign → Clinic Routing</CardTitle>
            </CardHeader>
            <CardContent>
              {mappings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No campaign mappings configured.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.map((m) => (
                      <TableRow key={m.mappingId}>
                        <TableCell>{m.metaCampaignName ?? m.metaCampaignId}</TableCell>
                        <TableCell>{m.department ?? "—"}</TableCell>
                        <TableCell>{m.service ?? "—"}</TableCell>
                        <TableCell>{m.team ?? "—"}</TableCell>
                        <TableCell>{m.doctorId ?? "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={async () => { await deleteCampaignMapping(clinicId!, m.mappingId); toast.success("Mapping removed"); void load(); }}>
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <Button className="mt-3" size="sm" onClick={async () => {
                const id = prompt("Meta Campaign ID (stable id):");
                if (!id) return;
                try {
                  await upsertCampaignMapping(clinicId!, { metaCampaignId: id, metaCampaignName: prompt("Campaign name (optional):") || null });
                  toast.success("Mapping saved");
                  void load();
                } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
              }}>
                Add Campaign Mapping
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Synchronization</CardTitle>
                <Button onClick={handleSyncNow} disabled={busy || !connected}>Sync now</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {jobs[0] && (
                  <>
                    <Stat label="Found" value={jobs[0].found} />
                    <Stat label="Imported" value={jobs[0].imported} />
                    <Stat label="Duplicates" value={jobs[0].duplicates} />
                    <Stat label="Failed" value={jobs[0].failed} />
                  </>
                )}
              </div>
              <Table className="mt-3">
                <TableHeader>
                  <TableRow>
                    <TableHead>Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Found</TableHead>
                    <TableHead>Imported</TableHead>
                    <TableHead>Duplicates</TableHead>
                    <TableHead>Failed</TableHead>
                    <TableHead>Finished</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((j) => (
                    <TableRow key={j.syncJobId}>
                      <TableCell>{j.mode}</TableCell>
                      <TableCell><StatusBadge status={j.status} /></TableCell>
                      <TableCell>{j.found}</TableCell>
                      <TableCell>{j.imported}</TableCell>
                      <TableCell>{j.duplicates}</TableCell>
                      <TableCell>{j.failed}</TableCell>
                      <TableCell>{j.finishedAt ? new Date(j.finishedAt).toLocaleString() : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Webhook Events</CardTitle>
                <Button variant="outline" size="sm" onClick={handleRetry} disabled={busy}>Retry failed</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e) => (
                    <TableRow key={e.eventId}>
                      <TableCell className="font-mono text-xs">{e.eventId}</TableCell>
                      <TableCell>{e.eventType}</TableCell>
                      <TableCell><StatusBadge status={e.status} /></TableCell>
                      <TableCell>{e.attempts}</TableCell>
                      <TableCell className="text-xs text-warning">{e.lastError ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader><CardTitle>Meta Performance Analytics</CardTitle></CardHeader>
            <CardContent>
              {analytics ? (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Stat label="Meta Leads" value={analytics.totalMetaLeads} />
                    <Stat label="Appointments" value={analytics.appointmentsGenerated} />
                    <Stat label="Converted" value={analytics.convertedLeads} />
                    <Stat label="Conv. Rate" value={`${analytics.conversionRate}%`} />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Leads by platform: Facebook {analytics.byPlatform.facebook} · Instagram {analytics.byPlatform.instagram} · Unknown {analytics.byPlatform.unknown}
                  </p>
                  <Table className="mt-3">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Leads</TableHead>
                        <TableHead>Appointments</TableHead>
                        <TableHead>Converted</TableHead>
                        <TableHead>Conversion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.byCampaign.map((c) => (
                        <TableRow key={c.campaignId ?? "unknown"}>
                          <TableCell>{c.campaignName ?? c.campaignId ?? "Unknown"}</TableCell>
                          <TableCell>{c.leads}</TableCell>
                          <TableCell>{c.appointments}</TableCell>
                          <TableCell>{c.converted}</TableCell>
                          <TableCell>{c.conversionRate}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Cost-per-lead / appointment / conversion are shown only when Meta ad-cost data has been retrieved; this integration does not fabricate those figures.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No analytics available yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-semibold">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function AssetTable({ title, rows, columns }: { title: string; rows: Array<Record<string, unknown>>; columns: Array<[string, string]> }) {
  return (
    <Card className="mt-3">
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">None connected.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map(([label]) => <TableHead key={label}>{label}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  {columns.map(([, key]) => (
                    <TableCell key={key}>{String(r[key] ?? "—")}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
