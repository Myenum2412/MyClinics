"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useClinicSession } from "@/hooks/use-clinic-session";
import {
  listContacts,
  createContact,
  getMetaStatus,
  connectMeta,
  disconnectMeta,
  syncMetaNow,
  type Contact,
  type ListContactsInput,
  type MetaHealth,
  type MetaIntegrationPublic,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Archive,
  RotateCcw,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Sliders,
} from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import {
  RowCheckbox,
  SelectAllCheckbox,
  TableSelectionBar,
  useRowSelection,
} from "@/components/ui/table-selection";
import { cn } from "@/lib/utils";

function MetaLogo({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.98 5.09c-1.89 0-3.56.96-4.98 2.62-1.42-1.66-3.09-2.62-4.98-2.62-4.14 0-7.02 3.38-7.02 7.74 0 4.42 2.92 7.84 7.08 7.84 2.25 0 4.12-1.07 5.02-2.5 1.01 1.46 2.83 2.5 4.88 2.5 4.16 0 7.02-3.42 7.02-7.84 0-4.36-2.88-7.74-7.02-7.74zm-9.98 13.06c-2.84 0-4.78-2.38-4.78-5.32 0-2.91 1.91-5.26 4.74-5.26 1.76 0 3.24 1.02 4.47 3.09-1.29 2.2-2.73 7.49-4.43 7.49zm9.98 0c-1.74 0-3.15-5.29-4.44-7.49 1.23-2.07 2.71-3.09 4.47-3.09 2.83 0 4.74 2.35 4.74 5.26 0 2.94-1.94 5.32-4.77 5.32z" />
    </svg>
  );
}

const SOURCES = [
  "MANUAL",
  "IMPORT",
  "EMAIL",
  "CALENDAR",
  "TRACKING",
  "WEBSITE",
  "META",
] as const;

export default function ContactsPage() {
  const session = useClinicSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clinicId = session.session?.clinicId;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [facetCounts, setFacetCounts] = useState<Record<string, Record<string, number>>>({});
  const [archived, setArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [ownerFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [sort, setSort] = useState("-createdAt");
  const [creating, setCreating] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const searchParamsRef = useRef(searchParams);
  const selection = useRowSelection(contacts, (c) => c.contactId);

  // Meta Integration state
  const [metaIntegration, setMetaIntegration] = useState<MetaIntegrationPublic | null>(null);
  const [metaHealth, setMetaHealth] = useState<MetaHealth | null>(null);
  const [metaModalOpen, setMetaModalOpen] = useState(false);
  const [metaBusy, setMetaBusy] = useState(false);
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [metaAppId, setMetaAppId] = useState(process.env.NEXT_PUBLIC_META_APP_ID ?? "");
  const [metaAppSecret, setMetaAppSecret] = useState(process.env.NEXT_PUBLIC_META_APP_SECRET ?? "");
  const [showAdvancedMeta, setShowAdvancedMeta] = useState(false);

  useEffect(() => {
    searchParamsRef.current = searchParams;
  }, [searchParams]);

  const load = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    setError(null);
    try {
      const input: ListContactsInput = {
        archived: archived || undefined,
        q: search || undefined,
        ownerId: ownerFilter || undefined,
        companyId: companyFilter || undefined,
        source: sourceFilter || undefined,
        page,
        limit,
        sort,
      };
      const result = await listContacts(clinicId, input);
      setContacts(result.rows);
      setTotal(result.total);
      setFacetCounts(result.facetCounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contacts");
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [clinicId, archived, search, sourceFilter, ownerFilter, companyFilter, page, sort]);

  const loadMeta = useCallback(async () => {
    if (!clinicId) return;
    try {
      const status = await getMetaStatus(clinicId).catch(() => ({ integration: null, health: null }));
      setMetaIntegration(status.integration ?? null);
      setMetaHealth(status.health ?? null);
    } catch {
      setMetaIntegration(null);
      setMetaHealth(null);
    }
  }, [clinicId]);

  useEffect(() => {
    if (!session.session) return;
    void load();
    void loadMeta();
  }, [session.session, load, loadMeta]);

  // Listen for popup messages from Meta OAuth callback
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "META_AUTH_SUCCESS" || e.data?.type === "META_CONNECTED") {
        toast.success("Meta Business account connected successfully!");
        setMetaModalOpen(false);
        void loadMeta();
        void load();
      } else if (e.data?.type === "META_AUTH_ERROR") {
        toast.error(`Meta connection failed: ${e.data.error || "Unknown error"}`);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [loadMeta, load]);

  // Handle direct return with query param
  useEffect(() => {
    if (searchParams.get("meta") === "connected") {
      toast.success("Meta Business connected");
      router.replace("/clinic/crm/contacts");
      void loadMeta();
      void load();
    }
  }, [searchParams, router, loadMeta, load]);

  const handleConnectMeta = async () => {
    if (!clinicId) return;
    const effectiveAppId = metaAppId.trim() || process.env.NEXT_PUBLIC_META_APP_ID?.trim() || "";
    const effectiveAppSecret = metaAppSecret.trim() || process.env.NEXT_PUBLIC_META_APP_SECRET?.trim() || "";
    if ((effectiveAppId && !effectiveAppSecret) || (!effectiveAppId && effectiveAppSecret)) {
      toast.error("Provide both App ID and App Secret together.");
      return;
    }
    setMetaBusy(true);
    try {
      const { authUrl } = await connectMeta(clinicId, {
        appId: effectiveAppId || undefined,
        appSecret: effectiveAppSecret || undefined,
        returnUrl: "/clinic/crm/contacts?meta=connected",
      });
      window.open(authUrl, "metaOAuth", "width=600,height=800");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start Meta connection");
    } finally {
      setMetaBusy(false);
    }
  };

  const handleDisconnectMeta = async () => {
    if (!clinicId) return;
    if (!confirm("Disconnect Meta Business? Ingestion of new leads from Facebook and Instagram will stop.")) return;
    setMetaBusy(true);
    try {
      await disconnectMeta(clinicId);
      toast.success("Meta Business disconnected");
      await loadMeta();
      await load();
      setMetaModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect Meta");
    } finally {
      setMetaBusy(false);
    }
  };

  const handleSyncMeta = async () => {
    if (!clinicId) return;
    setSyncingMeta(true);
    try {
      await syncMetaNow(clinicId);
      toast.success("Meta leads sync initiated");
      await load();
      await loadMeta();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sync Meta leads");
    } finally {
      setSyncingMeta(false);
    }
  };

  const handleCreate = async () => {
    if (!clinicId || !newContactName.trim()) return;
    setCreating(true);
    try {
      const parts = newContactName.trim().split(" ");
      await createContact(clinicId, {
        firstName: parts[0],
        lastName: parts.slice(1).join(" ") || null,
        source: "MANUAL",
      });
      setNewContactName("");
      toast.success("Contact created");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create contact");
    } finally {
      setCreating(false);
    }
  };

  const handleArchive = async (contactId: string) => {
    if (!clinicId) return;
    try {
      await fetch(`/api/clinics/${clinicId}/crm/contacts/${contactId}/archive`, {
        method: "POST",
        credentials: "include",
      });
      toast.success("Contact archived");
      void load();
    } catch {
      toast.error("Failed to archive contact");
    }
  };

  const handleRestore = async (contactId: string) => {
    if (!clinicId) return;
    try {
      await fetch(`/api/clinics/${clinicId}/crm/contacts/${contactId}/restore`, {
        method: "POST",
        credentials: "include",
      });
      toast.success("Contact restored");
      void load();
    } catch {
      toast.error("Failed to restore contact");
    }
  };

  const handleSort = (field: string) => {
    setSort((prev) => (prev === field ? `-${field}` : field.startsWith("-") ? field.slice(1) : field));
  };

  if (!session.session) return null;

  const isMetaConnected = metaIntegration?.status === "connected";

  return (
    <div className="flex flex-col gap-4">
      {/* Top action & filter bar */}
      <Card className="border-dashed" variant="outline">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
          {/* Left search & source filter */}
          <div className="flex flex-1 flex-wrap items-center gap-2 min-w-[280px]">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
                onKeyDown={(e) => e.key === "Enter" && void load()}
              />
            </div>
            <Select
              value={sourceFilter || "ALL"}
              onValueChange={(v) => {
                setSourceFilter(v === "ALL" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Sources</SelectItem>
                <SelectItem value="META">
                  <span className="flex items-center gap-1.5 font-medium text-[#0866FF]">
                    <MetaLogo className="size-3.5" />
                    Meta Leads
                  </span>
                </SelectItem>
                <SelectItem value="MANUAL">Manual</SelectItem>
                <SelectItem value="WEBSITE">Website</SelectItem>
                <SelectItem value="IMPORT">Import</SelectItem>
                <SelectItem value="EMAIL">Email</SelectItem>
                <SelectItem value="CALENDAR">Calendar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Right actions: Meta connect button, quick contact creation, archive toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Meta Business Quick Button */}
            {isMetaConnected ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMetaModalOpen(true)}
                  className="h-9 border-emerald-200 bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100/70 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                  title="Meta Business Connected - Click to view or manage"
                >
                  <span className="size-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                  <MetaLogo className="size-3.5 mr-1.5 text-[#0866FF]" />
                  <span className="max-w-[120px] truncate">
                    {metaIntegration?.metaBusinessName || "Meta Connected"}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9"
                  onClick={handleSyncMeta}
                  disabled={syncingMeta}
                  title="Sync Meta leads now"
                >
                  <RefreshCw className={cn("size-3.5", syncingMeta && "animate-spin")} />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMetaModalOpen(true)}
                className="h-9 border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100/70 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
              >
                <MetaLogo className="size-3.5 mr-1.5 text-[#0866FF]" />
                Connect Meta
              </Button>
            )}

            <div className="hidden sm:block h-6 w-px bg-border" />

            <Input
              placeholder="New contact name"
              value={newContactName}
              onChange={(e) => setNewContactName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
              className="w-44 h-9"
            />
            <Button size="sm" className="h-9" onClick={handleCreate} disabled={creating || !newContactName.trim()}>
              <Plus className="size-4 mr-1.5" />
              {creating ? "Creating…" : "Add"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn("h-9", archived ? "bg-muted" : "")}
              onClick={() => setArchived((v) => !v)}
            >
              <Archive className="size-4 mr-1.5" />
              {archived ? "Active" : "Archived"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table Card */}
      <Card className="gap-0 rounded-none border border-border py-0 ring-0">
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Contacts</CardTitle>
              {sourceFilter && (
                <Badge variant="outline" className="text-xs">
                  Source: {sourceFilter}
                </Badge>
              )}
            </div>
            <span className="text-sm text-muted-foreground">{total} total</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={() => void load()}>
                Retry
              </Button>
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center px-4">
              {sourceFilter === "META" ? (
                <>
                  <div className="flex size-12 items-center justify-center rounded-full bg-blue-50 text-[#0866FF] dark:bg-blue-950/50">
                    <MetaLogo className="size-6" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">No Meta leads found</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      {isMetaConnected
                        ? "No leads received from Meta yet. Click 'Sync Meta' to check for recent submissions or launch an ad campaign on Meta Ads Manager."
                        : "Connect your Meta Business Account to automatically sync leads from Facebook & Instagram lead ads."}
                    </p>
                  </div>
                  {isMetaConnected ? (
                    <Button variant="outline" size="sm" onClick={handleSyncMeta} disabled={syncingMeta}>
                      <RefreshCw className={cn("size-3.5 mr-1.5", syncingMeta && "animate-spin")} />
                      Sync Meta Leads Now
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => setMetaModalOpen(true)}>
                      <MetaLogo className="size-3.5 mr-1.5" />
                      Connect Meta Business Account
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {archived ? "No archived contacts." : "No contacts yet. Add your first contact above."}
                </p>
              )}
            </div>
          ) : (
            <>
              <TableSelectionBar count={selection.selectedIds.size} onClear={selection.clear} />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 pl-4">
                      <SelectAllCheckbox
                        checked={selection.allSelected}
                        indeterminate={selection.someSelected && !selection.allSelected}
                        onCheckedChange={selection.toggleAll}
                      />
                    </TableHead>
                    <TableHead onClick={() => handleSort("name")} className="cursor-pointer">
                      Name <span className="ml-1">{sort === "name" ? <ChevronUp className="inline size-3" /> : sort === "-name" ? <ChevronDown className="inline size-3" /> : null}</span>
                    </TableHead>
                    <TableHead onClick={() => handleSort("source")} className="cursor-pointer">
                      Source <span className="ml-1">{sort === "source" ? <ChevronUp className="inline size-3" /> : sort === "-source" ? <ChevronDown className="inline size-3" /> : null}</span>
                    </TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead onClick={() => handleSort("createdAt")} className="cursor-pointer">
                      Created <span className="ml-1">{sort === "createdAt" ? <ChevronUp className="inline size-3" /> : sort === "-createdAt" ? <ChevronDown className="inline size-3" /> : null}</span>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((c) => (
                    <TableRow
                      key={c.contactId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/clinic/crm/contacts/${c.contactId}`)}
                    >
                      <TableCell className="pl-4">
                        <RowCheckbox
                          checked={selection.selectedIds.has(c.contactId)}
                          onCheckedChange={(checked) => selection.toggleOne(c.contactId, checked)}
                          label={`Select ${c.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        {c.source === "META" ? (
                          <Badge className="bg-[#0866FF]/10 text-[#0866FF] border-[#0866FF]/20 flex items-center gap-1 w-fit font-medium">
                            <MetaLogo className="size-3" /> Meta
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{c.source}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{c.phone ?? "—"}</TableCell>
                      <TableCell>{c.email ?? "—"}</TableCell>
                      <TableCell>{c.companyId ?? "—"}</TableCell>
                      <TableCell>{c.ownerId ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        {archived ? (
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); void handleRestore(c.contactId); }}>
                            <RotateCcw className="size-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); void handleArchive(c.contactId); }}>
                            <Archive className="size-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
        {contacts.length > 0 && (
          <Pagination
            page={page}
            pageSize={limit}
            totalItems={total}
            onPageChange={setPage}
            itemLabel="contacts"
          />
        )}
      </Card>

      {/* Meta Business Connection & Settings Dialog */}
      <Dialog open={metaModalOpen} onOpenChange={setMetaModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0866FF] dark:bg-blue-950/60">
                <MetaLogo className="size-5" />
              </div>
              <div>
                <DialogTitle>Meta Business Account</DialogTitle>
                <DialogDescription>
                  {isMetaConnected
                    ? "Manage your connected Meta Business Account."
                    : "Connect Facebook & Instagram to sync leads directly to CRM Contacts."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {isMetaConnected ? (
            <div className="flex flex-col gap-4 py-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                      Connected
                    </span>
                  </div>
                  <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300 text-xs">
                    {metaHealth?.status || "Healthy"}
                  </Badge>
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Business Name</span>
                    <span className="font-medium text-foreground">
                      {metaIntegration?.metaBusinessName || "—"}
                    </span>
                  </div>
                  {metaIntegration?.metaBusinessId && (
                    <div className="flex justify-between">
                      <span>Business ID</span>
                      <span className="font-mono text-foreground">
                        {metaIntegration.metaBusinessId}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Last Synced</span>
                    <span className="text-foreground">
                      {metaIntegration?.lastSyncedAt
                        ? new Date(metaIntegration.lastSyncedAt).toLocaleString()
                        : "Never"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Webhook Status</span>
                    <span className="capitalize text-foreground">
                      {metaIntegration?.webhookStatus || "Active"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleSyncMeta}
                  disabled={syncingMeta}
                  className="w-full"
                >
                  <RefreshCw className={cn("size-4 mr-2", syncingMeta && "animate-spin")} />
                  {syncingMeta ? "Syncing Meta Leads…" : "Sync Meta Leads Now"}
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSourceFilter("META");
                    setMetaModalOpen(false);
                  }}
                >
                  <Filter className="size-4 mr-2" />
                  Show Meta Leads Only
                </Button>

                {clinicId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground"
                    onClick={() => {
                      setMetaModalOpen(false);
                      router.push(`/orgmenu/clinics/${clinicId}/integrations/meta`);
                    }}
                  >
                    Campaign Mappings & Asset Settings
                    <ExternalLink className="size-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 py-2">
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200">
                <p className="font-semibold text-sm mb-1">What you get:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Automatic real-time ingestion of leads from Facebook and Instagram Lead Ads.</li>
                  <li>Attribution tracking (campaign, ad set, ad, and instant form).</li>
                  <li>Direct pipeline access to doctor assignment and follow-up.</li>
                </ul>
              </div>

              <div className="space-y-3">
                <Button
                  className="w-full bg-[#0866FF] hover:bg-[#0866FF]/90 text-white font-medium"
                  onClick={handleConnectMeta}
                  disabled={metaBusy}
                >
                  <MetaLogo className="size-4 mr-2" />
                  {metaBusy ? "Connecting…" : "Connect with Meta Business"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedMeta((v) => !v)}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  >
                    <Sliders className="size-3" />
                    {showAdvancedMeta ? "Hide custom app credentials" : "Use custom Meta App ID / Secret"}
                  </button>
                </div>

                {showAdvancedMeta && (
                  <div className="space-y-2.5 rounded-lg border p-3 bg-muted/30">
                    <div className="space-y-1">
                      <Label htmlFor="meta-app-id" className="text-xs">
                        Meta App ID (Optional)
                      </Label>
                      <Input
                        id="meta-app-id"
                        placeholder="e.g. 1029384756"
                        value={metaAppId}
                        onChange={(e) => setMetaAppId(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="meta-app-secret" className="text-xs">
                        Meta App Secret (Optional)
                      </Label>
                      <Input
                        id="meta-app-secret"
                        type="password"
                        placeholder="••••••••••••"
                        value={metaAppSecret}
                        onChange={(e) => setMetaAppSecret(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Leave empty to use server default credentials.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-2">
            {isMetaConnected ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 text-xs"
                onClick={handleDisconnectMeta}
                disabled={metaBusy}
              >
                Disconnect Meta
              </Button>
            ) : (
              <div />
            )}
            <Button variant="outline" size="sm" onClick={() => setMetaModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
