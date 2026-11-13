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
  ChevronDown,
  ChevronUp,
  Archive,
  RotateCcw,
  RefreshCw,
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
    <svg preserveAspectRatio="xMidYMid" viewBox="0 0 256 171" className={className}>
      <defs>
        <linearGradient id="meta__a" x1="13.878%" x2="89.144%" y1="55.934%" y2="58.694%">
          <stop offset="0%" stopColor="#0064E1" />
          <stop offset="40%" stopColor="#0064E1" />
          <stop offset="83%" stopColor="#0073EE" />
          <stop offset="100%" stopColor="#0082FB" />
        </linearGradient>
        <linearGradient id="meta__b" x1="54.315%" x2="54.315%" y1="82.782%" y2="39.307%">
          <stop offset="0%" stopColor="#0082FB" />
          <stop offset="100%" stopColor="#0064E0" />
        </linearGradient>
      </defs>
      <path
        fill="#0081FB"
        d="M27.651 112.136c0 9.775 2.146 17.28 4.95 21.82 3.677 5.947 9.16 8.466 14.751 8.466 7.211 0 13.808-1.79 26.52-19.372 10.185-14.092 22.186-33.874 30.26-46.275l13.675-21.01c9.499-14.591 20.493-30.811 33.1-41.806C161.196 4.985 172.298 0 183.47 0c18.758 0 36.625 10.87 50.3 31.257C248.735 53.584 256 81.707 256 110.729c0 17.253-3.4 29.93-9.187 39.946-5.591 9.686-16.488 19.363-34.818 19.363v-27.616c15.695 0 19.612-14.422 19.612-30.927 0-23.52-5.484-49.623-17.564-68.273-8.574-13.23-19.684-21.313-31.907-21.313-13.22 0-23.859 9.97-35.815 27.75-6.356 9.445-12.882 20.956-20.208 33.944l-8.066 14.289c-16.203 28.728-20.307 35.271-28.408 46.07-14.2 18.91-26.324 26.076-42.287 26.076-18.935 0-30.91-8.2-38.325-20.556C2.973 139.413 0 126.202 0 111.148l27.651.988Z"
      />
      <path
        fill="url(#meta__a)"
        d="M21.802 33.206C34.48 13.666 52.774 0 73.757 0 85.91 0 97.99 3.597 110.605 13.897c13.798 11.261 28.505 29.805 46.853 60.368l6.58 10.967c15.881 26.459 24.917 40.07 30.205 46.49 6.802 8.243 11.565 10.7 17.752 10.7 15.695 0 19.612-14.422 19.612-30.927l24.393-.766c0 17.253-3.4 29.93-9.187 39.946-5.591 9.686-16.488 19.363-34.818 19.363-11.395 0-21.49-2.475-32.654-13.007-8.582-8.083-18.615-22.443-26.334-35.352l-22.96-38.352C118.528 64.08 107.96 49.73 101.845 43.23c-6.578-6.988-15.036-15.428-28.532-15.428-10.923 0-20.2 7.666-27.963 19.39L21.802 33.206Z"
      />
      <path
        fill="url(#meta__b)"
        d="M73.312 27.802c-10.923 0-20.2 7.666-27.963 19.39-10.976 16.568-17.698 41.245-17.698 64.944 0 9.775 2.146 17.28 4.95 21.82L9.027 149.482C2.973 139.413 0 126.202 0 111.148 0 83.772 7.514 55.24 21.802 33.206 34.48 13.666 52.774 0 73.757 0l-.445 27.802Z"
      />
    </svg>
  );
}

export default function ContactsPage() {
  const session = useClinicSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const clinicId = session.session?.clinicId;
  const userRole = session.session?.role;
  const canManageMeta = userRole === "clinic_admin" || userRole === "platform_admin";

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
  const [metaAppId, setMetaAppId] = useState("");
  const [metaAppSecret, setMetaAppSecret] = useState("");

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
    if (!clinicId || !canManageMeta) return;
    try {
      const status = await getMetaStatus(clinicId).catch(() => ({ integration: null, health: null }));
      setMetaIntegration(status.integration ?? null);
      setMetaHealth(status.health ?? null);
    } catch {
      setMetaIntegration(null);
      setMetaHealth(null);
    }
  }, [clinicId, canManageMeta]);

  useEffect(() => {
    if (!session.session) return;
    void load();
    if (canManageMeta) void loadMeta();
  }, [session.session, load, loadMeta, canManageMeta]);

  // Listen for popup messages from Meta OAuth callback
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "META_AUTH_SUCCESS" || e.data?.type === "META_CONNECTED") {
        toast.success("Meta connected successfully");
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
      toast.success("Meta connected");
      router.replace("/clinic/crm/contacts");
      void loadMeta();
      void load();
    }
  }, [searchParams, router, loadMeta, load]);

  const handleConnectMeta = async () => {
    if (!clinicId) return;
    const trimmedAppId = metaAppId.trim();
    const trimmedAppSecret = metaAppSecret.trim();

    if (!trimmedAppId || !trimmedAppSecret) {
      toast.error("Please enter both your Meta App ID and App Secret.");
      return;
    }

    setMetaBusy(true);
    try {
      const { authUrl } = await connectMeta(clinicId, {
        appId: trimmedAppId,
        appSecret: trimmedAppSecret,
        redirectUri: "https://api.myclinic.myenum.in/api/meta/oauth/callback",
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
    if (!confirm("Disconnect Meta? Ingestion of new leads will stop.")) return;
    setMetaBusy(true);
    try {
      await disconnectMeta(clinicId);
      toast.success("Meta disconnected");
      await loadMeta();
      await load();
      setMetaModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setMetaBusy(false);
    }
  };

  const handleSyncMeta = async () => {
    if (!clinicId) return;
    setSyncingMeta(true);
    try {
      await syncMetaNow(clinicId);
      toast.success("Syncing leads from Meta");
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
      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
          {/* Search & source filter */}
          <div className="flex flex-1 flex-wrap items-center gap-2 min-w-[260px]">
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
                setSourceFilter((v === "ALL" ? "" : v) ?? "");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Sources</SelectItem>
                <SelectItem value="META">
                  <span className="flex items-center gap-1.5 font-medium text-[#0081FB]">
                    <MetaLogo className="w-3.5 h-auto" />
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

          {/* Right actions: Meta connect (admin only), Add contact, Archive toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {canManageMeta && (
              isMetaConnected ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMetaModalOpen(true)}
                    className="h-9 border-emerald-200 bg-emerald-50/60 text-emerald-800 hover:bg-emerald-100/70 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
                  >
                    <span className="size-2 rounded-full bg-emerald-500 mr-2" />
                    <MetaLogo className="w-3.5 h-auto mr-1.5" />
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
                    title="Sync Meta leads"
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
                  <MetaLogo className="w-3.5 h-auto mr-1.5" />
                  Connect Meta
                </Button>
              )
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
                  {sourceFilter}
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
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center px-4">
              <p className="text-sm text-muted-foreground">
                {sourceFilter === "META"
                  ? "No Meta leads found."
                  : archived
                  ? "No archived contacts."
                  : "No contacts yet."}
              </p>
              {sourceFilter === "META" && canManageMeta && !isMetaConnected && (
                <Button size="sm" variant="outline" onClick={() => setMetaModalOpen(true)}>
                  <MetaLogo className="w-3.5 h-auto mr-1.5" />
                  Connect Meta
                </Button>
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
                          <Badge className="bg-[#0081FB]/10 text-[#0081FB] border-[#0081FB]/20 flex items-center gap-1 w-fit font-medium">
                            <MetaLogo className="w-3 h-auto" /> Meta
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

      {/* Meta Connection Dialog - Only shown to clinic admins */}
      {canManageMeta && (
        <Dialog open={metaModalOpen} onOpenChange={setMetaModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <MetaLogo className="w-7 h-auto shrink-0" />
                <div>
                  <DialogTitle>Connect Meta</DialogTitle>
                  <DialogDescription>
                    {isMetaConnected
                      ? "Manage your connected Meta account."
                      : "Connect Facebook and Instagram to import leads into your contacts."}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {isMetaConnected ? (
              <div className="space-y-4 py-2">
                <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">
                      Connected
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Account</span>
                    <span className="font-medium text-foreground">
                      {metaIntegration?.metaBusinessName || "Connected"}
                    </span>
                  </div>
                  {metaIntegration?.lastSyncedAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Last synced</span>
                      <span>{new Date(metaIntegration.lastSyncedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Button onClick={handleSyncMeta} disabled={syncingMeta}>
                    <RefreshCw className={cn("size-4 mr-2", syncingMeta && "animate-spin")} />
                    {syncingMeta ? "Syncing..." : "Sync Leads Now"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSourceFilter("META");
                      setMetaModalOpen(false);
                    }}
                  >
                    View Meta Leads
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <Label htmlFor="meta-app-id">Meta App ID</Label>
                  <Input
                    id="meta-app-id"
                    placeholder="Enter App ID"
                    value={metaAppId}
                    onChange={(e) => setMetaAppId(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="meta-app-secret">Meta App Secret</Label>
                  <Input
                    id="meta-app-secret"
                    type="password"
                    placeholder="Enter App Secret"
                    value={metaAppSecret}
                    onChange={(e) => setMetaAppSecret(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full bg-[#0081FB] hover:bg-[#0073EE] text-white mt-2"
                  onClick={handleConnectMeta}
                  disabled={metaBusy}
                >
                  <MetaLogo className="w-4 h-auto mr-2" />
                  {metaBusy ? "Connecting..." : "Connect with Meta"}
                </Button>
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
                  Disconnect
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
      )}
    </div>
  );
}
