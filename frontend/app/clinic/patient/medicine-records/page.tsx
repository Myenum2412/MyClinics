"use client";

import { useEffect, useState } from "react";
import { useRequireRole } from "@/hooks/use-clinic-session";
import { myRecords, type MedicineRecord } from "@/lib/clinic-api";
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
import { ChevronRight, Pill } from "lucide-react";

export default function PatientMedicineRecordsPage() {
  const session = useRequireRole("patient");
  const [records, setRecords] = useState<MedicineRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.clinicId) return;
    myRecords(session.clinicId)
      .then((res) => {
        setRecords(res.items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session?.clinicId]);

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
          <h2 className="text-2xl font-bold text-foreground">My Medicine Records</h2>
          <p className="text-muted-foreground mt-1">Track your medicine intake and pharmacy records</p>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="rounded-xl border border-border bg-background p-12 text-center">
          <Pill className="size-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">No medicine records yet</h3>
          <p className="text-muted-foreground mt-2">Your pharmacy and medicine records will appear here.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/50">
                <TableHead className="font-medium text-muted-foreground">Date</TableHead>
                <TableHead className="font-medium text-muted-foreground">Doctor</TableHead>
                <TableHead className="font-medium text-muted-foreground">Diagnosis</TableHead>
                <TableHead className="font-medium text-muted-foreground">Notes</TableHead>
                <TableHead className="font-medium text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.recordId} className="border-b border-border hover:bg-muted/50">
                  <TableCell className="font-medium text-foreground whitespace-nowrap">{formatDate(record.visitDate)}</TableCell>
                  <TableCell>
                    <p className="font-medium text-foreground">Dr. {record.doctorId?.slice(0, 8) || "Unknown"}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-muted-foreground max-w-xs truncate">{record.diagnosis || "—"}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-muted-foreground max-w-xs truncate">{record.notes || "—"}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="gap-1.5">
                      <ChevronRight className="size-4" />
                      View
                    </Button>
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