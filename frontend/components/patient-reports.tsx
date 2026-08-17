"use client";

import { useMemo, useState } from "react";
import {
  EyeIcon as Eye,
  MagnifyingGlassIcon as Search,
} from "@heroicons/react/24/outline";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PatientFileDialog } from "@/components/patient-file-dialog";
import {
  AppointmentsTableCard,
  BillsTableCard,
  PrescriptionsTableCard,
} from "@/components/patient-tables";
import {
  fileCategory,
  fileCategoryColor,
  FileTypeIcon,
  formatBytes,
  formatDate,
} from "@/components/reports-utils";
import {
  categoryLabel,
  FILE_CATEGORIES,
  type ReportFile,
} from "@/lib/report-folders";
import type { Appointment } from "@/components/appointments-table";
import type { Bill } from "@/components/billing-table";
import type { Prescription } from "@/components/prescriptions-table";

function categoryOf(file: ReportFile) {
  return file.category ?? "upload";
}

export function PatientReports({
  files,
  appointments,
  prescriptions,
  bills,
}: {
  files: ReportFile[];
  appointments: Appointment[];
  prescriptions: Prescription[];
  bills: Bill[];
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [viewing, setViewing] = useState<ReportFile | null>(null);

  const visibleFiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return files.filter(
      (f) =>
        (activeCategory === "all" || categoryOf(f) === activeCategory) &&
        (q ? f.name.toLowerCase().includes(q) : true)
    );
  }, [files, search, activeCategory]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">My Medical Reports</h1>
          <p className="text-sm text-muted-foreground">
            Your appointments, bills, prescriptions and uploaded documents.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search file name..."
              className="pl-8"
              aria-label="Search reports"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant={activeCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory("all")}
            >
              All
            </Button>
            {FILE_CATEGORIES.map((c) => (
              <Button
                key={c.value}
                variant={activeCategory === c.value ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(c.value)}
              >
                {c.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {visibleFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-12 text-center">
          <div>
            <p className="text-sm font-medium">
              {files.length === 0 ? "No reports yet" : "No matching reports"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {files.length === 0
                ? "Your medical reports will appear here once the clinic adds them."
                : "Try a different search or category."}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                <TableHead className="h-9">Name</TableHead>
                <TableHead className="h-9">Category</TableHead>
                <TableHead className="h-9">Size</TableHead>
                <TableHead className="h-9">Date</TableHead>
                <TableHead className="h-9 pr-4 text-right">Preview</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleFiles.map((file) => {
                const category = fileCategory(file.type, file.extension);
                return (
                  <TableRow
                    key={file.id}
                    onClick={() => setViewing(file)}
                    className="cursor-pointer border-b border-border transition-colors duration-100 last:border-b-0 hover:bg-muted/30"
                  >
                    <TableCell className="py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${fileCategoryColor(category)}`}
                        >
                          <FileTypeIcon category={category} className="size-4" />
                        </div>
                        <span className="min-w-0 truncate text-sm font-medium">
                          {file.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge variant="outline" className="text-xs">
                        {categoryLabel(categoryOf(file))}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-sm text-muted-foreground tabular-nums">
                      {formatBytes(file.size)}
                    </TableCell>
                    <TableCell className="py-3 text-sm text-muted-foreground tabular-nums">
                      {formatDate(file.createdAt)}
                    </TableCell>
                    <TableCell className="py-3 pr-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewing(file);
                        }}
                        aria-label={`Preview ${file.name}`}
                      >
                        <Eye className="mr-1 size-3.5" aria-hidden="true" />
                        Preview
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <AppointmentsTableCard
          appointments={appointments}
          title="Appointments"
          description="Your visits at the clinic"
          href="/patient/appointments"
        />
        <PrescriptionsTableCard
          prescriptions={prescriptions}
          title="Prescriptions"
          description="Prescriptions from your visits"
          href="/patient/medicines"
        />
        <BillsTableCard
          bills={bills}
          title="Bills"
          description="Invoices from your visits"
          href="/patient/billing"
        />
      </div>

      <PatientFileDialog file={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}