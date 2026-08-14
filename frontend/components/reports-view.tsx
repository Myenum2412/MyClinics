"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangleIcon,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderInput,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  type PatientOption,
  type ReportFile,
} from "@/lib/report-folders";

function categoryOf(file: ReportFile) {
  return file.category ?? "upload";
}

export function ReportsView({
  initialFiles,
  initialPatients,
  configError,
}: {
  initialFiles: ReportFile[];
  initialPatients: PatientOption[];
  configError?: string | null;
}) {
  const [files, setFiles] = useState(initialFiles);
  const [activePatient, setActivePatient] = useState<string>("all");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const router = useRouter();
  const [renaming, setRenaming] = useState<ReportFile | null>(null);
  const [moving, setMoving] = useState<ReportFile[] | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const patientCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of files) {
      const key = f.patientId ?? "none";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [files]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of files) {
      const key = `${f.patientId ?? "none"}:${categoryOf(f)}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [files]);

  const sidebarPatients = useMemo(
    () =>
      [...initialPatients].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [initialPatients]
  );
  const hasUnfiled = (patientCounts.get("none") ?? 0) > 0;

  const visibleFiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    return files
      .filter((f) => {
        if (activePatient === "all") return true;
        if (activePatient === "none") return f.patientId == null;
        return f.patientId === activePatient;
      })
      .filter((f) =>
        activeCategory === "all" ? true : categoryOf(f) === activeCategory
      )
      .filter((f) =>
        q
          ? f.name.toLowerCase().includes(q) ||
            (f.patientName ?? "").toLowerCase().includes(q)
          : true
      );
  }, [files, activePatient, activeCategory, search]);

  function syncFiles(updated: ReportFile[]) {
    setFiles((prev) => {
      const map = new Map(prev.map((f) => [f.id, f]));
      for (const f of updated) map.set(f.id, f);
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  }

  function removeFiles(ids: string[]) {
    setFiles((prev) => prev.filter((f) => !ids.includes(f.id)));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectPatient(patientId: string) {
    setActivePatient(patientId);
    setActiveCategory("all");
    setSelected(new Set());
  }

  function selectCategory(patientId: string, category: string) {
    setActivePatient(patientId);
    setActiveCategory(category);
    setSelected(new Set());
  }

  function toggleExpanded(patientId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId);
      else next.add(patientId);
      return next;
    });
  }

  function requestDeleteFile(file: ReportFile) {
    setConfirm({
      title: "Delete file",
      message: `Delete "${file.name}"? This permanently removes it from storage.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/reports/${file.id}`, { method: "DELETE" });
          if (res.ok) {
            toast.success("File deleted");
            removeFiles([file.id]);
          } else {
            const data = await res.json();
            toast.error(data.error || "Failed to delete file.");
          }
        } catch {
          toast.error("Failed to delete file.");
        }
      },
    });
  }

  function requestDeleteFiles(filesToDelete: ReportFile[]) {
    setConfirm({
      title: "Delete files",
      message: `Delete ${filesToDelete.length} selected file${filesToDelete.length > 1 ? "s" : ""}? This cannot be undone.`,
      onConfirm: async () => {
        let ok = 0;
        for (const file of filesToDelete) {
          try {
            const res = await fetch(`/api/reports/${file.id}`, { method: "DELETE" });
            if (res.ok) ok += 1;
          } catch {
            /* keep going */
          }
        }
        if (ok) {
          toast.success(`${ok} file${ok > 1 ? "s" : ""} deleted`);
          removeFiles(filesToDelete.map((f) => f.id));
        }
      },
    });
  }

  async function handleRenameFile(name: string) {
    if (!renaming) return;
    try {
      const res = await fetch(`/api/reports/${renaming.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok && data.file) {
        toast.success("File renamed");
        syncFiles([data.file]);
        setRenaming(null);
      } else {
        toast.error(data.error || "Failed to rename file.");
      }
    } catch {
      toast.error("Failed to rename file.");
    }
  }

  async function handleMoveFiles(patientId: string, category: string) {
    if (!moving?.length) return;
    let ok = 0;
    const patient = initialPatients.find((p) => p.id === patientId);
    for (const file of moving) {
      try {
        const res = await fetch(`/api/reports/${file.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientId,
            patientName: patient?.fullName ?? null,
            category,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.file) syncFiles([data.file]);
          ok += 1;
        }
      } catch {
        /* keep going */
      }
    }
    if (ok) {
      toast.success(`Moved ${ok} file${ok > 1 ? "s" : ""}`);
      setMoving(null);
    } else {
      toast.error("Failed to move files.");
    }
  }

  async function runConfirm() {
    if (!confirm) return;
    setConfirmBusy(true);
    await confirm.onConfirm();
    setConfirmBusy(false);
    setConfirm(null);
  }

  const selectedFiles = files.filter((f) => selected.has(f.id));

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {configError && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
          <p className="font-medium">Cloudflare R2 storage is not configured yet.</p>
          <p className="mt-1">
            {configError} Files will be listed but upload/download need these keys.
          </p>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-4 lg:flex-row">
        <aside className="lg:w-60 lg:shrink-0">
          <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-2">
            <button
              type="button"
              onClick={() => selectPatient("all")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                activePatient === "all"
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              )}
            >
              {activePatient === "all" && activeCategory === "all" ? (
                <FolderOpen className="size-4" aria-hidden="true" />
              ) : (
                <Folder className="size-4" aria-hidden="true" />
              )}
              <span className="flex-1 text-left">All Files</span>
              <span className="text-xs text-muted-foreground">{files.length}</span>
            </button>

            {hasUnfiled && (
              <button
                type="button"
                onClick={() => selectPatient("none")}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  activePatient === "none"
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
              >
                <UserRound className="size-4" aria-hidden="true" />
                <span className="flex-1 text-left">No Patient</span>
                <span className="text-xs text-muted-foreground">
                  {patientCounts.get("none") ?? 0}
                </span>
              </button>
            )}

            <div className="my-1 h-px bg-border" />

            {sidebarPatients.map((patient) => {
              const isOpen = expanded.has(patient.id);
              const patientActive = activePatient === patient.id;
              return (
                <div key={patient.id} className="flex flex-col">
                  <div
                    className={cn(
                      "group flex items-center gap-1 rounded-lg transition-colors",
                      patientActive ? "bg-primary/10" : "hover:bg-muted"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpanded(patient.id)}
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={
                        isOpen
                          ? `Collapse ${patient.fullName}`
                          : `Expand ${patient.fullName}`
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
                      onClick={() => selectPatient(patient.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-2 pr-2 text-sm font-medium"
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                        {patient.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </span>
                      <span className="flex-1 truncate text-left">
                        {patient.fullName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {patientCounts.get(patient.id) ?? 0}
                      </span>
                    </button>
                  </div>

                  {isOpen && (
                    <div className="flex flex-col gap-0.5 py-0.5 pl-7">
                      {FILE_CATEGORIES.map((cat) => {
                        const count =
                          categoryCounts.get(`${patient.id}:${cat.value}`) ?? 0;
                        const active =
                          patientActive && activeCategory === cat.value;
                        return (
                          <button
                            key={cat.value}
                            type="button"
                            onClick={() => selectCategory(patient.id, cat.value)}
                            className={cn(
                              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                              active
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <span className="flex-1 text-left">{cat.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {sidebarPatients.length === 0 && !hasUnfiled && (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No patients yet. Create a patient to see their folders here.
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
                placeholder="Search file name or patient..."
                className="pl-8"
                aria-label="Search reports"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {visibleFiles.length} file{visibleFiles.length !== 1 ? "s" : ""}
              {activePatient !== "all" && (
                <span className="text-foreground">
                  {" "}
                  ·{" "}
                  {activePatient === "none"
                    ? "No patient"
                    : initialPatients.find((p) => p.id === activePatient)
                        ?.fullName ?? "Patient"}
                  {activeCategory !== "all" && ` · ${categoryLabel(activeCategory)}`}
                </span>
              )}
            </p>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {selected.size > 0 && (
                <>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <CheckSquare className="size-3.5" aria-hidden="true" />
                    {selected.size} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMoving(selectedFiles)}
                  >
                    <FolderInput className="mr-1 size-3.5" aria-hidden="true" />
                    Move
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => requestDeleteFiles(selectedFiles)}
                  >
                    <Trash2 className="mr-1 size-3.5" aria-hidden="true" />
                    Delete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
                    <X className="mr-1 size-3.5" aria-hidden="true" />
                    Clear
                  </Button>
                </>
              )}
              <Button
                size="sm"
                render={<Link href="/doctor/reports/new" />}
                nativeButton={false}
              >
                <Upload className="mr-1 size-3.5" aria-hidden="true" />
                Upload File
              </Button>
            </div>
          </div>

          {visibleFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-12 text-center">
              <Upload className="size-8 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">
                  {files.length === 0 ? "No files yet" : "No matching files"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {files.length === 0
                    ? "Upload a patient report to get started."
                    : "Try a different search or folder."}
                </p>
              </div>
              {files.length === 0 && (
                <Button
                  size="sm"
                  render={<Link href="/doctor/reports/new" />}
                  nativeButton={false}
                >
                  <Upload className="mr-1 size-3.5" aria-hidden="true" />
                  Upload File
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {visibleFiles.map((file) => {
                const category = fileCategory(file.type, file.extension);
                const isSelected = selected.has(file.id);
                return (
                  <div
                    key={file.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/doctor/reports/${file.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") router.push(`/doctor/reports/${file.id}`);
                    }}
                    className={cn(
                      "group relative flex cursor-pointer flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50 focus-visible:border-primary focus-visible:outline-none",
                      isSelected && "border-primary/70 bg-primary/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) setSelected((prev) => new Set(prev).add(file.id));
                          else toggleSelected(file.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select ${file.name}`}
                        className="size-4"
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                          aria-label={`Actions for ${file.name}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            render={<Link href={`/doctor/reports/${file.id}`} />}
                            nativeButton={false}
                          >
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setMoving([file])}>
                            <FolderInput className="size-3.5" aria-hidden="true" />
                            Move
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setRenaming(file)}>
                            <Pencil className="size-3.5" aria-hidden="true" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => requestDeleteFile(file)}
                          >
                            <Trash2 className="size-3.5" aria-hidden="true" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-col items-center gap-2 py-2">
                      <div
                        className={cn(
                          "flex size-12 items-center justify-center rounded-lg",
                          fileCategoryColor(category)
                        )}
                      >
                        <FileTypeIcon category={category} className="size-6" />
                      </div>
                      <p className="line-clamp-2 w-full break-words text-center text-sm font-medium leading-snug">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(file.size)} · {formatDate(file.createdAt)}
                      </p>
                    </div>

                    <div className="flex min-h-5 flex-wrap items-center justify-center gap-1.5">
                      {file.patientName && (
                        <Badge variant="secondary" className="max-w-full truncate">
                          {file.patientName}
                        </Badge>
                      )}
                      <Badge variant="outline" className="max-w-full truncate">
                        {categoryLabel(categoryOf(file))}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <RenameDialog
        open={Boolean(renaming)}
        title="Rename file"
        initialValue={renaming?.name ?? ""}
        onCancel={() => setRenaming(null)}
        onSubmit={handleRenameFile}
      />

      <MoveDialog
        files={moving}
        patients={initialPatients}
        onCancel={() => setMoving(null)}
        onSubmit={handleMoveFiles}
      />

      <Dialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && !confirmBusy && setConfirm(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <div className="flex items-start space-x-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <DialogHeader>
              <DialogTitle>{confirm?.title}</DialogTitle>
              <DialogDescription>{confirm?.message}</DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              onClick={() => void runConfirm()}
              disabled={confirmBusy}
            >
              {confirmBusy ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RenameDialog({
  open,
  title,
  initialValue,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  title: string;
  initialValue: string;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(initialValue);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
        else setName(initialValue);
      }}
    >
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Enter a new name.</DialogDescription>
        </DialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onSubmit(name.trim());
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(name.trim())} disabled={!name.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MoveDialog({
  files,
  patients,
  onCancel,
  onSubmit,
}: {
  files: ReportFile[] | null;
  patients: PatientOption[];
  onCancel: () => void;
  onSubmit: (patientId: string, category: string) => void;
}) {
  const [patientId, setPatientId] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const count = files?.length ?? 0;
  const firstFile = files?.[0];

  return (
    <Dialog open={Boolean(files)} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>
            Move {count ? `${count} file${count > 1 ? "s" : ""}` : "file"} to patient
          </DialogTitle>
          <DialogDescription>
            Choose the patient and document type. The file will show only in that
            folder.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="move-patient" className="text-sm font-medium">
              Patient <span className="text-destructive">*</span>
            </label>
            <Select value={patientId} onValueChange={(v) => setPatientId(v ?? "")}>
              <SelectTrigger id="move-patient" className="w-full">
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="move-category" className="text-sm font-medium">
              Document type <span className="text-destructive">*</span>
            </label>
            <Select value={category} onValueChange={(v) => setCategory(v ?? "")}>
              <SelectTrigger id="move-category" className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {FILE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {firstFile && firstFile.patientName && (
            <p className="text-xs text-muted-foreground">
              Currently: {firstFile.patientName} · {categoryLabel(firstFile.category)}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => patientId && category && onSubmit(patientId, category)}
            disabled={!patientId || !category}
          >
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
