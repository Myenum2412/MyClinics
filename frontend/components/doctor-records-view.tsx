"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  ArrowLeftIcon as ArrowLeft,
  ExclamationTriangleIcon as AlertTriangleIcon,
  UserMinusIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import type { Doctor } from "@/components/doctors-table";

export type DoctorAppointment = {
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
};

export type DoctorPrescription = {
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

export type DoctorBill = {
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

export type DoctorMedicine = {
  name: string;
  frequency: string | null;
  count: number;
};

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

const pillClass =
  "inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground";

export function DoctorRecordsView({
  doctor,
  appointments,
  prescriptions,
  bills,
  medicines,
}: {
  doctor: Doctor;
  appointments: DoctorAppointment[];
  prescriptions: DoctorPrescription[];
  bills: DoctorBill[];
  medicines: DoctorMedicine[];
}) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const counts = {
    appointments: appointments.length,
    prescriptions: prescriptions.length,
    bills: bills.length,
    medicines: medicines.length,
  };

  const reactivate = doctor.status === "terminated";

  async function handleToggleStatus() {
    setBusy(true);
    const res = await fetch(`/api/doctors/${doctor.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: reactivate ? "active" : "terminated" }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(data.error || "Something went wrong. Please try again.");
      return;
    }
    toast.success(reactivate ? "Doctor re-activated." : "Doctor terminated.");
    setConfirming(false);
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <Link href="/doctor/doctors">
            <Button variant="outline" size="icon-sm" aria-label="Back to doctors">
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Button>
          </Link>
          <Avatar className="size-11">
            <AvatarImage src={doctor.image ?? undefined} alt={doctor.name} />
            <AvatarFallback>
              {doctor.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              {doctor.name}
              {doctor.status === "terminated" && (
                <Badge variant="destructive">Terminated</Badge>
              )}
            </h1>
            <p className="truncate text-sm text-muted-foreground">
              {doctor.email}
              {doctor.specialty ? ` · ${doctor.specialty}` : ""}
              {doctor.city ? ` · ${doctor.city}` : ""}
            </p>
          </div>
          {reactivate ? (
            <Button
              variant="outline"
              onClick={() => setConfirming(true)}
              disabled={busy}
            >
              <UserPlusIcon className="mr-1 size-4" aria-hidden="true" />
              Re-activate
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={() => setConfirming(true)}
              disabled={busy}
            >
              <UserMinusIcon className="mr-1 size-4" aria-hidden="true" />
              Terminate
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="appointments">
        <TabsList>
          <TabsTrigger value="appointments">
            Appointments ({counts.appointments})
          </TabsTrigger>
          <TabsTrigger value="prescriptions">
            Prescriptions ({counts.prescriptions})
          </TabsTrigger>
          <TabsTrigger value="bills">Bills ({counts.bills})</TabsTrigger>
          <TabsTrigger value="medicines">
            Medicines ({counts.medicines})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="appointments">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Appointments
          </h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
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
                {appointments.length ? (
                  appointments.map((a) => (
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
          </div>
        </TabsContent>

        <TabsContent value="prescriptions">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Prescriptions
          </h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
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
                {prescriptions.length ? (
                  prescriptions.map((p) => (
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
          </div>
        </TabsContent>

        <TabsContent value="bills">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Bills
          </h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
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
                {bills.length ? (
                  bills.map((b) => (
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
          </div>
        </TabsContent>

        <TabsContent value="medicines">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Medicines
          </h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Times Prescribed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {medicines.length ? (
                  medicines.map((m, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.frequency || "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">{m.count}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-20 text-center text-muted-foreground"
                    >
                      No medicines prescribed yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Total working records:{" "}
        <span className="font-medium text-foreground">
          {counts.appointments +
            counts.prescriptions +
            counts.bills +
            counts.medicines}
        </span>
      </p>

      <Dialog open={confirming} onOpenChange={(open) => !open && setConfirming(false)}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex items-start space-x-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <DialogHeader>
              {reactivate ? (
                <>
                  <DialogTitle>Re-activate doctor</DialogTitle>
                  <DialogDescription>
                    Allow{" "}
                    <span className="font-medium text-foreground">
                      {doctor.name}
                    </span>{" "}
                    ({doctor.email}) to sign in and appear in appointment
                    bookings again.
                  </DialogDescription>
                </>
              ) : (
                <>
                  <DialogTitle>Terminate doctor</DialogTitle>
                  <DialogDescription>
                    Terminate the account for{" "}
                    <span className="font-medium text-foreground">
                      {doctor.name}
                    </span>{" "}
                    ({doctor.email})? They will no longer be able to sign in or
                    appear in appointment bookings. You can re-activate them
                    later.
                  </DialogDescription>
                </>
              )}
            </DialogHeader>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant="destructive"
              onClick={handleToggleStatus}
              disabled={busy}
            >
              {busy ? "Saving..." : reactivate ? "Re-activate" : "Terminate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}