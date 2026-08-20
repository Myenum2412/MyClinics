"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadCloud, Download, Trash2, FileText, Video, Image } from "lucide-react";
import { listClinicWelcomeDocuments, uploadClinicWelcomeDocument, getClinicWelcomeDocumentDownloadUrl, deleteClinicWelcomeDocument, type ClinicWelcomeDocument } from "@/lib/clinic-api";
import { useRequireRole, sessionCan } from "@/hooks/use-clinic-session";
import { cn } from "@/lib/utils";

export function ClinicWelcomeDocuments({ clinicId }: { clinicId: string }) {
  const session = useRequireRole("staff");
  const canManage = sessionCan(session, "clinic_admin");
  const [documents, setDocuments] = useState<ClinicWelcomeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!clinicId) return [] as ClinicWelcomeDocument[];
    try {
      const res = await listClinicWelcomeDocuments(clinicId);
      return res.documents;
    } catch {
      toast.error("Failed to load attachments");
      return [] as ClinicWelcomeDocument[];
    }
  }, [clinicId]);

  useEffect(() => {
    let mounted = true;
    fetchDocuments().then((docs) => {
      if (mounted) {
        setDocuments(docs);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [fetchDocuments]);

  const handleUpload = async (file: File) => {
    if (!clinicId) return;
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only PDF, images (JPG, PNG, WebP), and videos (MP4, WebM, MOV) are allowed");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File must be smaller than 50MB");
      return;
    }

    setUploading(true);
    try {
      const doc = await uploadClinicWelcomeDocument(clinicId, file);
      setDocuments((prev) => [doc, ...prev]);
      toast.success("Attachment uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleUpload(file);
    event.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleDownload = async (doc: ClinicWelcomeDocument) => {
    try {
      const res = await getClinicWelcomeDocumentDownloadUrl(clinicId, doc.documentId);
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Failed to get download URL");
    }
  };

  const handleDelete = async (doc: ClinicWelcomeDocument) => {
    if (!confirm(`Delete "${doc.fileName}"?`)) return;
    try {
      await deleteClinicWelcomeDocument(clinicId, doc.documentId);
      setDocuments((prev) => prev.filter((d) => d.documentId !== doc.documentId));
      toast.success("Document deleted");
    } catch {
      toast.error("Failed to delete document");
    }
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <FileText className="size-5" />;
    if (mimeType.startsWith("image/")) return <Image className="size-5" />;
    if (mimeType.startsWith("video/")) return <Video className="size-5" />;
    return <FileText className="size-5" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            Attachments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            Attachments
          </CardTitle>
          {canManage && (
            <div className="flex items-center gap-2">
              <label
                className={cn(
                  "relative flex cursor-pointer items-center justify-center rounded-lg border px-4 py-2 transition-colors",
                  "hover:bg-muted",
                  dragActive && "border-primary bg-primary/5"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <UploadCloud className="size-4 mr-2" />
                <span className="text-sm font-medium">Upload Document</span>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.mp4,.webm,.mov"
                  className="sr-only"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
              </label>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <FileText className="size-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No attachments uploaded yet.</p>
            {canManage && (
              <p className="text-sm text-muted-foreground mt-1">
                Upload PDFs, images, or videos to store them here.
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {documents.map((doc) => (
              <div key={doc.documentId} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
                  {getFileIcon(doc.mimeType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{doc.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatSize(doc.size)} • {doc.mimeType || "Unknown"} • v{doc.version}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(doc)}
                    disabled={uploading}
                    aria-label="Download"
                  >
                    <Download className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(doc)}
                    disabled={uploading}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}