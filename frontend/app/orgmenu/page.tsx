"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useClinicSession } from "@/hooks/use-clinic-session";
import {
  type Clinic,
  activateClinic,
  deleteClinic,
  listAllClinics,
  suspendClinic,
} from "@/lib/clinic-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Ban, Check, Trash2 } from "lucide-react";
import { RowActions } from "@/components/ui/row-actions";
import { Pagination } from "@/components/ui/pagination";
import { rowViewClick } from "@/components/ui/table-selection";
import { useRouter } from "next/navigation";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import StatsGeneric from "@/components/stats-generic";
import { formatDate } from "@/lib/datetime";
import { FAQSubscribersTable } from "@/components/org/faq-subscribers-table";

export default function OrgMenuDashboardPage() {
  const session = useClinicSession();
  const router = useRouter();
  const [items, setItems] = useState<Clinic[]>([]);
  const [activeTab, setActiveTab] = useState<"clinics" | "faq">("clinics");
  const [loading, setLoading] = useState(true);
  // Dropdown status filter was removed; stays pinned to "all".
  const [statusFilter] = useState("all");
  const [q, setQ] = useState("");
  // Debounced copy of the search term that drives the server request. `q` still
  // filters the visible rows instantly (StatsGeneric), so typing stays snappy
  // while we fire one request per pause instead of one per keystroke.
  const [serverQ, setServerQ] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Clinic | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setServerQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(() => {
    setLoading(true);
    listAllClinics({
      status: statusFilter === "all" ? undefined : statusFilter,
      q: serverQ || undefined,
      limit: 100,
    })
      .then((res) => {
        // Show every clinic on the platform. Missing email/phone values are
        // filled server-side from the clinic admin account, so there is no
        // reason to hide rows here.
        const raw: Clinic[] = res?.items ?? [];
        setItems(raw);
        // Drop stale selections when the list reloads (search/mutation).
        setSelectedIds(new Set());
      })
      .catch(() => toast.error("Failed to load clinics"))
      .finally(() => setLoading(false));
  }, [statusFilter, serverQ]);

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

  async function handleDelete(clinic: Clinic) {
    // Errors intentionally propagate to ConfirmDeleteDialog so it can show
    // the failure inline and stay open.
    await deleteClinic(clinic.clinicId);
    toast.success("Clinic deleted");
    load();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    let failed = 0;
    for (const id of ids) {
      try {
        await deleteClinic(id);
      } catch {
        failed += 1;
      }
    }
    const deleted = ids.length - failed;
    setSelectedIds(new Set());
    load();
    if (deleted > 0) {
      toast.success(`Deleted ${deleted} clinic${deleted === 1 ? "" : "s"}`);
    }
    if (failed > 0) {
      toast.error(`Failed to delete ${failed} clinic${failed === 1 ? "" : "s"}`);
    }
  }

  function toggleSelectAll() {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((c) => c.clinicId)));
    }
  }

  function toggleSelectRow(clinicId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(clinicId)) next.delete(clinicId);
      else next.add(clinicId);
      return next;
    });
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
          />
        </div>
      )}

      {/* Tab Switcher: All Clinics vs F&Q Table */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("clinics")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === "clinics"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "border border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          }`}
        >
          <span>All Clinics</span>
          <Badge
            variant={activeTab === "clinics" ? "secondary" : "outline"}
            className="text-xs"
          >
            {items.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("faq")}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === "faq"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "border border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          }`}
        >
          <span>F&Q Inquiries & Subscribers</span>
          <Badge
            variant={activeTab === "faq" ? "secondary" : "outline"}
            className="text-xs"
          >
            F&Q Table
          </Badge>
        </button>
      </div>

      {activeTab === "faq" ? (
        <FAQSubscribersTable />
      ) : (
        <>
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-primary tabular-nums">
                  {selectedIds.size} selected
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear selection
                </Button>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="h-8 gap-1.5 shadow-sm"
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="size-3.5" />
                Delete selected
              </Button>
            </div>
          )}

          <Card className="gap-0 rounded-none border py-0 ring-0 shadow-sm transition-shadow duration-200 hover:shadow-md">
        <CardHeader className="py-4">
          <CardTitle>All clinics</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              — No clinics found — adjust filters or check again later.
            </p>
          ) : (
            <div className="overflow-x-auto">
            <Table className="min-w-[740px]">
              <TableHeader>
                <TableRow className="border-b bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-10 pl-1">
                    <Checkbox
                      checked={items.length > 0 && selectedIds.size === items.length}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all clinics"
                    />
                  </TableHead>
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
                  <TableRow
                    className={`cursor-pointer transition-colors duration-150 hover:bg-muted/40 ${
                      selectedIds.has(c.clinicId) ? "bg-muted/40" : ""
                    }`}
                    key={c.clinicId}
                    onClick={rowViewClick(() => router.push(`/orgmenu/clinics/${c.clinicId}`))}
                  >
                    <TableCell className="w-10 pl-1">
                      <Checkbox
                        checked={selectedIds.has(c.clinicId)}
                        onCheckedChange={() => toggleSelectRow(c.clinicId)}
                        aria-label={`Select ${c.name}`}
                      />
                    </TableCell>
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
                      <div className="flex justify-end">
                        <RowActions
                          onDelete={() => setDeleteTarget(c)}
                          deleteLabel="Delete clinic"
                          extraBefore={[
                            ...(c.status === "active"
                              ? [
                                  {
                                    label: "Suspend",
                                    icon: <Ban className="mr-2 size-3.5 text-muted-foreground" />,
                                    onSelect: () => handleSuspend(c),
                                  },
                                ]
                              : []),
                            ...(c.status !== "active"
                              ? [
                                  {
                                    label: "Activate",
                                    icon: <Check className="mr-2 size-3.5 text-muted-foreground" />,
                                    onSelect: () => handleActivate(c),
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
        {items.length > 0 && (
          <Pagination
            page={1}
            pageSize={Math.max(items.length, 1)}
            totalItems={items.length}
            onPageChange={() => {}}
            itemLabel="clinics"
            showControls={false}
          />
        )}
      </Card>
      </>
      )}

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Delete clinic ${deleteTarget?.name ?? ""}?`}
        description="The clinic will be removed from the platform and its members will be blocked from login. Its records are retained but hidden."
        confirmLabel="Delete clinic"
        onConfirm={async () => {
          if (deleteTarget) await handleDelete(deleteTarget);
        }}
      />

      <ConfirmDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selectedIds.size} selected clinic${selectedIds.size === 1 ? "" : "s"}?`}
        description="The selected clinics will be removed from the platform and their members will be blocked from login. Their records are retained but hidden."
        confirmLabel="Delete selected"
        onConfirm={handleBulkDelete}
      />
    </div>
  );
}
