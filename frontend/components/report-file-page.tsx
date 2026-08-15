"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeftIcon as ArrowLeft,
  ArrowDownTrayIcon as Download,
  ArrowTopRightOnSquareIcon as ExternalLink,
  TrashIcon as Trash2,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  fileCategory,
  fileCategoryColor,
  FileTypeIcon,
  formatBytes,
  formatDate,
} from "@/components/reports-utils";
import { categoryLabel, type ReportFile } from "@/lib/report-folders";

export function ReportFilePage({ initialFile }: { initialFile: ReportFile }) {
  const router = useRouter();
  const file = initialFile;
  const [url, setUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/reports/${file.id}/url`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.url) setUrl(data.url);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [file.id]);

  const category = fileCategory(file.type, file.extension);
  const extension = file.extension.toLowerCase();
  const previewable =
    category === "image" ||
    category === "pdf" ||
    extension === "html" ||
    extension === "htm" ||
    extension === "txt";

  async function handleDownload() {
    if (!url) return;
    setDownloading(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete() {
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/reports/${file.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("File deleted");
        router.push("/doctor/reports");
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete file.");
        setDeleteBusy(false);
      }
    } catch {
      toast.error("Failed to delete file.");
      setDeleteBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                fileCategoryColor(category)
              )}
            >
              <FileTypeIcon category={category} className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="break-words text-xl font-semibold tracking-tight">
                {file.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                {formatBytes(file.size)} · uploaded {formatDate(file.createdAt)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/doctor/reports" />}
            nativeButton={false}
          >
            <ArrowLeft className="mr-1 size-3.5" aria-hidden="true" />
            Back to Reports
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {previewable && url ? (
          <div className="flex max-h-[60vh] items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/30">
            {category === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt={file.name}
                className="max-h-[60vh] w-full object-contain"
              />
            ) : (
              <iframe
                src={url}
                title={file.name}
                className="h-[60vh] w-full"
              />
            )}
          </div>
        ) : previewable && !url ? (
          <div className="flex h-40 items-center justify-center rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground">
            Loading preview...
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 p-8 text-center">
            <FileTypeIcon category={category} className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Preview is not available for this file type. Download it to view.
            </p>
          </div>
        )}

        <div className="grid gap-x-4 gap-y-2 rounded-xl border border-border bg-card p-4 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Patient:</span>
            <span className="font-medium">{file.patientName ?? "—"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Document:</span>
            <span className="font-medium">{categoryLabel(file.category)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Type:</span>
            <span className="font-medium">{file.type || "Unknown"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Uploaded by:</span>
            <span className="font-medium">{file.uploadedBy ?? "—"}</span>
          </div>
          {file.prescriptionLabel && (
            <div className="flex items-center gap-1.5 sm:col-span-2">
              <span className="text-muted-foreground">Related prescription:</span>
              <Badge variant="secondary">{file.prescriptionLabel}</Badge>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmingDelete(true)}>
            <Trash2 className="mr-1 size-3.5" aria-hidden="true" />
            Delete
          </Button>
          <Button
            variant="outline"
            onClick={() => url && window.open(url, "_blank", "noopener,noreferrer")}
            disabled={!url}
          >
            <ExternalLink className="mr-1 size-3.5" aria-hidden="true" />
            Open
          </Button>
          <Button onClick={handleDownload} disabled={!url || downloading}>
            <Download className="mr-1 size-3.5" aria-hidden="true" />
            {downloading ? "Downloading..." : "Download"}
          </Button>
        </div>
      </div>

      <Dialog open={confirmingDelete} onOpenChange={(open) => !open && setConfirmingDelete(false)}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex items-start space-x-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <DialogHeader>
              <DialogTitle>Delete file</DialogTitle>
              <DialogDescription>
                Delete &quot;{file.name}&quot;? This permanently removes it from
                storage.
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />} disabled={deleteBusy}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleteBusy}
            >
              {deleteBusy ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}