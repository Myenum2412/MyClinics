"use client";

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import type { CustomField } from "@puckeditor/core";
import { ImagePlus, Link2, Loader2, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import {
  deleteWebsiteMedia,
  listWebsiteMedia,
  uploadWebsiteMedia,
  type WebsiteMedia,
} from "@/lib/clinic-api";
import { useWebsiteBuilderClinicId } from "./runtime";

const MAX_LOCAL_BYTES = 6 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const STARTER_IMAGES = [
  { url: "/website/medical-hero.webp", label: "Medical hero" },
  { url: "/website/medical-care.webp", label: "Care team" },
  { url: "/website/dental-hero.webp", label: "Dental hero" },
  { url: "/website/dental-clinic-1.webp", label: "Dental clinic 1" },
  { url: "/website/dental-clinic-2.webp", label: "Dental clinic 2" },
  { url: "/website/dental-clinic-3.webp", label: "Dental clinic 3" },
  { url: "/website/orthopaedic-hero.webp", label: "Orthopaedic hero" },
  { url: "/website/hospital-hero.webp", label: "Hospital hero" },
  { url: "/website/hospital-team.webp", label: "Hospital team" },
  { url: "/website/doctor-1.webp", label: "Doctor portrait 1" },
  { url: "/website/doctor-2.webp", label: "Doctor portrait 2" },
  { url: "/website/doctor-3.webp", label: "Doctor portrait 3" },
  { url: "/website/doctor-4.webp", label: "Doctor portrait 4" },
];

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function WebsiteImageField({
  value,
  onChange,
  label = "Image",
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  label?: string;
}) {
  const clinicId = useWebsiteBuilderClinicId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [media, setMedia] = useState<WebsiteMedia[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const current = value ?? "";

  async function openLibrary() {
    const next = !libraryOpen;
    setLibraryOpen(next);
    if (!next || !clinicId || loadingLibrary) return;
    setLoadingLibrary(true);
    try {
      const result = await listWebsiteMedia(clinicId);
      setMedia(result.media);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load the image library");
    } finally {
      setLoadingLibrary(false);
    }
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    if (!clinicId) {
      toast.error("Save the clinic first, then upload images");
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Choose a JPG, PNG or WebP image");
      return;
    }
    if (file.size > MAX_LOCAL_BYTES) {
      toast.error("Images must be smaller than 6MB");
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadWebsiteMedia(clinicId, file);
      setMedia((previous) => [uploaded, ...previous.filter((item) => item.mediaId !== uploaded.mediaId)]);
      onChange(uploaded.url);
      setLibraryOpen(true);
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(item: WebsiteMedia) {
    if (!clinicId) return;
    if (!window.confirm("Delete this image from the library? Pages already using it will lose the image.")) {
      return;
    }
    setDeletingId(item.mediaId);
    try {
      await deleteWebsiteMedia(clinicId, item.mediaId);
      setMedia((previous) => previous.filter((entry) => entry.mediaId !== item.mediaId));
      if (current === item.url) onChange("");
      toast.success("Image deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete the image");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="relative overflow-hidden rounded-lg border border-border bg-muted/40">
        {current ? (
          <img
            src={current}
            alt=""
            className="aspect-[16/10] w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
            <ImagePlus className="size-6" />
            <span className="text-xs font-medium">No image selected</span>
          </div>
        )}
        {current ? (
          <button
            type="button"
            title="Remove image"
            onClick={() => onChange("")}
            className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-slate-950/70 text-white shadow-sm transition hover:bg-slate-950"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Link2 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="url"
            aria-label={`${label} URL`}
            value={current}
            placeholder="Paste an image URL or upload"
            onChange={(event) => onChange(event.target.value)}
            className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-2 text-xs text-foreground outline-none focus:border-primary"
          />
        </div>
        <button
          type="button"
          title="Upload image"
          disabled={uploading || !clinicId}
          onClick={() => fileRef.current?.click()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        </button>
        <button
          type="button"
          title="Choose from image library"
          onClick={() => void openLibrary()}
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground transition hover:bg-muted"
        >
          <ImagePlus className="size-4" />
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => void handleUpload(event.target.files?.[0])}
      />

      {!clinicId ? (
        <p className="text-[11px] leading-snug text-muted-foreground">
          Image uploads are available while editing a saved clinic website.
        </p>
      ) : null}

      {libraryOpen ? (
        <div className="rounded-lg border border-border bg-background p-2.5 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Image library
            </p>
            <button
              type="button"
              onClick={() => setLibraryOpen(false)}
              className="text-muted-foreground transition hover:text-foreground"
              title="Close library"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {loadingLibrary ? (
            <div className="flex items-center justify-center gap-2 py-5 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading images…
            </div>
          ) : (
            <>
              {media.length ? (
                <div className="grid max-h-52 grid-cols-3 gap-1.5 overflow-y-auto pr-0.5">
                  {media.map((item) => (
                    <div key={item.mediaId} className="group relative">
                      <button
                        type="button"
                        title={`${item.fileName} (${formatBytes(item.size)})`}
                        onClick={() => {
                          onChange(item.url);
                          setLibraryOpen(false);
                        }}
                        className={`block w-full overflow-hidden rounded-md border-2 bg-muted transition ${
                          current === item.url
                            ? "border-primary"
                            : "border-transparent hover:border-primary/50"
                        }`}
                      >
                        <img
                          src={item.url}
                          alt={item.fileName}
                          className="aspect-square w-full object-cover"
                          loading="lazy"
                        />
                      </button>
                      <button
                        type="button"
                        title="Delete image"
                        disabled={deletingId === item.mediaId}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDelete(item);
                        }}
                        className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-slate-950/75 text-white opacity-0 shadow transition group-hover:opacity-100 disabled:opacity-60"
                      >
                        {deletingId === item.mediaId ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Trash2 className="size-3" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-2 text-xs text-muted-foreground">
                  No uploaded images yet. Use the upload button above.
                </p>
              )}

              <p className="mb-1.5 mt-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Starter images
              </p>
              <div className="grid max-h-44 grid-cols-4 gap-1.5 overflow-y-auto pr-0.5">
                {STARTER_IMAGES.map((image) => (
                  <button
                    key={image.url}
                    type="button"
                    title={image.label}
                    onClick={() => {
                      onChange(image.url);
                      setLibraryOpen(false);
                    }}
                    className={`overflow-hidden rounded-md border-2 bg-muted transition ${
                      current === image.url
                        ? "border-primary"
                        : "border-transparent hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={image.url}
                      alt={image.label}
                      className="aspect-square w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function renderImageField(label: string) {
  return ({ value, onChange }: { value?: string; onChange: (value: string) => void }) => (
    <WebsiteImageField value={value} onChange={onChange} label={label} />
  );
}

/** Top-level image field (always rendered as a string). */
export function imageField(label: string): CustomField<string> {
  return { type: "custom", label, render: renderImageField(label) };
}

/** Image field for Puck array items, whose value can be undefined. */
export function optionalImageField(label: string): CustomField<string | undefined> {
  return { type: "custom", label, render: renderImageField(label) };
}
