"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Patient } from "@/components/patients-table";
import type { Appointment } from "@/components/appointments-table";
import type { Prescription } from "@/components/prescriptions-table";
import type { Bill } from "@/components/billing-table";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateFmt.format(parsed);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

const appointmentStatusVariant: Record<
  Appointment["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "secondary",
  confirmed: "default",
  completed: "outline",
  cancelled: "destructive",
  rescheduled: "outline",
  no_show: "destructive",
};

const billStatusVariant: Record<
  Bill["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  paid: "default",
  pending: "secondary",
  cancelled: "destructive",
};

type FetchedReports = {
  id: string;
  name: string;
  createdAt: string;
};

export function PatientViewDialog({
  patient,
  onClose,
  hideBilling = false,
}: {
  patient: Patient | null;
  onClose: () => void;
  hideBilling?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [reports, setReports] = useState<FetchedReports[]>([]);

  useEffect(() => {
    if (!patient) return;
    const current = patient;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const name = current.fullName.trim().toLowerCase();
      const mobile = (current.mobile || "").trim().toLowerCase();

      try {
        const results = await Promise.all([
          fetch("/api/appointments", { cache: "no-store" }),
          fetch("/api/prescriptions", { cache: "no-store" }),
          hideBilling
            ? Promise.resolve(null)
            : fetch("/api/bills", { cache: "no-store" }),
          fetch(`/api/reports?patient=${current.id}`, { cache: "no-store" }),
        ]);

        if (cancelled) return;

        const [aptRes, rxRes, billRes, reportRes] = results;

        const aptData = aptRes && aptRes.ok ? await aptRes.json() : null;
        const rxData = rxRes && rxRes.ok ? await rxRes.json() : null;
        const billData = billRes && billRes.ok ? await billRes.json() : null;
        const reportData =
          reportRes && reportRes.ok ? await reportRes.json() : null;

        const matchesName = (value?: string | null) =>
          (value ?? "").trim().toLowerCase() === name;
        const matchesMobile = (value?: string | null) =>
          !!mobile && (value ?? "").trim().toLowerCase() === mobile;

        setAppointments(
          (aptData?.appointments ?? []).filter(
            (a: Appointment) => matchesName(a.fullName) || matchesMobile(a.mobile)
          )
        );
        setPrescriptions(
          (rxData?.prescriptions ?? []).filter(
            (p: Prescription) => matchesName(p.patientName) || matchesMobile(p.phone)
          )
        );
        setBills(
          (billData?.bills ?? []).filter(
            (b: Bill) =>
              matchesName(b.patientName) || matchesMobile(b.patientPhone)
          )
        );
        setReports(
          (reportData?.files ?? []).map((f: FetchedReports) => ({
            id: f.id,
            name: f.name,
            createdAt: f.createdAt,
          }))
        );
      } catch {
        // Ignore fetch errors; show whatever loaded.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [patient, hideBilling]);

  return (
    <Dialog open={Boolean(patient)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] w-full max-w-2xl overflow-y-auto sm:max-w-2xl">
        {patient && (
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm font-semibold">
                {patient.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="min-w-0">
                <DialogTitle className="truncate">
                  {patient.fullName}
                </DialogTitle>
                <DialogDescription className="truncate">
                  Patient record · {patient.email ?? patient.mobile}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        )}

        {patient && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-4">
              <Row label="Full Name" value={patient.fullName} />
              <Row label="Mobile" value={patient.mobile} />
              <Row
                label="Secondary Mobile"
                value={patient.secondaryMobile ?? "—"}
              />
              <Row label="Age" value={patient.age ?? "—"} />
              <Row label="Gender" value={patient.gender ?? "—"} />
              <Row label="Email" value={patient.email ?? "—"} />
              <Row label="WhatsApp" value={patient.whatsapp ?? "—"} />
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Appointments ({appointments.length})
              </h3>
              {appointments.length ? (
                <div className="flex flex-col gap-2">
                  {appointments.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          {formatDate(a.date)} · {a.time}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {a.doctorName ?? "—"} · {a.type === "video" ? "Video" : "In-person"}
                        </p>
                      </div>
                      <Badge
                        variant={appointmentStatusVariant[a.status]}
                        className="text-xs capitalize"
                      >
                        {a.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <p className="text-sm text-muted-foreground">No appointments.</p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Prescriptions ({prescriptions.length})
              </h3>
              {prescriptions.length ? (
                <div className="flex flex-col gap-2">
                  {prescriptions.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          {formatDate(p.visitDate)} · {p.diagnosis}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.doctorName ?? "—"} ·{" "}
                          {p.medicines.length}{" "}
                          {p.medicines.length === 1 ? "medicine" : "medicines"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <p className="text-sm text-muted-foreground">No prescriptions.</p>
              )}
            </div>

            {!hideBilling && (
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                  Bills ({bills.length})
                </h3>
                {bills.length ? (
                  <div className="flex flex-col gap-2">
                    {bills.map((b) => (
                      <div
                        key={b.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">
                            {b.billNumber} · {formatDate(b.date)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {b.paymentMethod} · {b.items.length} items
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium tabular-nums">
                            ₹{b.total.toLocaleString("en-IN")}
                          </span>
                          <Badge
                            variant={billStatusVariant[b.status]}
                            className="text-xs capitalize"
                          >
                            {b.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : loading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No bills.</p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Reports ({reports.length})
              </h3>
              {reports.length ? (
                <div className="flex flex-col gap-2">
                  {reports.map((f) => (
                    <div
                      key={f.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
                    >
                      <p className="min-w-0 truncate font-medium">{f.name}</p>
                      <p className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(f.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading patient records...
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No reports.</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
