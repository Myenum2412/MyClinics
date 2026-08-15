"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownTrayIcon as Download,
  DocumentTextIcon as FileText,
  MagnifyingGlassIcon as Search,
} from "@heroicons/react/24/outline";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PatientFileDialog } from "@/components/patient-file-dialog";
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

function categoryOf(file: ReportFile) {
  return file.category ?? "upload";
}

export function PatientReports({ files }: { files: ReportFile[] }) {
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
          <FileText className="size-8 text-muted-foreground" aria-hidden="true" />
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleFiles.map((file) => {
            const category = fileCategory(file.type, file.extension);
            return (
              <button
                key={file.id}
                type="button"
                onClick={() => setViewing(file)}
                className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 focus-visible:border-primary focus-visible:outline-none"
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={cn(
                      "flex size-11 items-center justify-center rounded-lg",
                      fileCategoryColor(category)
                    )}
                  >
                    <FileTypeIcon category={category} className="size-5" />
                  </div>
                  <Badge variant="outline" className="max-w-full truncate">
                    {categoryLabel(categoryOf(file))}
                  </Badge>
                </div>
                <p className="line-clamp-2 w-full break-words text-sm font-medium leading-snug">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(file.size)} · {formatDate(file.createdAt)}
                </p>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Download className="size-3.5" aria-hidden="true" />
        Click any report to preview or download it.
      </div>

      <PatientFileDialog file={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
