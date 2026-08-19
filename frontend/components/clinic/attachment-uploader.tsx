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

export interface AttachmentFile {
  id: string
  file: File | null
  name: string
  size: number
  documentType: string
  description: string
  url: string | null
  mimeType: string | null
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

function matchesAccept(file: File, accept: string[]): boolean {
  if (accept.length === 0) return true
  return accept.some((a) => {
    if (a.endsWith("/*")) return file.type.startsWith(a.slice(0, -1))
    if (a.startsWith(".")) return file.name.toLowerCase().endsWith(a.toLowerCase())
    return file.type === a
  })
}

export function AttachmentUploader({
  files,
  onChange,
  documentTypes,
  accept = ["image/*", "application/pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt"],
  maxSizeMB = 25,
  maxFiles,
  allowUrl = false,
  allowDescription = true,
  description = "Drag & drop files or click to browse. Supports PDF, PNG, JPG and documents.",
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
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-blue-200 bg-blue-50/40 px-6 py-8 text-center transition-colors outline-none",
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
              : "border-blue-200 bg-white text-blue-600"
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
          className="gap-1.5 border-blue-200 bg-white text-blue-700 hover:bg-blue-50"
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
                  <AttachmentMedia>
                    {item.file ? (
                      <Check className="text-primary" aria-hidden="true" />
                    ) : (
                      <FileText aria-hidden="true" />
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
                    <Label className="text-xs uppercase tracking-wide text-gray-500">Document type</Label>
                    <Select
                      value={item.documentType}
                      onValueChange={(v) => updateFile(item.id, { documentType: v ?? "" })}
                    >
                      <SelectTrigger className="h-9 rounded-lg border-blue-200 bg-white focus:ring-blue-400">
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
                      <Label className="text-xs uppercase tracking-wide text-gray-500">Description</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateFile(item.id, { description: e.target.value })}
                        className="h-9 rounded-lg border-blue-200 bg-white focus:ring-blue-400"
                        placeholder="e.g., CBC report from Aug 2026"
                      />
                    </div>
                  ) : allowUrl ? (
                    <div className="grid gap-1.5">
                      <Label className="text-xs uppercase tracking-wide text-gray-500">File URL</Label>
                      <Input
                        value={item.url ?? ""}
                        onChange={(e) => updateFile(item.id, { url: e.target.value || null })}
                        className="h-9 rounded-lg border-blue-200 bg-white focus:ring-blue-400"
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
          className="h-9 gap-1.5 self-start rounded-lg border-blue-300 text-blue-600 hover:bg-blue-50"
        >
          <Plus className="size-3.5" />
          Add Attachment
        </Button>
      )}
    </div>
  )
}