"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { type AuditLogEntry, listAuditLogs } from "@/lib/clinic-api";
import StatsGeneric from "@/components/stats-generic";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Pagination } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import {
  Columns,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}


export default function AuditLogsPage() {
  const session = useRequireRole("clinic_admin");
  const clinicId = session?.clinicId ?? "";
  
  // Core States
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");

  // Table options (selection, visibility, pagination)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns] = useState<Record<string, boolean>>({
    select: true,
    createdAt: true,
    actorUserId: true,
    action: true,
    entity: true,
    entityId: true,
    metadata: true,
  });

  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 10;

  const load = useCallback(() => {
    if (!clinicId) return;
    listAuditLogs(clinicId, {
      entity: entity || undefined,
      action: action || undefined,
      limit: 50,
    })
      .then((res) => {
        setItems(res.items);
        setSelectedIds(new Set());
        setPageIndex(0);
      })
      .catch(() => toast.error("Failed to load audit logs"))
      .finally(() => setLoading(false));
  }, [clinicId, entity, action]);

  useEffect(() => {
    load();
  }, [load]);

  // Row Selection logic
  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedItems.map((a) => a.auditId));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelectRow = (auditId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(auditId);
      } else {
        next.delete(auditId);
      }
      return next;
    });
  };

  // Bulk actions
  const handleBulkExport = () => {
    const selectedRows = items.filter((a) => selectedIds.has(a.auditId));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedRows, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `audit_logs_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(`Exported ${selectedIds.size} audit entries.`);
  };

  // Pagination
  const paginatedItems = useMemo(() => {
    const start = pageIndex * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, pageIndex]);

  const pageCount = Math.ceil(items.length / pageSize);

  const auditStatsItems = [
    {
      name: 'Total Logs',
      percentage: Math.min(100, Math.round((items.length / 50) * 100)),
      current: items.length,
      allowed: 50,
      allowedLabel: 'target',
      fill: 'var(--chart-1)',
    },
    {
      name: 'System Mutations',
      percentage: items.length ? Math.round((items.filter((i) => i.action !== 'READ').length / items.length) * 100) : 0,
      current: items.filter((i) => i.action !== 'READ').length,
      allowed: items.length,
      allowedLabel: 'total events',
      fill: 'var(--chart-2)',
    },
    {
      name: 'Security Checks',
      percentage: 100,
      current: items.length,
      allowed: items.length,
      allowedLabel: 'audited',
      fill: 'var(--chart-3)',
    },
    {
      name: 'Active Entities',
      percentage: Math.min(100, Math.round((new Set(items.map((i) => i.entity)).size / 10) * 100)),
      current: new Set(items.map((i) => i.entity)).size,
      allowed: 10,
      allowedLabel: 'entities',
      fill: 'var(--chart-4)',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header Section with StatsGeneric */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <StatsGeneric
          title="Audit Log Analytics"
          description="Security audit trail, administrative actions, and data mutation logs."
          items={auditStatsItems}
          searchTerm={entity}
          onSearchChange={(v) => {
            setEntity(v);
            setPageIndex(0);
          }}
          searchPlaceholder="Search entity, action, actor..."
          action={
            <div className="flex items-center gap-2">
              <Input
                placeholder="Action filter"
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setPageIndex(0);
                }}
                className="h-9 w-32"
              />
            </div>
          }
        />
      </div>

      {/* Bulk actions bar if selected */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 shadow-sm transition-all animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary tabular-nums">
              {selectedIds.size} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-muted-foreground hover:text-foreground text-xs"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear selection
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 shadow-sm"
              onClick={handleBulkExport}
            >
              <Download className="size-3.5 text-muted-foreground" />
              Export Selected
            </Button>
          </div>
        </div>
      )}

      {/* Main card containing listing */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No audit entries found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                  {visibleColumns.select && (
                    <TableHead className="w-12 pl-6">
                      <Checkbox
                        checked={
                          paginatedItems.length > 0 &&
                          paginatedItems.every((a) => selectedIds.has(a.auditId))
                        }
                        onCheckedChange={(checked) => handleToggleSelectAll(!!checked)}
                      />
                    </TableHead>
                  )}
                  {visibleColumns.createdAt && (
                    <TableHead>Time</TableHead>
                  )}
                  {visibleColumns.actorUserId && (
                    <TableHead>Actor</TableHead>
                  )}
                  {visibleColumns.action && (
                    <TableHead>Action</TableHead>
                  )}
                  {visibleColumns.entity && (
                    <TableHead>Entity</TableHead>
                  )}
                  {visibleColumns.entityId && (
                    <TableHead>Entity ID</TableHead>
                  )}
                  {visibleColumns.metadata && (
                    <TableHead>Metadata</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((a) => (
                  <TableRow key={a.auditId} className={selectedIds.has(a.auditId) ? "bg-muted/30" : ""}>
                    {visibleColumns.select && (
                      <TableCell className="pl-6">
                        <Checkbox
                          checked={selectedIds.has(a.auditId)}
                          onCheckedChange={(checked) => handleToggleSelectRow(a.auditId, !!checked)}
                        />
                      </TableCell>
                    )}
                    {visibleColumns.createdAt && (
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(a.createdAt)}
                      </TableCell>
                    )}
                    {visibleColumns.actorUserId && (
                      <TableCell className="text-foreground font-medium">{a.actorUserId ?? "—"}</TableCell>
                    )}
                    {visibleColumns.action && (
                      <TableCell>
                        <Badge variant="outline" className="bg-muted text-foreground border-border">
                          {a.action}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.entity && (
                      <TableCell className="text-muted-foreground">{a.entity}</TableCell>
                    )}
                    {visibleColumns.entityId && (
                      <TableCell className="max-w-32 truncate text-muted-foreground">{a.entityId ?? "—"}</TableCell>
                    )}
                    {visibleColumns.metadata && (
                      <TableCell className="max-w-56 truncate text-xs text-muted-foreground font-mono">
                        {a.metadata ? JSON.stringify(a.metadata) : "—"}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination Footer */}
          {!loading && items.length > 0 && (
            <Pagination
              page={pageIndex + 1}
              pageSize={pageSize}
              totalItems={items.length}
              onPageChange={(p) => setPageIndex(Math.max(0, Math.min(p - 1, pageCount - 1)))}
              itemLabel="results"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}