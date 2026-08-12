"use client";

import { useRef, useState } from "react";
import { CloudUpload, FileUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
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
import { cn } from "@/lib/utils";
import { formatBytes } from "@/components/reports-utils";
import {
  categoryLabel,
  FILE_CATEGORIES,
  type PatientOption,
  type ReportFile,
} from "@/lib/report-folders";

type PrescriptionOption = {
  id: string;
  label: string;
};

export function ReportsUploadDialog({
  open,
  onOpenChange,
  patients,
  defaultPatientId,
  defaultCategory,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patients: PatientOption[];
  defaultPatientId: string | null;
  defaultCategory: string;
  onUploaded: (files: ReportFile[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [patientId, setPatientId] = useState<string>(defaultPatientId ?? "");
  const [category, setCategory] = useState<string>(defaultCategory ?? "upload");
  const [prescriptionId, setPrescriptionId] = useState<string>("");
  const [prescriptions, setPrescriptions] = useState<PrescriptionOption[]>([]);
  const [uploading, setUploading] = useState(false);

  function reset() {
    setFiles([]);
    setPatientId(defaultPatientId ?? "");
    setCategory(defaultCategory ?? "upload");
    setPrescriptionId("");
    setPrescriptions([]);
  }

  function addFiles(list: FileList | File[]) {
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function loadPrescriptions(patientName: string) {
    setPrescriptionId("");
    if (!patientName) {
      setPrescriptions([]);
      return;
    }
    try {
      const res = await fetch("/api/prescriptions", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const options: PrescriptionOption[] = (data.prescriptions ?? [])
        .filter(
          (p: { patientName: string }) =>
            p.patientName?.toLowerCase() === patientName.toLowerCase()
        )
        .map((p: { id: string; visitDate: string; diagnosis: string }) => ({
          id: p.id,
          label: `${p.visitDate ?? "No date"} · ${p.diagnosis || "Prescription"}`,
        }));
      setPrescriptions(options);
    } catch {
      setPrescriptions([]);
    }
  }

  async function handleUpload() {
    if (!files.length) {
      toast.error("Choose at least one file to upload.");
      return;
    }
    if (!patientId) {
      toast.error("Choose a patient for these files.");
      return;
    }

    setUploading(true);
    const selectedPatient = patients.find((p) => p.id === patientId);
    const selectedPrescription = prescriptions.find((p) => p.id === prescriptionId);
    const uploaded: ReportFile[] = [];
    let failed = 0;

    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      form.append("category", category);
      if (selectedPatient) {
        form.append("patientId", selectedPatient.id);
        form.append("patientName", selectedPatient.fullName);
      }
      if (selectedPrescription) {
        form.append("prescriptionId", selectedPrescription.id);
        form.append("prescriptionLabel", selectedPrescription.label);
      }

      try {
        const res = await fetch("/api/reports", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (res.ok && data.file) {
          uploaded.push(data.file);
        } else {
          failed += 1;
          toast.error(data.error || `Failed to upload ${file.name}`);
        }
      } catch {
        failed += 1;
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);

    if (uploaded.length) {
      toast.success(
        uploaded.length === 1
          ? "File uploaded"
          : `${uploaded.length} files uploaded`
      );
      onUploaded(uploaded);
      reset();
      onOpenChange(false);
    } else if (failed) {
      toast.error("Upload failed. Please try again.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next && !uploading) reset();
      }}
    >
      <DialogContent className="max-h-[90vh] w-full max-w-xl overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload files</DialogTitle>
          <DialogDescription>
            Add files to a patient&apos;s record. Files show only in the selected
            patient&apos;s folder.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center outline-none transition-colors",
              dragging
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/30 hover:border-primary/50"
            )}
          >
            <CloudUpload
              className={cn("size-8", dragging ? "text-primary" : "text-muted-foreground")}
            />
            <p className="text-sm font-medium">
              {dragging ? "Drop files here" : "Drag & drop files here"}
            </p>
            <p className="text-xs text-muted-foreground">
              or click to browse · up to 50 MB per file
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {files.length > 0 && (
            <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
              {files.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileUp className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm">{file.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatBytes(file.size)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="upload-patient" className="text-sm font-medium">
                Patient <span className="text-destructive">*</span>
              </label>
              <Select
                value={patientId}
                onValueChange={(value) => {
                  setPatientId(value ?? "");
                  const patient = patients.find((p) => p.id === value);
                  void loadPrescriptions(patient?.fullName ?? "");
                }}
              >
                <SelectTrigger id="upload-patient" className="w-full">
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="upload-category" className="text-sm font-medium">
                Document type
              </label>
              <Select value={category} onValueChange={(value) => setCategory(value ?? "upload")}>
                <SelectTrigger id="upload-category" className="w-full">
                  <SelectValue />
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
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="upload-prescription" className="text-sm font-medium">
              Related prescription
            </label>
            <Select
              value={prescriptionId}
              onValueChange={(value) => setPrescriptionId(value ?? "")}
              disabled={!patientId || !prescriptions.length}
            >
              <SelectTrigger id="upload-prescription" className="w-full">
                <SelectValue
                  placeholder={
                    !patientId
                      ? "Select a patient first"
                      : prescriptions.length
                        ? "Select prescription (optional)"
                        : "No prescriptions found for this patient"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {prescriptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            File will be stored under {categoryLabel(category)} for the selected
            patient.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !files.length}>
            {uploading ? "Uploading..." : `Upload ${files.length ? `(${files.length})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
