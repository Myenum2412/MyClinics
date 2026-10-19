"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useRequireRole } from "@/hooks/use-clinic-session";
import { listInvestigations, type Investigation } from "@/lib/clinic-api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format-time";
import {
  INVESTIGATION_CATEGORY_BADGE,
  INVESTIGATION_CATEGORY_OPTIONS,
  INVESTIGATION_STATUS_BADGE,
  INVESTIGATION_STATUS_OPTIONS,
  investigationCategoryLabel,
  investigationDetailEntries,
  investigationStatusLabel,
} from "@/lib/investigation-meta";
import { Eye, FileText, Search, Stethoscope } from "lucide-react";

const PAGE_SIZE = 10;

function categoryKey(value: unknown): keyof typeof INVESTIGATION_CATEGORY_BADGE {
  return (
    typeof value === "string" && value in INVESTIGATION_CATEGORY_BADGE
      ? value
      : "other"
  ) as keyof typeof INVESTIGATION_CATEGORY_BADGE;
}

export default function LabReportsPage() {
  const session = useRequireRole("lab_technician");
  const clinicId = session?.clinicId ?? "";

  const [items, setItems] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<Investigation | null>(null);

  const load = useCallback(() => {
    if (!clinicId) return;
    setLoading(true);
    listInvestigations(clinicId, { limit: 100 })
      .then((res) => setItems(res.items ?? []))
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Failed to load lab reports")
      )
      .finally(() => setLoading(false));
  }, [clinicId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (category !== "all" && (r.category ?? "other") !== category) return false;
      if (!term) return true;
      return (
        (r.patientName ?? "").toLowerCase().includes(term) ||
        (r.title ?? "").toLowerCase().includes(term) ||
        (r.notes ?? "").toLowerCase().includes(term) ||
        (r.createdByName ?? "").toLowerCase().includes(term) ||
        investigationCategoryLabel(r.category).toLowerCase().includes(term)
      );
    });
  }, [items, q, status, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const detailEntries = useMemo(
    () => (viewing ? investigationDetailEntries(viewing.details, viewing.category) : []),
    [viewing]
  );

  return (
    <div className="flex w-full flex-col gap-4 sm:gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <FileText className="size-5 shrink-0 text-primary" />
        <h1 className="text-lg font-bold sm:text-xl">Lab Reports</h1>
        <Badge variant="secondary">{filtered.length}</Badge>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by patient, report or remarks..."
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            className="h-9 pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="h-9 w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {INVESTIGATION_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={(v) => { setCategory(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="h-9 w-full sm:w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {INVESTIGATION_CATEGORY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4 sm:p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-14 text-center text-sm text-muted-foreground">
              No lab reports found.
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto -mx-6 px-6 md:block">
                <Table className="min-w-[720px]">
                  <TableHeader>
                    <TableRow className="border-b bg-muted/40 hover:bg-muted/40">
                      <TableHead>Patient</TableHead>
                      <TableHead>Report</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Recorded by</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((r) => (
                      <TableRow
                        key={r.investigationId}
                        className="border-b last:border-0 hover:bg-muted/30"
                      >
                        <TableCell className="font-medium">
                          {r.patientName || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.title || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={INVESTIGATION_CATEGORY_BADGE[categoryKey(r.category)]}>
                            {investigationCategoryLabel(r.category)}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDate(r.visitDate)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.createdByName ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={INVESTIGATION_STATUS_BADGE[r.status]}>
                            {investigationStatusLabel(r.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => setViewing(r)}
                          >
                            <Eye className="size-3.5" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-2.5 bg-muted/40 p-3 md:hidden">
                {paginated.map((r) => (
                  <article
                    key={r.investigationId}
                    className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs"
                  >
                    <div className="flex items-start gap-2.5 p-3.5 pb-2">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <FileText className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-foreground">
                          {r.patientName || "—"}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {r.title || "—"}
                        </p>
                      </div>
                      <Badge className={`shrink-0 ${INVESTIGATION_STATUS_BADGE[r.status]}`}>
                        {investigationStatusLabel(r.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 px-3.5">
                      <Badge className={INVESTIGATION_CATEGORY_BADGE[categoryKey(r.category)]}>
                        {investigationCategoryLabel(r.category)}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(r.visitDate)}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-end border-t border-border/60 px-3.5 py-2.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => setViewing(r)}
                      >
                        <Eye className="size-3.5" />
                        View
                      </Button>
                    </div>
                  </article>
                ))}
              </div>

              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                totalItems={filtered.length}
                onPageChange={(p) => setPage(Math.max(1, Math.min(p, totalPages)))}
                itemLabel="reports"
              />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewing !== null} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              {viewing?.title || "Lab Report"}
            </DialogTitle>
            <DialogDescription>
              {viewing ? `${viewing.patientName || "Patient"} · ${formatDate(viewing.visitDate)}` : ""}
            </DialogDescription>
          </DialogHeader>

          {viewing ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={INVESTIGATION_CATEGORY_BADGE[categoryKey(viewing.category)]}>
                  {investigationCategoryLabel(viewing.category)}
                </Badge>
                <Badge className={INVESTIGATION_STATUS_BADGE[viewing.status]}>
                  {investigationStatusLabel(viewing.status)}
                </Badge>
                {viewing.hasChart ? (
                  <Badge variant="outline">Charted</Badge>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Patient</p>
                  <p className="font-medium">{viewing.patientName || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Visit date</p>
                  <p className="font-medium">{formatDate(viewing.visitDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Recorded by</p>
                  <p className="flex items-center gap-1.5 font-medium">
                    <Stethoscope className="size-3.5 text-muted-foreground" />
                    {viewing.createdByName ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-medium">{investigationStatusLabel(viewing.status)}</p>
                </div>
              </div>

              {detailEntries.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Report details
                  </p>
                  <dl className="divide-y divide-border rounded-lg border border-border">
                    {detailEntries.map((d) => (
                      <div key={d.label} className="flex items-start justify-between gap-4 px-3.5 py-2.5 text-sm">
                        <dt className="text-muted-foreground">{d.label}</dt>
                        <dd className="text-right font-medium text-foreground">{d.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}

              {viewing.notes ? (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Notes
                  </p>
                  <p className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 px-3.5 py-2.5 text-sm text-foreground">
                    {viewing.notes}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
