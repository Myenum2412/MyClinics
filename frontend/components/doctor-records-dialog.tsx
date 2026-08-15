"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Doctor } from "@/components/doctors-table";

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : dateFmt.format(parsed);
}

function inr(value: number | null | undefined) {
  return "₹" + (Number(value) || 0).toLocaleString("en-IN");
}

type Appointment = {
  id: string;
  fullName: string;
  mobile: string;
  age: string | null;
  gender: string | null;
  date: string;
  time: string;
  type: string;
  reason: string | null;
  status: string;
  notes: string | null;
  bookingSource: string;
};

type Prescription = {
  id: string;
  patientName: string;
  age: string | null;
  gender: string | null;
  phone: string | null;
  visitDate: string;
  diagnosis: string;
  medicines: { name?: string; dosage?: string }[];
  symptoms: string | null;
  testsRecommended: string | null;
  followUpDate: string | null;
};

type Bill = {
  id: string;
  billNumber: string;
  patientName: string;
  patientPhone: string | null;
  date: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  paymentMethod: string;
  status: string;
};

type RecordsPayload = {
  doctor: Doctor;
  appointments: Appointment[];
  prescriptions: Prescription[];
  bills: Bill[];
};

const pillClass =
  "inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground";

function RecordsContent({
  doctor,
  onClose,
}: {
  doctor: Doctor;
  onClose: () => void;
}) {
  const [records, setRecords] = useState<RecordsPayload | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/doctors/${doctor.id}/records`)
      .then(async (res) => {
        const data = (await res.json()) as RecordsPayload;
        if (!res.ok) {
          throw new Error(
            (data as { error?: string }).error || "Failed to load records"
          );
        }
        if (active) setRecords(data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setFailed(true);
        toast.error(
          err instanceof Error ? err.message : "Could not load doctor records."
        );
        onClose();
      });
    return () => {
      active = false;
    };
  }, [doctor.id, onClose]);

  if (failed) return null;

  if (!records) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Loading records…
      </div>
    );
  }

  const counts = {
    appointments: records.appointments.length,
    prescriptions: records.prescriptions.length,
    bills: records.bills.length,
  };

  return (
    <>
      <Tabs defaultValue="appointments">
        <TabsList>
          <TabsTrigger value="appointments">
            Appointments ({counts.appointments})
          </TabsTrigger>
          <TabsTrigger value="prescriptions">
            Prescriptions ({counts.prescriptions})
          </TabsTrigger>
          <TabsTrigger value="bills">Bills ({counts.bills})</TabsTrigger>
        </TabsList>

        <TabsContent
          value="appointments"
          className="overflow-y-auto rounded-lg border border-border"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason / Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.appointments.length ? (
                records.appointments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(a.date)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{a.time}</TableCell>
                    <TableCell className="font-medium">{a.fullName}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {a.mobile}
                    </TableCell>
                    <TableCell>
                      <span className={pillClass}>{a.type}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {a.status?.replace("_", " ")}
                    </TableCell>
                    <TableCell className="max-w-56 truncate text-muted-foreground">
                      {a.reason || a.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-20 text-center text-muted-foreground"
                  >
                    No appointments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent
          value="prescriptions"
          className="overflow-y-auto rounded-lg border border-border"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Visit Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Age / Gender</TableHead>
                <TableHead>Diagnosis</TableHead>
                <TableHead>Medicines</TableHead>
                <TableHead>Symptoms</TableHead>
                <TableHead>Tests</TableHead>
                <TableHead>Follow-up</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.prescriptions.length ? (
                records.prescriptions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(p.visitDate)}
                    </TableCell>
                    <TableCell className="font-medium">{p.patientName}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {p.age ? `${p.age} / ${p.gender ?? "—"}` : p.gender ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-48 truncate">{p.diagnosis}</TableCell>
                    <TableCell className="max-w-52 truncate text-muted-foreground">
                      {p.medicines.length
                        ? p.medicines
                            .map((m) => m.name ?? m.dosage ?? "")
                            .filter(Boolean)
                            .join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-40 truncate text-muted-foreground">
                      {p.symptoms || "—"}
                    </TableCell>
                    <TableCell className="max-w-40 truncate text-muted-foreground">
                      {p.testsRecommended || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(p.followUpDate)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-20 text-center text-muted-foreground"
                  >
                    No prescriptions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent
          value="bills"
          className="overflow-y-auto rounded-lg border border-border"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.bills.length ? (
                records.bills.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.billNumber}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(b.date)}
                    </TableCell>
                    <TableCell>{b.patientName}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {b.patientPhone || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {b.items.length}
                    </TableCell>
                    <TableCell className="font-medium tabular-nums">
                      {inr(b.total)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {b.paymentMethod}
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {b.status}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-20 text-center text-muted-foreground"
                  >
                    No bills found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Total working records:{" "}
        <span className="font-medium text-foreground">
          {counts.appointments + counts.prescriptions + counts.bills}
        </span>
      </p>
    </>
  );
}

export function DoctorRecordsDialog({
  doctor,
  open,
  onOpenChange,
}: {
  doctor: Doctor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90dvh] w-full max-w-4xl gap-3 sm:max-w-4xl"
      >
        <DialogHeader>
          <div className="flex items-start gap-3">
            <Avatar className="size-11">
              <AvatarImage
                src={doctor?.image ?? undefined}
                alt={doctor?.name ?? ""}
              />
              <AvatarFallback>
                {(doctor?.name ?? "")
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <DialogTitle className="flex items-center gap-2">
                {doctor?.name}
                {doctor?.status === "terminated" && (
                  <Badge variant="destructive">Terminated</Badge>
                )}
              </DialogTitle>
              <DialogDescription className="mt-0.5 line-clamp-1">
                {doctor?.email}
                {doctor?.specialty ? ` · ${doctor.specialty}` : ""}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {open && doctor && (
          <RecordsContent
            key={doctor.id}
            doctor={doctor}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}