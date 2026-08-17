"use client";

import { useMemo, useState } from "react";
import {
  ChevronDownIcon as ChevronDown,
  ChevronRightIcon as ChevronRight,
  EyeIcon as Eye,
  FolderIcon as Folder,
  FolderOpenIcon as FolderOpen,
  MagnifyingGlassIcon as Search,
} from "@heroicons/react/24/outline";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  const [activeFolder, setActiveFolder] = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(FILE_CATEGORIES.map((c) => c.value))
  );
  const [viewing, setViewing] = useState<ReportFile | null>(null);

  const sortedFiles = useMemo(
    () =>
      [...files].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [files]
  );

  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of sortedFiles) {
      const key = categoryOf(f);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [sortedFiles]);

  const visibleFiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortedFiles.filter(
      (f) =>
        (activeFolder === "all" || categoryOf(f) === activeFolder) &&
        (q ? f.name.toLowerCase().includes(q) : true)
    );
  }, [sortedFiles, activeFolder, search]);

  function toggleExpanded(category: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function selectFolder(category: string) {
    setActiveFolder(category);
    setExpanded((prev) => new Set(prev).add(category));
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">My Medical Reports</h1>
          <p className="text-sm text-muted-foreground">
            Your documents organised in folders — appointments, bills,
            prescriptions and uploads.
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 lg:flex-row">
        <aside className="lg:w-72 lg:shrink-0">
          <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-2">
            <button
              type="button"
              onClick={() => setActiveFolder("all")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                activeFolder === "all"
                  ? "bg-primary/10 text-foreground"
                  : "hover:bg-muted"
              )}
            >
              {activeFolder === "all" ? (
                <FolderOpen className="size-4" aria-hidden="true" />
              ) : (
                <Folder className="size-4" aria-hidden="true" />
              )}
              <span className="flex-1 text-left">All Files</span>
              <span className="text-xs text-muted-foreground">
                {files.length}
              </span>
            </button>

            <div className="my-1 h-px bg-border" />

            {FILE_CATEGORIES.map((cat) => {
              const count = folderCounts.get(cat.value) ?? 0;
              const isOpen = expanded.has(cat.value);
              const folderActive = activeFolder === cat.value;
              return (
                <div key={cat.value} className="flex flex-col">
                  <div
                    className={cn(
                      "group flex items-center gap-1 rounded-lg transition-colors",
                      folderActive ? "bg-primary/10" : "hover:bg-muted"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpanded(cat.value)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={
                        isOpen
                          ? `Collapse ${cat.label}`
                          : `Expand ${cat.label}`
                      }
                    >
                      {isOpen ? (
                        <ChevronDown className="size-3.5" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="size-3.5" aria-hidden="true" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => selectFolder(cat.value)}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-2 pr-2 text-sm font-medium"
                    >
                      <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="flex-1 truncate text-left">
                        {cat.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {count}
                      </span>
                    </button>
                  </div>

                  {isOpen && (
                    <div className="flex flex-col gap-0.5 py-0.5 pl-8">
                      {count === 0 ? (
                        <p className="px-3 py-1.5 text-xs text-muted-foreground">
                          Empty
                        </p>
                      ) : (
                        sortedFiles
                          .filter((f) => categoryOf(f) === cat.value)
                          .slice(0, 20)
                          .map((file) => (
                            <button
                              key={file.id}
                              type="button"
                              onClick={() => setViewing(file)}
                              className="flex min-w-0 items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <FileTypeIcon
                                category={fileCategory(file.type, file.extension)}
                                className="size-3.5 shrink-0"
                              />
                              <span className="min-w-0 flex-1 truncate">
                                {file.name}
                              </span>
                            </button>
                          ))
                      )}
                      {count > 20 && (
                        <button
                          type="button"
                          onClick={() => selectFolder(cat.value)}
                          className="px-3 py-1.5 text-left text-xs text-muted-foreground hover:underline"
                        >
                          + {count - 20} more…
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {files.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No reports yet. The clinic will add your documents here.
              </p>
            )}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-3">
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
            <p className="text-sm text-muted-foreground">
              {visibleFiles.length} file{visibleFiles.length !== 1 ? "s" : ""}
              {activeFolder !== "all" && (
                <span className="text-foreground">
                  {" "}
                  · {categoryLabel(activeFolder)}
                </span>
              )}
            </p>
          </div>

          {visibleFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-12 text-center">
              <Folder className="size-8 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">
                  {files.length === 0 ? "No reports yet" : "No matching reports"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {files.length === 0
                    ? "Your medical reports will appear here once the clinic adds them."
                    : "Try a different search or folder."}
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
        </main>
      </div>

      <PatientFileDialog file={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}