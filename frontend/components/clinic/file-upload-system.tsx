"use client";

import { forwardRef, useImperativeHandle, useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { uploadMedicalRecordFile, type MedicalRecordFile } from "@/lib/clinic-api";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  UploadCloud,
  File,
  FileText,
  FileImage,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  FolderUp,
} from "lucide-react";

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".xlsx",
  ".jpg",
  ".jpeg",
  ".png",
  ".tif",
  ".tiff",
  ".dcm",
  ".mp4",
  ".m4v",
  ".mov",
  ".webm",
  ".avi",
  ".mkv",
  ".wmv",
  ".flv",
  ".ogv",
  ".3gp",
  ".3g2",
  ".mpeg",
  ".mpg",
  ".ts",
  ".m2ts",
];

export type UploadStatus = "queued" | "uploading" | "success" | "failed" | "cancelled";

export interface QueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number;
  speed: number; // bytes per second
  status: UploadStatus;
  error?: string;
  folder?: string;
  fingerprint: string;
  xhr?: XMLHttpRequest;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return "0 KB/s";
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

function getFileIcon(name: string, mime: string) {
  const n = name.toLowerCase();
  const m = mime.toLowerCase();
  if (m.startsWith("image/") || n.endsWith(".jpg") || n.endsWith(".png") || n.endsWith(".tif") || n.endsWith(".dcm")) {
    return <FileImage className="size-5 text-purple-500 shrink-0" />;
  }
  if (m.includes("spreadsheet") || n.endsWith(".xlsx") || n.endsWith(".xls")) {
    return <FileSpreadsheet className="size-5 text-emerald-500 shrink-0" />;
  }
  if (m.includes("pdf") || m.includes("word") || n.endsWith(".pdf") || n.endsWith(".docx")) {
    return <FileText className="size-5 text-blue-500 shrink-0" />;
  }
  return <File className="size-5 text-slate-400 shrink-0" />;
}

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_BYTES) {
    return `Exceeds 25MB size limit (${formatSize(file.size)})`;
  }
  const name = file.name.toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
    return `Unsupported file extension (${ext})`;
  }
  return null;
}

function generateScreenshotName(mimeType: string): string {
  const ext = mimeType === "image/jpeg" ? "jpg" : "png";
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "_")
    .slice(0, 15);
  return `Screenshot_${timestamp}.${ext}`;
}

export interface FileUploadSystemHandle {
  openFilePicker: () => void;
  openFolderPicker: () => void;
}

export interface FileUploadSystemProps {
  clinicId: string;
  patientId: string;
  currentFolderKey?: string;
  onUploadSuccess?: (file: MedicalRecordFile) => void;
  disabled?: boolean;
}

export const FileUploadSystem = forwardRef<FileUploadSystemHandle, FileUploadSystemProps>(
  function FileUploadSystem(
    {
      clinicId,
      patientId,
      currentFolderKey = "medical-records",
      onUploadSuccess,
      disabled = false,
    },
    ref
  ) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const dragDepth = useRef(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    openFilePicker: () => fileInputRef.current?.click(),
    openFolderPicker: () => folderInputRef.current?.click(),
  }));

  const queueRef = useRef(queue);
  queueRef.current = queue;

  // Deduplication & Queueing
  const addFilesToQueue = useCallback(
    (files: File[], customFolder?: string) => {
      if (!files.length) return;

      const targetFolder = customFolder ?? currentFolderKey;
      const existingFingerprints = new Set(queueRef.current.map((q) => q.fingerprint));

      const newItems: QueueItem[] = [];
      let duplicateCount = 0;
      let rejectedCount = 0;

      for (const rawFile of files) {
        let file = rawFile;
        // Check if image without extension/name (e.g. pasted screenshot)
        if (!file.name || file.name === "image.png" || file.name === "blob") {
          const newName = generateScreenshotName(file.type || "image/png");
          try {
            const FileCtor = (typeof window !== "undefined" && window.File) ? window.File : File;
            file = new (FileCtor as unknown as new (bits: BlobPart[], name: string, options?: FilePropertyBag) => File)([rawFile], newName, { type: rawFile.type || "image/png" });
          } catch {
            Object.defineProperty(rawFile, "name", { value: newName, configurable: true });
            file = rawFile;
          }
        }

        const fingerprint = `${file.name}-${file.size}-${file.lastModified || 0}`;

        if (existingFingerprints.has(fingerprint)) {
          duplicateCount++;
          continue;
        }

        const valError = validateFile(file);
        const item: QueueItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          file,
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          progress: 0,
          speed: 0,
          status: valError ? "failed" : "queued",
          error: valError ?? undefined,
          folder: targetFolder,
          fingerprint,
        };

        newItems.push(item);
        existingFingerprints.add(fingerprint);
        if (valError) rejectedCount++;
      }

      if (duplicateCount > 0) {
        toast.info(`${duplicateCount} duplicate file${duplicateCount > 1 ? "s" : ""} skipped`);
      }

      if (newItems.length > 0) {
        setQueue((prev) => [...prev, ...newItems]);
        setIsExpanded(true);
      }
    },
    [currentFolderKey]
  );

  // Active uploads processor (Concurrency pool max 3)
  useEffect(() => {
    const activeCount = queue.filter((i) => i.status === "uploading").length;
    if (activeCount >= 3) return;

    const nextItem = queue.find((i) => i.status === "queued");
    if (!nextItem || !patientId || !clinicId) return;

    // Start uploading nextItem
    const itemId = nextItem.id;
    setQueue((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, status: "uploading", progress: 0 } : i))
    );

    uploadMedicalRecordFile(clinicId, patientId, nextItem.file, nextItem.folder, {
      onXhrCreated: (xhr) => {
        setQueue((prev) => prev.map((i) => (i.id === itemId ? { ...i, xhr } : i)));
      },
      onProgress: (progress, _loaded, _total, speed) => {
        setQueue((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, progress, speed } : i))
        );
      },
    })
      .then((uploadedFile) => {
        setQueue((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? { ...i, status: "success", progress: 100, speed: 0, xhr: undefined }
              : i
          )
        );
        toast.success(`Uploaded "${nextItem.name}"`);
        if (onUploadSuccess) onUploadSuccess(uploadedFile);
      })
      .catch((err) => {
        const errorMsg = err instanceof Error ? err.message : "Upload failed";
        setQueue((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  status: i.status === "cancelled" ? "cancelled" : "failed",
                  error: errorMsg,
                  speed: 0,
                  xhr: undefined,
                }
              : i
          )
        );
        if (nextItem.status !== "cancelled") {
          toast.error(`Failed to upload "${nextItem.name}": ${errorMsg}`);
        }
      });
  }, [queue, clinicId, patientId, onUploadSuccess]);

  // Global Clipboard / Paste Listener (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled || !patientId) return;
      const target = e.target as HTMLElement | null;
      // Do not intercept paste inside input, textarea or contenteditable fields
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      const pastedFiles: File[] = [];

      // Method A: Check e.clipboardData.files
      if (clipboardData.files && clipboardData.files.length > 0) {
        for (let i = 0; i < clipboardData.files.length; i++) {
          pastedFiles.push(clipboardData.files[i]);
        }
      }

      // Method B: Check e.clipboardData.items for copied images / screenshots / blobs
      if (clipboardData.items && clipboardData.items.length > 0) {
        for (let i = 0; i < clipboardData.items.length; i++) {
          const item = clipboardData.items[i];
          if (item.kind === "file") {
            const file = item.getAsFile();
            if (file && !pastedFiles.some((f) => f.name === file.name && f.size === file.size)) {
              pastedFiles.push(file);
            }
          }
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        toast.info(
          `Detected ${pastedFiles.length} pasted file${pastedFiles.length > 1 ? "s" : "/images"}`
        );
        addFilesToQueue(pastedFiles);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [disabled, patientId, addFilesToQueue]);

  // Window-level Drag & Drop listener (shows dropzone overlay when files are dragged anywhere onto page)
  useEffect(() => {
    if (disabled || !patientId) return;

    const handleWindowDragEnter = (e: globalThis.DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      dragDepth.current += 1;
      setIsDragging(true);
    };

    const handleWindowDragOver = (e: globalThis.DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };

    const handleWindowDragLeave = (e: globalThis.DragEvent) => {
      e.preventDefault();
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current <= 0) {
        dragDepth.current = 0;
        setIsDragging(false);
      }
    };

    const handleWindowDrop = (e: globalThis.DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      dragDepth.current = 0;
      setIsDragging(false);
    };

    window.addEventListener("dragenter", handleWindowDragEnter);
    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("dragleave", handleWindowDragLeave);
    window.addEventListener("drop", handleWindowDrop);

    return () => {
      window.removeEventListener("dragenter", handleWindowDragEnter);
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("dragleave", handleWindowDragLeave);
      window.removeEventListener("drop", handleWindowDrop);
    };
  }, [disabled, patientId]);

  // Drag & Drop handlers
  const handleDragEnter = useCallback((e: DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      if (!e.dataTransfer.types.includes("Files")) return;
      e.preventDefault();
      dragDepth.current = 0;
      setIsDragging(false);

      const items = e.dataTransfer.items;
      const files: File[] = [];

      if (items && items.length > 0) {
        // Recursive folder drop handling via webkitGetAsEntry
        const entries: FileSystemEntry[] = [];
        for (let i = 0; i < items.length; i++) {
          const entry = items[i].webkitGetAsEntry?.();
          if (entry) entries.push(entry);
        }

        const readEntry = async (entry: FileSystemEntry): Promise<File[]> => {
          if (entry.isFile) {
            return new Promise((resolve) => {
              (entry as FileSystemFileEntry).file((file) => resolve([file]));
            });
          } else if (entry.isDirectory) {
            const dirReader = (entry as FileSystemDirectoryEntry).createReader();
            return new Promise((resolve) => {
              dirReader.readEntries(async (entries) => {
                const results: File[] = [];
                for (const subEntry of entries) {
                  const subFiles = await readEntry(subEntry);
                  results.push(...subFiles);
                }
                resolve(results);
              });
            });
          }
          return [];
        };

        for (const entry of entries) {
          const entryFiles = await readEntry(entry);
          files.push(...entryFiles);
        }
      }

      if (files.length === 0 && e.dataTransfer.files) {
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          files.push(e.dataTransfer.files[i]);
        }
      }

      addFilesToQueue(files);
    },
    [addFilesToQueue]
  );

  // Actions per item
  const retryItem = (id: string) => {
    setQueue((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "queued", error: undefined, progress: 0 } : i))
    );
  };

  const cancelItem = (id: string) => {
    setQueue((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          if (i.xhr) {
            try {
              i.xhr.abort();
            } catch {}
          }
          return { ...i, status: "cancelled", xhr: undefined, speed: 0 };
        }
        return i;
      })
    );
  };

  const removeItem = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.xhr) {
        try {
          item.xhr.abort();
        } catch {}
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const clearCompleted = () => {
    setQueue((prev) => prev.filter((i) => i.status !== "success" && i.status !== "cancelled"));
  };

  const activeCount = queue.filter((i) => i.status === "uploading" || i.status === "queued").length;
  const overallProgress =
    queue.length > 0
      ? Math.round(
          queue.reduce((acc, i) => acc + (i.status === "success" ? 100 : i.progress), 0) / queue.length
        )
      : 0;

  return (
    <div className="space-y-4">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALLOWED_EXTENSIONS.join(",")}
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFilesToQueue(Array.from(e.target.files));
          e.target.value = "";
        }}
        disabled={disabled}
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error - webkitdirectory non-standard attribute
        webkitdirectory="true"
        directory=""
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFilesToQueue(Array.from(e.target.files));
          e.target.value = "";
        }}
        disabled={disabled}
      />

      {/* Full-Screen Drag & Drop Overlay (only shown when dragging files onto screen) */}
      {isDragging && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md transition-all"
        >
          <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border-4 border-dashed border-primary bg-card p-12 text-center shadow-2xl scale-105 animate-in fade-in zoom-in-95 max-w-lg">
            <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UploadCloud className="size-10 animate-bounce" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                Drop files here to upload
              </p>
              <p className="text-sm font-medium text-primary mt-1">
                Supports PDF, DOCX, XLSX, JPG, PNG, TIFF, DICOM & Video files up to 25MB
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                Pasting with <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-foreground ring-1 ring-border">Ctrl + V</kbd> is also supported anytime
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Queue Panel / Drawer */}
      {queue.length > 0 && (
        <div className="rounded-none border border-border bg-card shadow-sm overflow-hidden transition-all">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">
                Upload Queue
              </span>
              <Badge variant="secondary" className="text-xs">
                {queue.length} file{queue.length > 1 ? "s" : ""}
              </Badge>
              {activeCount > 0 && (
                <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/20 text-xs">
                  {activeCount} uploading
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {queue.some((i) => i.status === "success" || i.status === "cancelled") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearCompleted}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear Finished
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </Button>
            </div>
          </div>

          {/* List of Queue Items */}
          {isExpanded && (
            <div className="max-h-72 overflow-y-auto divide-y divide-border p-2">
              {queue.map((item) => (
                <div key={item.id} className="flex flex-col gap-1.5 p-2.5 transition hover:bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getFileIcon(item.name, item.type)}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-foreground">
                          {item.name}
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground font-mono">
                          {formatSize(item.size)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="uppercase text-[10px] font-semibold tracking-wider text-muted-foreground">
                          {item.type.split("/")[1] || "FILE"}
                        </span>
                        <span>·</span>
                        {item.status === "uploading" && (
                          <>
                            <span className="text-primary font-medium">{item.progress}%</span>
                            <span>·</span>
                            <span className="font-mono text-primary">{formatSpeed(item.speed)}</span>
                          </>
                        )}
                        {item.status === "queued" && (
                          <span className="text-amber-500 font-medium">Queued</span>
                        )}
                        {item.status === "success" && (
                          <span className="text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle className="size-3" /> Completed
                          </span>
                        )}
                        {item.status === "failed" && (
                          <span className="text-destructive font-medium flex items-center gap-1">
                            <AlertCircle className="size-3" /> {item.error || "Failed"}
                          </span>
                        )}
                        {item.status === "cancelled" && (
                          <span className="text-muted-foreground font-medium flex items-center gap-1">
                            <XCircle className="size-3" /> Cancelled
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions per item */}
                    <div className="flex items-center gap-1 shrink-0">
                      {item.status === "failed" && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-primary hover:bg-primary/10"
                          onClick={() => retryItem(item.id)}
                          title="Retry Upload"
                        >
                          <RefreshCw className="size-3.5" />
                        </Button>
                      )}
                      {(item.status === "uploading" || item.status === "queued") && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => cancelItem(item.id)}
                          title="Cancel Upload"
                        >
                          <X className="size-3.5" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.id)}
                        title="Remove from Queue"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {(item.status === "uploading" || item.status === "queued") && (
                    <Progress value={item.progress} className="h-1.5 w-full bg-muted" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Persistent Floating Bottom-Right Upload Indicator (when active or minimized) */}
      {queue.length > 0 && activeCount > 0 && !isExpanded && (
        <div
          role="button"
          onClick={() => setIsExpanded(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full border border-border bg-card p-3 pr-5 shadow-xl ring-1 ring-primary/20 backdrop-blur transition hover:scale-105 cursor-pointer"
        >
          <div className="relative flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UploadCloud className="size-5 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">
              Uploading {activeCount} file{activeCount > 1 ? "s" : ""}...
            </p>
            <div className="flex items-center gap-2">
              <Progress value={overallProgress} className="h-1 w-24 bg-muted" />
              <span className="text-[10px] font-medium text-muted-foreground">{overallProgress}%</span>
            </div>
          </div>
          <ChevronUp className="size-4 text-muted-foreground ml-1" />
        </div>
      )}
    </div>
  );
});
