"use client"

import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useRequireRole } from "@/hooks/use-clinic-session"
import { useDropdownOptions } from "@/lib/dropdown-options"
import { Check, FileText, Plus, UploadCloud, X } from "lucide-react"
import { VideoPreview } from "@/components/ui/video-preview"

export interface AttachmentFile {
  id: string
  file: File | null
  name: string
  size: number
  documentType: string
  description: string
  url: string | null
  mimeType: string | null
  fileId?: string | null
}

export function makeAttachmentFile(file: File | null, extra?: Partial<AttachmentFile>): AttachmentFile {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    file,
    name: file?.name ?? "",
    size: file?.size ?? 0,
    documentType: "",
    description: "",
    url: null,
    mimeType: file?.type ?? null,
    ...extra,
  }
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Video extensions used to classify files when the browser reports no MIME type. */
const VIDEO_EXTENSIONS = [
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
]

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg", ".heic", ".avif"]

function mimeCategoryFromExtension(name: string): string | null {
  const lower = name.toLowerCase()
  const dot = lower.lastIndexOf(".")
  const ext = dot > -1 ? lower.slice(dot) : ""
  if (!ext) return null
  if (VIDEO_EXTENSIONS.includes(ext)) return "video/"
  if (IMAGE_EXTENSIONS.includes(ext)) return "image/"
  return null
}

function matchesAccept(file: File, accept: string[]): boolean {
  if (accept.length === 0) return true
  return accept.some((a) => {
    if (a.endsWith("/*")) {
      const prefix = a.slice(0, -1)
      if (file.type.startsWith(prefix)) return true
      // Browser reported no MIME type  fall back to the file extension.
      return file.type === "" && mimeCategoryFromExtension(file.name) === prefix
    }
    if (a.startsWith(".")) return file.name.toLowerCase().endsWith(a.toLowerCase())
    return file.type === a
  })
}

export function AttachmentUploader({
  files,
  onChange,
  documentTypes,
  accept = [
    "image/*",
    "video/*",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc",
    ".docx",
    ".rtf",
    ".odt",
    ".txt",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls",
    ".xlsx",
    ".csv",
    ".ods",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".ppt",
    ".pptx",
    ".odp",
  ],
  maxSizeMB = 25,
  maxFiles,
  allowUrl = false,
  allowDescription = true,
  description = "Drag & drop files or click to browse. Supports PDF, PNG, JPG and Office documents (DOC, XLS, PPT, CSV).",
}: {
  files: AttachmentFile[]
  onChange: (files: AttachmentFile[]) => void
  documentTypes?: string[]
  accept?: string[]
  maxSizeMB?: number
  maxFiles?: number
  allowUrl?: boolean
  allowDescription?: boolean
  description?: string
}) {
  const session = useRequireRole("patient");
  const { getOptions } = useDropdownOptions(session?.clinicId ?? "");
  const effectiveDocumentTypes = documentTypes ?? getOptions("document_types");
  const [isDragging, setIsDragging] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)

  const addFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return
      if (maxFiles && files.length >= maxFiles) {
        toast.error(`Maximum ${maxFiles} file${maxFiles === 1 ? "" : "s"} allowed`)
        return
      }
      const next: AttachmentFile[] = []
      const rejected: string[] = []
      Array.from(fileList).forEach((file) => {
        if (maxFiles && files.length + next.length >= maxFiles) return
        if (!matchesAccept(file, accept)) {
          rejected.push(`${file.name} (unsupported type)`)
          return
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
          rejected.push(`${file.name} (exceeds ${maxSizeMB} MB)`)
          return
        }
        next.push(makeAttachmentFile(file))
      })
      if (next.length > 0) onChange([...next, ...files])
      if (rejected.length > 0) {
        const msg = rejected.join(", ")
        toast.error(`Rejected: ${msg}`)
        setErrors((prev) => ({ ...prev, rejected: msg }))
      }
    },
    [files, maxFiles, accept, maxSizeMB, onChange]
  )

  const updateFile = useCallback(
    (id: string, patch: Partial<AttachmentFile>) => {
      onChange(files.map((f) => (f.id === id ? { ...f, ...patch } : f)))
    },
    [files, onChange]
  )

  const removeFile = useCallback(
    (id: string) => {
      onChange(files.filter((f) => f.id !== id))
    },
    [files, onChange]
  )

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      dragDepth.current = 0
      setIsDragging(false)
      addFiles(event.dataTransfer.files)
    },
    [addFiles]
  )

  return (
    <div className="flex flex-col gap-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragEnter={(event) => {
          event.preventDefault()
          dragDepth.current += 1
          setIsDragging(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          dragDepth.current -= 1
          if (dragDepth.current <= 0) {
            dragDepth.current = 0
            setIsDragging(false)
          }
        }}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-accent/40 px-6 py-8 text-center transition-colors outline-none",
          "focus-visible:ring-[3px] focus-visible:ring-ring/50",
          isDragging && "border-primary bg-primary/5"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={!maxFiles || maxFiles > 1}
          accept={accept.join(",")}
          className="sr-only"
          onChange={(event) => {
            addFiles(event.target.files)
            event.target.value = ""
          }}
        />
        <div
          className={cn(
            "flex size-12 items-center justify-center rounded-xl border transition-colors",
            isDragging
              ? "border-primary bg-background text-primary"
              : "border-border bg-background text-primary"
          )}
        >
          <UploadCloud className="size-6" aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">
            {isDragging ? "Release to upload" : "Drag & drop files or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 border-border bg-background text-primary hover:bg-accent"
          onClick={(event) => {
            event.stopPropagation()
            inputRef.current?.click()
          }}
        >
          <UploadCloud data-icon="inline-start" aria-hidden="true" />
          Browse Files
        </Button>
      </div>

      {errors.rejected && (
        <p className="text-xs text-destructive">{errors.rejected}</p>
      )}

      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground tabular-nums">
              <span className="font-medium text-foreground">{files.length}</span>{" "}
              {files.length === 1 ? "file attached" : "files attached"}
            </p>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear all
            </button>
          </div>

          <ul className="flex flex-col gap-2">
            {files.map((item) => (
              <li key={item.id} className="flex flex-col gap-2">
                <Attachment state={item.file ? "done" : "idle"} size="sm" className="w-full">
                  <AttachmentMedia variant={item.mimeType?.startsWith("video/") ? "video" : "icon"}>
                    {item.file ? (
                      <>
                        {item.mimeType?.startsWith("video/") ? (
                          <VideoPreview
                            src={URL.createObjectURL(item.file)}
                            title={item.file.name}
                            className="max-h-32"
                            controls={true}
                            muted={true}
                          />
                        ) : (
                          <Check className="text-primary" aria-hidden="true" />
                        )}
                      </>
                    ) : (
                      <>
                        {item.mimeType?.startsWith("video/") && item.url ? (
                          <VideoPreview
                            src={item.url}
                            title={item.name}
                            className="max-h-32"
                            controls={true}
                            muted={true}
                          />
                        ) : (
                          <FileText aria-hidden="true" />
                        )}
                      </>
                    )}
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>
                      {item.file ? item.file.name : item.name || "Remote file"}
                    </AttachmentTitle>
                    <AttachmentDescription className="tabular-nums">
                      {item.file ? formatSize(item.file.size) : item.url ?? item.mimeType ?? "External link"}
                    </AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction
                      aria-label={`Remove ${item.file?.name ?? item.name}`}
                      onClick={() => removeFile(item.id)}
                    >
                      <X aria-hidden="true" />
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>

                <div className="grid gap-2 pl-2 md:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Document type</Label>
                    <Select
                      value={item.documentType}
                      onValueChange={(v) => updateFile(item.id, { documentType: v ?? "" })}
                    >
                      <SelectTrigger className="h-9 rounded-lg border-border bg-background focus:ring-ring">
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {effectiveDocumentTypes.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {allowDescription ? (
                    <div className="grid gap-1.5">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateFile(item.id, { description: e.target.value })}
                        className="h-9 rounded-lg border-border bg-background focus:ring-ring"
                        placeholder="e.g., CBC report from Aug 2026"
                      />
                    </div>
                  ) : allowUrl ? (
                    <div className="grid gap-1.5">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">File URL</Label>
                      <Input
                        value={item.url ?? ""}
                        onChange={(e) => updateFile(item.id, { url: e.target.value || null })}
                        className="h-9 rounded-lg border-border bg-background focus:ring-ring"
                        placeholder="https://..."
                      />
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(!maxFiles || files.length < maxFiles) && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          className="h-9 gap-1.5 self-start rounded-lg border-primary/30 text-primary hover:bg-accent"
        >
          <Plus className="size-3.5" />
          Add Attachment
        </Button>
      )}
    </div>
  )
}