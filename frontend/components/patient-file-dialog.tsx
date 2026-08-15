"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownTrayIcon as Download,
  ArrowTopRightOnSquareIcon as ExternalLink,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  fileCategory,
  fileCategoryColor,
  FileTypeIcon,
  formatBytes,
  formatDate,
} from "@/components/reports-utils";
import { categoryLabel, type ReportFile } from "@/lib/report-folders";

export function PatientFileDialog({
  file,
  onClose,
}: {
  file: ReportFile | null;
  onClose: () => void;
}) {
  if (!file) return null;
  return <PatientFileDialogInner key={file.id} file={file} onClose={onClose} />;
}

function PatientFileDialogInner({
  file,
  onClose,
}: {
  file: ReportFile;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

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

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] w-full max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
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
              <DialogTitle className="break-words">{file.name}</DialogTitle>
              <DialogDescription>
                {formatBytes(file.size)} · {formatDate(file.createdAt)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {previewable && url ? (
            <div className="flex max-h-[50vh] items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30">
              {category === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt={file.name}
                  className="max-h-[50vh] w-full object-contain"
                />
              ) : (
                <iframe src={url} title={file.name} className="h-[50vh] w-full" />
              )}
            </div>
          ) : previewable && !url ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground">
              Loading preview...
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 p-8 text-center">
              <FileTypeIcon
                category={category}
                className="size-10 text-muted-foreground"
              />
              <p className="text-sm text-muted-foreground">
                Preview is not available for this file type. Download it to view.
              </p>
            </div>
          )}

          <div className="grid gap-x-4 gap-y-2 rounded-lg border border-border bg-muted/30 p-4 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Document:</span>
              <span className="font-medium">{categoryLabel(file.category)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Uploaded:</span>
              <span className="font-medium">{formatDate(file.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Type:</span>
              <span className="font-medium">{file.type || "Unknown"}</span>
            </div>
            {file.prescriptionLabel && (
              <div className="flex items-center gap-1.5 sm:col-span-2">
                <span className="text-muted-foreground">Related prescription:</span>
                <Badge variant="secondary">{file.prescriptionLabel}</Badge>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
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
      </DialogContent>
    </Dialog>
  );
}
