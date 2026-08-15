"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ExclamationTriangleIcon as AlertTriangleIcon,
  PlusIcon,
  MagnifyingGlassIcon as Search,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Stats07 from "@/components/stats-07";
import { PrescriptionsTable, type Prescription } from "@/components/prescriptions-table";
import { PrescriptionPreviewPanel } from "@/components/prescription-preview-panel";
import { printPrescription } from "@/components/prescription-print";
import type { StatsItem } from "@/lib/stats";

export function PrescriptionsView({
  initialPrescriptions,
  stats,
}: {
  initialPrescriptions: Prescription[];
  stats?: StatsItem[];
}) {
  const [prescriptions, setPrescriptions] = useState(initialPrescriptions);
  const [previewPrescription, setPreviewPrescription] = useState<Prescription | null>(null);
  const [deleting, setDeleting] = useState<Prescription | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [diagnosisFilter, setDiagnosisFilter] = useState("");

  async function refetch() {
    const res = await fetch("/api/prescriptions", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setPrescriptions(data.prescriptions);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    const res = await fetch(`/api/prescriptions/${deleting.id}`, {
      method: "DELETE",
    });
    setDeleteBusy(false);
    if (res.ok) {
      toast.success("Prescription deleted", { description: deleting.patientName });
      setDeleting(null);
      await refetch();
    } else {
      const data = await res.json();
      toast.error(data.error || "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {previewPrescription && (
        <PrescriptionPreviewPanel
          prescription={previewPrescription}
          onClose={() => setPreviewPrescription(null)}
        />
      )}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="md:w-1/3">
            <h1 className="text-xl font-semibold tracking-tight">Prescriptions</h1>
            <p className="text-sm text-muted-foreground">
              Create and manage patient prescriptions.
            </p>
          </div>
          <div className="flex justify-center md:w-1/3">
            <div className="relative w-full max-w-sm">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient name or medicine..."
                className="pl-8"
                aria-label="Search prescriptions"
              />
            </div>
          </div>
          <div className="flex justify-end md:w-1/3">
            <Button
              size="sm"
              render={<Link href="/doctor/prescriptions/new" />}
              nativeButton={false}
            >
              <PlusIcon className="mr-1 size-3.5" aria-hidden="true" />
              New Prescription
            </Button>
          </div>
        </div>

        {stats && stats.length > 0 && (
          <Stats07 items={stats} className="border-0 bg-transparent p-0 shadow-none" />
        )}
      </div>

      <div className="flex flex-col gap-10">
        <PrescriptionsTable
          data={prescriptions}
          search={search}
          dateFilter={dateFilter}
          doctorFilter={doctorFilter}
          diagnosisFilter={diagnosisFilter}
          onDateFilterChange={setDateFilter}
          onDoctorFilterChange={setDoctorFilter}
          onDiagnosisFilterChange={setDiagnosisFilter}
          onPrint={printPrescription}
          onDelete={setDeleting}
          onPreview={setPreviewPrescription}
        />
      </div>

      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <div className="flex items-start space-x-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <DialogHeader>
              <DialogTitle>Delete prescription</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the prescription for{" "}
                <span className="font-medium text-foreground">
                  {deleting?.patientName}
                </span>{" "}
                (visit date {deleting?.visitDate ?? "—"})? This action cannot be
                undone.
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              onClick={confirmDelete}
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
