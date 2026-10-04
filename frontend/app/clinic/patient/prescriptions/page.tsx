"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { myPrescriptions, listDoctors, downloadMyPrescriptionPdf, type Prescription, type MedicineEntry, type Doctor } from "@/lib/clinic-api";
import { formatDate } from "@/lib/format-time";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pill, ChevronRight, Download, Loader2 } from "lucide-react";

export default function PatientPrescriptionsPage() {
  const session = useRequireRole("patient");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.clinicId) return;
    Promise.allSettled([
      myPrescriptions(session.clinicId),
      listDoctors(session.clinicId, { limit: 50 }),
    ]).then(([prescRes, doctorsRes]) => {
      if (prescRes.status === "fulfilled") setPrescriptions((prescRes.value as any)?.items ?? []);
      if (doctorsRes.status === "fulfilled") setDoctors((doctorsRes.value as any)?.items ?? []);
      setLoading(false);
    });
  }, [session?.clinicId]);

  const doctorName = (id: string) => doctors.find((d) => d.doctorId === id)?.name ?? "Unknown doctor";

  const handleDownloadPdf = async (presc: Prescription) => {
    if (!session?.clinicId) return;
    try {
      setDownloadingId(presc.prescriptionId);
      const filename = `prescription-${presc.visitDate}-${presc.prescriptionId.slice(0, 8)}.pdf`;
      await downloadMyPrescriptionPdf(session.clinicId, presc.prescriptionId, filename);
      toast.success("Prescription PDF downloaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Prescriptions</h2>
          <p className="text-muted-foreground mt-1">View your prescribed medications and dosage instructions</p>
        </div>
      </div>

      {prescriptions.length === 0 ? (
        <div className="rounded-xl border border-border bg-background p-12 text-center">
          <Pill className="size-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">No prescriptions yet</h3>
          <p className="text-muted-foreground mt-2">Your prescribed medications will appear here.</p>
        </div>
      ) : (
        <div className="border border-border bg-background shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/50">
                <TableHead className="font-medium text-muted-foreground">Date</TableHead>
                <TableHead className="font-medium text-muted-foreground">Doctor</TableHead>
                <TableHead className="font-medium text-muted-foreground">Diagnosis</TableHead>
                <TableHead className="font-medium text-muted-foreground">Medicines</TableHead>
                <TableHead className="font-medium text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prescriptions.map((presc) => (
                <TableRow key={presc.prescriptionId} className="border-b border-border hover:bg-muted/50">
                  <TableCell className="font-medium text-foreground whitespace-nowrap">{formatDate(presc.visitDate)}</TableCell>
                  <TableCell>
                    <p className="font-medium text-foreground">Dr. {doctorName(presc.doctorId)}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-muted-foreground max-w-xs truncate">{presc.diagnosis || "—"}</p>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {presc.medicines?.slice(0, 3).map((m: MedicineEntry, i: number) => (
                        <div key={i} className="text-sm text-muted-foreground flex items-center gap-1">
                          <Pill className="size-3.5" />
                          <span>{m.name} - {m.dosage} ({m.frequency})</span>
                        </div>
                      ))}
                      {presc.medicines && presc.medicines.length > 3 && (
                        <p className="text-xs text-muted-foreground">+{presc.medicines.length - 3} more</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label="Download PDF"
                        title="Download PDF"
                        disabled={downloadingId === presc.prescriptionId}
                        onClick={() => handleDownloadPdf(presc)}
                      >
                        {downloadingId === presc.prescriptionId ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Download className="size-4" />
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1.5">
                        <ChevronRight className="size-4" />
                        View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}