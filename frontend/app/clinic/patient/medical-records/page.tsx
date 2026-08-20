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
import { FileText, ChevronRight } from "lucide-react";

export default function PatientMedicalRecordsPage() {
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
        <div className="h-8 bg-slate-200 rounded w-1/4 animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Medical Records</h2>
          <p className="text-slate-500 mt-1">Access your medical history, diagnoses, and reports</p>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <FileText className="size-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900">No medical records yet</h3>
          <p className="text-slate-500 mt-2">Your medical records will appear here.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-100 bg-slate-50/50">
                <TableHead className="font-medium text-slate-500">Date</TableHead>
                <TableHead className="font-medium text-slate-500">Doctor</TableHead>
                <TableHead className="font-medium text-slate-500">Diagnosis</TableHead>
                <TableHead className="font-medium text-slate-500">Symptoms</TableHead>
                <TableHead className="font-medium text-slate-500">Treatment</TableHead>
                <TableHead className="font-medium text-slate-500 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.recordId} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <TableCell className="font-medium text-slate-900 whitespace-nowrap">{formatDate(record.visitDate)}</TableCell>
                  <TableCell>
                    <p className="font-medium text-slate-900">Dr. {record.doctorId?.slice(0, 8) || "Unknown"}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-slate-600 max-w-xs truncate">{record.diagnosis || "—"}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-slate-600 max-w-xs truncate">{record.symptoms || "—"}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-slate-600 max-w-xs truncate">{record.treatment || "—"}</p>
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