"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"
import { UploadCloud, TriangleAlert, Check, X } from "lucide-react"

const MAX_SIZE = 25 * 1024 * 1024
const ACCEPTED = ["image/png", "image/jpeg", "application/pdf"]

type UploadStatus = "uploading" | "done" | "error"

type UploadItem = {
  id: string
  name: string
  size: number
  progress: number
  status: UploadStatus
  error?: string
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function validate(file: File) {
  if (!ACCEPTED.includes(file.type)) return "Unsupported file type"
  if (file.size > MAX_SIZE) return "File exceeds 25 MB limit"
  return undefined
}

const seedFiles: UploadItem[] = [
  {
    id: "seed-1",
    name: "Acme-brand-guidelines.pdf",
    size: 4_812_345,
    progress: 100,
    status: "done",
  },
  {
    id: "seed-2",
    name: "homepage-hero@2x.png",
    size: 1_204_576,
    progress: 64,
    status: "uploading",
  },
]

export default function FileUploadBlock() {
  const [items, setItems] = useState<UploadItem[]>(seedFiles)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const hasActiveUploads = items.some((i) => i.status === "uploading")
  const toastedRef = useRef<Set<string>>(
    new Set(seedFiles.filter((f) => f.status === "done").map((f) => f.id))
  )

  useEffect(() => {
    if (!hasActiveUploads) return
    const timer = setInterval(() => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.status !== "uploading") return item
          const next = Math.min(100, item.progress + Math.random() * 18 + 6)
          if (next >= 100) {
            return { ...item, progress: 100, status: "done" }
          }
          return { ...item, progress: next }
        })
      )
    }, 600)
    return () => clearInterval(timer)
  }, [hasActiveUploads])

  useEffect(() => {
    for (const item of items) {
      if (item.status === "done" && !toastedRef.current.has(item.id)) {
        toastedRef.current.add(item.id)
        toast.success(`${item.name} uploaded`)
      }
    }
  }, [items])

  const addFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return
    const next: UploadItem[] = Array.from(fileList).map((file) => {
      const error = validate(file)
      return {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        progress: 0,
        status: error ? "error" : "uploading",
        error,
      }
    })
    setItems((prev) => [...next, ...prev])
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

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
    <section className="flex w-full items-center justify-center bg-muted/30 px-6 py-16 text-foreground">
      <Toaster />
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Upload assets</CardTitle>
          <CardDescription>
            Drag and drop your files or browse to attach them to Acme.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
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
            onDragOver={(event) => {
              event.preventDefault()
            }}
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
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center transition-colors outline-none",
              "focus-visible:ring-[3px] focus-visible:ring-ring/50",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/40 hover:bg-muted/60"
            )}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED.join(",")}
              className="sr-only"
              onChange={(event) => {
                addFiles(event.target.files)
                event.target.value = ""
              }}
            />
            <div
              className={cn(
                "flex size-12 items-center justify-center rounded-lg border transition-colors",
                isDragging
                  ? "border-primary bg-background text-primary"
                  : "border-border bg-background text-muted-foreground"
              )}
            >
              <UploadCloud className="size-6" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground">
                {isDragging
                  ? "Release to upload"
                  : "Drag & drop files or click to browse"}
              </p>
              <p className="text-xs text-muted-foreground">
                Supports PDF, PNG, JPG up to 25 MB
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(event) => {
                event.stopPropagation()
                inputRef.current?.click()
              }}
            >
              <UploadCloud data-icon="inline-start" aria-hidden="true" />
              Browse Files
            </Button>
          </div>

          {items.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground tabular-nums">
                  <span className="font-medium text-foreground">
                    {items.length}
                  </span>{" "}
                  {items.length === 1 ? "File" : "Files"}
                </p>
                <button
                  type="button"
                  onClick={() => setItems([])}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Clear All
                </button>
              </div>

              <ul className="flex flex-col gap-2">
                {items.map((item) => (
                  <li key={item.id}>
                    <Attachment
                      state={item.status}
                      size="sm"
                      className="w-full"
                    >
                      <AttachmentMedia>
                        {item.status === "error" ? (
                          <TriangleAlert aria-hidden="true" />
                        ) : item.status === "done" ? (
                          <Check className="text-primary" aria-hidden="true" />
                        ) : (
                          <Spinner />
                        )}
                      </AttachmentMedia>
                      <AttachmentContent>
                        <AttachmentTitle>{item.name}</AttachmentTitle>
                        <AttachmentDescription className="tabular-nums">
                          {item.status === "error"
                            ? item.error
                            : item.status === "done"
                              ? `Uploaded ${formatSize(item.size)}`
                              : `Uploading ${Math.round(item.progress)}%`}
                        </AttachmentDescription>
                      </AttachmentContent>
                      <AttachmentActions>
                        <AttachmentAction
                          aria-label={`Remove ${item.name}`}
                          onClick={() => removeItem(item.id)}
                        >
                          <X aria-hidden="true" />
                        </AttachmentAction>
                      </AttachmentActions>
                    </Attachment>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
