"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon as ArrowLeft,
  ArrowUpTrayIcon as Upload,
  BanknotesIcon as Banknotes,
  BeakerIcon as Beaker,
  CalendarDaysIcon as CalendarDays,
  ChevronRightIcon as ChevronRight,
  DocumentTextIcon as DocumentText,
  FolderIcon as Folder,
  MagnifyingGlassIcon as Search,
  UserCircleIcon as UserRound,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  PATIENT_FOLDER_LABELS,
  type PatientFolderEntry,
  type PatientFolderItem,
  type PatientFolderKind,
} from "@/lib/patient-folders";

const FOLDER_ICON: Record<PatientFolderKind, typeof Folder> = {
  appointments: CalendarDays,
  patients: UserRound,
  prescriptions: DocumentText,
  medicines: Beaker,
  billing: Banknotes,
  reports: Folder,
};

const FOLDER_COLOR: Record<PatientFolderKind, string> = {
  appointments: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  patients: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  prescriptions: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  medicines: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  billing: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  reports: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function formatDate(value: unknown) {
  if (!value) return "—";
  const d = new Date(String(value));
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function PatientAvatar({ name }: { name: string }) {
  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-semibold text-white">
      {initialsOf(name) || "?"}
    </div>
  );
}

function FolderCard({
  kind,
  count,
  onClick,
}: {
  kind: PatientFolderKind;
  count: number;
  onClick: () => void;
}) {
  const Icon = FOLDER_ICON[kind];
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition hover:border-primary/40 hover:shadow-sm"
    >
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-lg",
          FOLDER_COLOR[kind]
        )}
      >
        <Icon className="size-6" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{PATIENT_FOLDER_LABELS[kind]}</p>
        <p className="text-xs text-muted-foreground">
          {count} item{count === 1 ? "" : "s"}
        </p>
      </div>
    </button>
  );
}

// ---- Part 2 appended below ----

function ProfileView({ item }: { item: PatientFolderItem }) {
  const rows: [string, unknown][] = [
    ["Full name", item.fullName],
    ["Mobile", item.mobile],
    ["Secondary mobile", item.secondaryMobile],
    ["Email", item.email],
    ["WhatsApp", item.whatsapp],
    ["Age", item.age],
    ["Gender", item.gender],
    ["Blood group", item.bloodGroup],
    ["Date of birth", item.dateOfBirth],
    ["Weight", item.weight],
    ["Height", item.height],
    ["Address", item.address],
    ["City", item.city],
    ["Pincode", item.pincode],
    ["Occupation", item.occupation],
    ["Guardian", item.guardianName],
    ["Marital status", item.maritalStatus],
    ["Allergies", item.allergies],
    ["Current medications", item.currentMedications],
    ["Previous surgeries", item.previousSurgeries],
    ["Family history", item.familyHistory],
    ["Notes", item.notes],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows
        .filter(([, v]) => v !== null && v !== undefined && v !== "")
        .map(([label, value]) => (
          <div key={label} className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-medium">{String(value)}</p>
          </div>
        ))}
    </div>
  );
}

function StatusBadge({ value }: { value: unknown }) {
  const status = String(value ?? "scheduled").toLowerCase();
  const tone =
    status === "paid" || status === "completed"
      ? "bg-emerald-500/10 text-emerald-600"
      : status === "cancelled"
        ? "bg-rose-500/10 text-rose-600"
        : "bg-blue-500/10 text-blue-600";
  return <Badge className={cn(tone)}>{status}</Badge>;
}

function ItemTable({
  folder,
  items,
}: {
  folder: PatientFolderKind;
  items: PatientFolderItem[];
}) {
  if (folder === "patients") {
    return items.length ? <ProfileView item={items[0]} /> : null;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
        <Folder className="size-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          No {PATIENT_FOLDER_LABELS[folder].toLowerCase()} for this patient yet.
        </p>
      </div>
    );
  }

  if (folder === "appointments") {
    return (
      <div className="divide-y overflow-hidden rounded-xl border bg-card">
        {items.map((a) => (
          <div key={String(a.id)} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {formatDate(a.date)}
                {a.time ? (
                  <span className="text-muted-foreground"> · {String(a.time)}</span>
                ) : null}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {String(a.reason ?? a.department ?? a.doctorName ?? "Appointment")}
              </p>
            </div>
            <Badge variant="secondary">{String(a.type ?? "in-person")}</Badge>
            <StatusBadge value={a.status} />
          </div>
        ))}
      </div>
    );
  }

  if (folder === "prescriptions") {
    return (
      <div className="divide-y overflow-hidden rounded-xl border bg-card">
        {items.map((p) => (
          <div key={String(p.id)} className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{formatDate(p.visitDate)}</p>
              <Badge variant="secondary">{String(p.doctorName ?? "Doctor")}</Badge>
              {Array.isArray(p.medicines) ? (
                <Badge>
                  {p.medicines.length} medicine{p.medicines.length === 1 ? "" : "s"}
                </Badge>
              ) : null}
            </div>
            {p.diagnosis ? (
              <p className="mt-2 text-sm">
                <span className="text-muted-foreground">Diagnosis: </span>
                {String(p.diagnosis)}
              </p>
            ) : null}
            {Array.isArray(p.medicines) && p.medicines.length > 0 ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {p.medicines.map((m, i) => (
                  <div key={i} className="rounded-lg bg-muted/60 p-3 text-sm">
                    <p className="font-medium">
                      {String(m.name ?? "Medicine")}
                      {m.dosage ? (
                        <span className="text-muted-foreground"> — {String(m.dosage)}</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[m.frequency, m.duration, m.beforeAfterFood]
                        .filter(Boolean)
                        .map(String)
                        .join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  if (folder === "medicines") {
    return (
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Medicine</th>
              <th className="px-4 py-3">Dosage</th>
              <th className="px-4 py-3">Frequency</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Timing</th>
              <th className="px-4 py-3">Instructions</th>
              <th className="px-4 py-3">Visit</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((m, i) => (
              <tr key={`${String(m.prescriptionId)}-${i}`}>
                <td className="px-4 py-3 font-medium">{String(m.name ?? "—")}</td>
                <td className="px-4 py-3">{String(m.dosage ?? "—")}</td>
                <td className="px-4 py-3">{String(m.frequency ?? "—")}</td>
                <td className="px-4 py-3">{String(m.duration ?? "—")}</td>
                <td className="px-4 py-3">{String(m.beforeAfterFood ?? "—")}</td>
                <td className="px-4 py-3">
                  {String(m.specialInstructions ?? m.instructions ?? "—")}
                </td>
                <td className="px-4 py-3">{formatDate(m.visitDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (folder === "billing") {
    return (
      <div className="divide-y overflow-hidden rounded-xl border bg-card">
        {items.map((b) => (
          <div key={String(b.id)} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {String(b.billNumber ?? "Bill")} · {formatDate(b.date)}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {String(b.paymentMethod ?? "—")}
                {b.notes ? ` · ${String(b.notes)}` : ""}
              </p>
            </div>
            <p className="text-sm font-semibold">
              {typeof b.total === "number"
                ? `₹${b.total.toLocaleString("en-IN")}`
                : String(b.total ?? "—")}
            </p>
            <StatusBadge value={b.status} />
            <Button size="sm" variant="outline" render={<a href={`/api/bills/${String(b.id)}/pdf`} download />}>
              PDF
            </Button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y overflow-hidden rounded-xl border bg-card">
      {items.map((f) => (
        <div key={String(f.id)} className="flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <Link
              href={`/doctor/reports/${String(f.id)}`}
              className="text-sm font-medium hover:underline"
            >
              {String(f.name ?? "File")}
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {String(f.category ?? "upload")} · {formatBytes(Number(f.size ?? 0))} ·{" "}
              {formatDate(f.createdAt)}
            </p>
          </div>
          <Button size="sm" variant="outline" render={<Link href={`/doctor/reports/${String(f.id)}`} />}>
            Open
          </Button>
        </div>
      ))}
    </div>
  );
}

export function PatientFoldersView({
  initialPatients,
  error,
}: {
  initialPatients: PatientFolderEntry[];
  error: string | null;
}) {
  const [patients] = useState(initialPatients);
  const [search, setSearch] = useState("");
  const [activePatient, setActivePatient] = useState<PatientFolderEntry | null>(null);
  const [activeFolder, setActiveFolder] = useState<PatientFolderKind | null>(null);
  const [items, setItems] = useState<PatientFolderItem[]>([]);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) || p.mobile.toLowerCase().includes(q)
    );
  }, [patients, search]);

  const openFolder = useCallback(
    async (patient: PatientFolderEntry, folder: PatientFolderKind) => {
      setActivePatient(patient);
      setActiveFolder(folder);
      setItems([]);
      setLoading(true);
      try {
        const res = await fetch(`/api/patient-folders/${patient.id}/${folder}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok) setItems(Array.isArray(data.items) ? data.items : []);
        else setItems([]);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const goBack = useCallback(() => {
    if (activeFolder) {
      setActiveFolder(null);
      setItems([]);
    } else {
      setActivePatient(null);
    }
  }, [activeFolder]);

  const breadcrumbs = useMemo(() => {
    const parts = ["My Drive"];
    if (activePatient) parts.push(activePatient.fullName);
    if (activeFolder) parts.push(PATIENT_FOLDER_LABELS[activeFolder]);
    return parts;
  }, [activePatient, activeFolder]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={goBack}
            disabled={!activePatient}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb} className="flex items-center gap-1.5">
                {i > 0 ? <ChevronRight className="size-3.5" /> : null}
                <span className={i === breadcrumbs.length - 1 ? "text-foreground" : ""}>
                  {crumb}
                </span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!activePatient ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patients…"
                className="w-64 pl-9"
              />
            </div>
          ) : null}
          <Button size="sm" render={<Link href="/doctor/reports/new" />}>
            <Upload className="size-4" /> Upload
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-400">
          {error}
        </div>
      ) : null}

      {!activePatient ? (
        <div>
          <h2 className="mb-4 text-lg font-semibold">Patients</h2>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
              <Folder className="size-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                {patients.length === 0
                  ? "No patients yet. Patient folders are created automatically here."
                  : "No patients match your search."}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePatient(p)}
                  className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition hover:border-primary/40 hover:shadow-sm"
                >
                  <PatientAvatar name={p.fullName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.mobile || "No mobile"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(
                        [
                          ["appointments", "Appointments"],
                          ["prescriptions", "Rx"],
                          ["medicines", "Medicines"],
                          ["billing", "Bills"],
                          ["reports", "Reports"],
                        ] as const
                      ).map(([kind, label]) =>
                        p.folders[kind] > 0 ? (
                          <Badge key={kind} variant="secondary">
                            {label} {p.folders[kind]}
                          </Badge>
                        ) : null
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : activeFolder === null ? (
        <div>
          <h2 className="mb-4 text-lg font-semibold">{activePatient.fullName}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                "appointments",
                "patients",
                "prescriptions",
                "medicines",
                "billing",
                "reports",
              ] as const
            ).map((kind) => (
              <FolderCard
                key={kind}
                kind={kind}
                count={activePatient.folders[kind]}
                onClick={() => openFolder(activePatient, kind)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div>
          <h2 className="mb-4 text-lg font-semibold">
            {PATIENT_FOLDER_LABELS[activeFolder]}
          </h2>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              Loading…
            </div>
          ) : (
            <ItemTable folder={activeFolder} items={items} />
          )}
        </div>
      )}
    </div>
  );
}