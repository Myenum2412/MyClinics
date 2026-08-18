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
  FolderPlusIcon as FolderPlus,
  MagnifyingGlassIcon as Search,
  UserCircleIcon as UserRound,
  UsersIcon as Users,
  ClipboardDocumentListIcon as ClipboardList,
  ArrowDownTrayIcon as ArrowDownTray,
  SparklesIcon as Sparkles,
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

const AVATAR_GRADIENTS = [
  "from-blue-500 to-cyan-400",
  "from-violet-500 to-fuchsia-400",
  "from-emerald-500 to-teal-400",
  "from-rose-500 to-orange-400",
  "from-indigo-500 to-blue-400",
  "from-amber-500 to-yellow-400",
  "from-pink-500 to-rose-400",
];

const FOLDER_META: Record<
  PatientFolderKind,
  { icon: typeof Folder; gradient: string; soft: string }
> = {
  appointments: {
    icon: CalendarDays,
    gradient: "from-blue-500 to-cyan-400",
    soft: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  patients: {
    icon: UserRound,
    gradient: "from-violet-500 to-purple-400",
    soft: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  prescriptions: {
    icon: DocumentText,
    gradient: "from-rose-500 to-pink-400",
    soft: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  medicines: {
    icon: Beaker,
    gradient: "from-amber-500 to-orange-400",
    soft: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  billing: {
    icon: Banknotes,
    gradient: "from-emerald-500 to-teal-400",
    soft: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  reports: {
    icon: Folder,
    gradient: "from-slate-500 to-slate-400",
    soft: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  },
};

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function gradientFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
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

function PatientAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "sm" ? "size-8 text-xs" : size === "lg" ? "size-16 text-xl" : "size-10 text-sm";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-md",
        gradientFor(name),
        sizeClass
      )}
    >
      {initialsOf(name) || "?"}
    </div>
  );
}

function StatusBadge({ value }: { value: unknown }) {
  const status = String(value ?? "scheduled").toLowerCase();
  const tone =
    status === "paid" || status === "completed"
      ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20"
      : status === "cancelled"
        ? "bg-rose-500/10 text-rose-600 ring-rose-500/20"
        : "bg-blue-500/10 text-blue-600 ring-blue-500/20";
  return (
    <Badge className={cn("capitalize ring-1", tone)}>{status}</Badge>
  );
}

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
          <div
            key={label}
            className="rounded-xl border bg-card/70 p-3.5 transition hover:border-primary/30 hover:shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-sm font-semibold">{String(value)}</p>
          </div>
        ))}
    </div>
  );
}

// ---- ItemTable below ----

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
    const meta = FOLDER_META[folder];
    const Icon = meta.icon;
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed py-20 text-center">
        <div
          className={cn(
            "flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg",
            meta.gradient
          )}
        >
          <Icon className="size-7 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold">
            No {PATIENT_FOLDER_LABELS[folder].toLowerCase()} yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {folder === "reports"
              ? "Upload reports and they will appear here automatically."
              : "New records for this patient will show up here automatically."}
          </p>
        </div>
      </div>
    );
  }

  if (folder === "appointments") {
    return (
      <div className="overflow-hidden rounded-2xl border bg-card/70">
        <div className="divide-y">
          {items.map((a) => (
            <div
              key={String(a.id)}
              className="flex flex-wrap items-center gap-3 p-4 transition hover:bg-muted/40"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <CalendarDays className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {formatDate(a.date)}
                  {a.time ? (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      · {String(a.time)}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {String(a.reason ?? a.department ?? a.doctorName ?? "Appointment")}
                </p>
              </div>
              <Badge variant="secondary" className="capitalize">
                {String(a.type ?? "in-person")}
              </Badge>
              <StatusBadge value={a.status} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (folder === "prescriptions") {
    return (
      <div className="overflow-hidden rounded-2xl border bg-card/70">
        <div className="divide-y">
          {items.map((p) => (
            <div key={String(p.id)} className="p-5 transition hover:bg-muted/40">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <DocumentText className="size-5" />
                </div>
                <p className="text-sm font-semibold">{formatDate(p.visitDate)}</p>
                <Badge variant="secondary">{String(p.doctorName ?? "Doctor")}</Badge>
                {Array.isArray(p.medicines) ? (
                  <Badge className="bg-rose-500/10 text-rose-600">
                    {p.medicines.length} medicine{p.medicines.length === 1 ? "" : "s"}
                  </Badge>
                ) : null}
              </div>
              {p.diagnosis ? (
                <p className="mt-3 text-sm">
                  <span className="text-muted-foreground">Diagnosis: </span>
                  <span className="font-medium">{String(p.diagnosis)}</span>
                </p>
              ) : null}
              {Array.isArray(p.medicines) && p.medicines.length > 0 ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {p.medicines.map((m, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-gradient-to-br from-rose-500/5 to-pink-500/5 p-3 text-sm ring-1 ring-rose-500/10"
                    >
                      <p className="font-semibold">
                        {String(m.name ?? "Medicine")}
                        {m.dosage ? (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            — {String(m.dosage)}
                          </span>
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
      </div>
    );
  }

  if (folder === "medicines") {
    return (
      <div className="overflow-x-auto rounded-2xl border bg-card/70">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b bg-gradient-to-r from-amber-500/10 to-orange-500/5 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-5 py-3.5 font-semibold">Medicine</th>
              <th className="px-5 py-3.5 font-semibold">Dosage</th>
              <th className="px-5 py-3.5 font-semibold">Frequency</th>
              <th className="px-5 py-3.5 font-semibold">Duration</th>
              <th className="px-5 py-3.5 font-semibold">Timing</th>
              <th className="px-5 py-3.5 font-semibold">Instructions</th>
              <th className="px-5 py-3.5 font-semibold">Visit</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((m, i) => (
              <tr
                key={`${String(m.prescriptionId)}-${i}`}
                className="transition hover:bg-amber-500/5"
              >
                <td className="px-5 py-3.5 font-semibold">
                  <span className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-amber-500" />
                    {String(m.name ?? "—")}
                  </span>
                </td>
                <td className="px-5 py-3.5">{String(m.dosage ?? "—")}</td>
                <td className="px-5 py-3.5">{String(m.frequency ?? "—")}</td>
                <td className="px-5 py-3.5">{String(m.duration ?? "—")}</td>
                <td className="px-5 py-3.5">{String(m.beforeAfterFood ?? "—")}</td>
                <td className="px-5 py-3.5">
                  {String(m.specialInstructions ?? m.instructions ?? "—")}
                </td>
                <td className="px-5 py-3.5 text-muted-foreground">
                  {formatDate(m.visitDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (folder === "billing") {
    return (
      <div className="overflow-hidden rounded-2xl border bg-card/70">
        <div className="divide-y">
          {items.map((b) => (
            <div
              key={String(b.id)}
              className="flex flex-wrap items-center gap-3 p-4 transition hover:bg-muted/40"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Banknotes className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {String(b.billNumber ?? "Bill")} ·{" "}
                  <span className="font-normal text-muted-foreground">
                    {formatDate(b.date)}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {String(b.paymentMethod ?? "—")}
                  {b.notes ? ` · ${String(b.notes)}` : ""}
                </p>
              </div>
              <p className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-base font-bold text-transparent">
                {typeof b.total === "number"
                  ? `₹${b.total.toLocaleString("en-IN")}`
                  : String(b.total ?? "—")}
              </p>
              <StatusBadge value={b.status} />
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-emerald-500/30 bg-emerald-500/5 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                render={<a href={`/api/bills/${String(b.id)}/pdf`} download />}
              >
                <ArrowDownTray className="size-3.5" /> PDF
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card/70">
      <div className="divide-y">
        {items.map((f) => (
          <div
            key={String(f.id)}
            className="flex flex-wrap items-center gap-3 p-4 transition hover:bg-muted/40"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400">
              <DocumentText className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/doctor/reports/${String(f.id)}`}
                className="text-sm font-semibold hover:text-primary hover:underline"
              >
                {String(f.name ?? "File")}
              </Link>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {String(f.category ?? "upload")} · {formatBytes(Number(f.size ?? 0))} ·{" "}
                {formatDate(f.createdAt)}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              render={<Link href={`/doctor/reports/${String(f.id)}`} />}
            >
              Open
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Main view below ----

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

  const totals = useMemo(
    () => ({
      patients: patients.length,
      appointments: patients.reduce((s, p) => s + p.folders.appointments, 0),
      prescriptions: patients.reduce((s, p) => s + p.folders.prescriptions, 0),
      medicines: patients.reduce((s, p) => s + p.folders.medicines, 0),
      billing: patients.reduce((s, p) => s + p.folders.billing, 0),
    }),
    [patients]
  );

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

  const goToPatient = useCallback((patient: PatientFolderEntry | null) => {
    setActivePatient(patient);
    setActiveFolder(null);
    setItems([]);
  }, []);

  const goBack = useCallback(() => {
    if (activeFolder) setActiveFolder(null);
    else setActivePatient(null);
  }, [activeFolder]);

  const STATS = [
    { label: "Patients", value: totals.patients, icon: Users, gradient: "from-blue-500 to-cyan-400" },
    { label: "Appointments", value: totals.appointments, icon: CalendarDays, gradient: "from-violet-500 to-purple-400" },
    { label: "Prescriptions", value: totals.prescriptions, icon: ClipboardList, gradient: "from-rose-500 to-pink-400" },
    { label: "Medicines", value: totals.medicines, icon: Beaker, gradient: "from-amber-500 to-orange-400" },
    { label: "Bills", value: totals.billing, icon: Banknotes, gradient: "from-emerald-500 to-teal-400" },
  ];

  const folderTitle = activeFolder ? PATIENT_FOLDER_LABELS[activeFolder] : "";
  const Icon = activeFolder ? FOLDER_META[activeFolder].icon : null;

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-aurora-1 absolute -top-32 left-1/4 size-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="animate-aurora-2 absolute -bottom-40 right-1/5 size-80 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      {/* Toolbar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-background/70 px-5 py-3 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-2.5">
          <Button variant="outline" size="icon-sm" onClick={goBack} disabled={!activePatient}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex min-w-0 items-center gap-1 text-sm">
            <button
              type="button"
              onClick={() => {
                setSearch("");
                goToPatient(null);
              }}
              className={cn(
                "shrink-0 rounded-md px-1.5 py-0.5 font-medium transition",
                !activePatient && !activeFolder
                  ? "bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text font-semibold text-transparent"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              My Drive
            </button>
            {activePatient ? (
              <>
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
                <button
                  type="button"
                  onClick={() => goToPatient(activePatient)}
                  className={cn(
                    "truncate rounded-md px-1.5 py-0.5 font-medium transition",
                    activePatient && !activeFolder
                      ? "bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text font-semibold text-transparent"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {activePatient.fullName}
                </button>
              </>
            ) : null}
            {activeFolder ? (
              <>
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" />
                <span className="shrink-0 rounded-md px-1.5 py-0.5 text-muted-foreground">
                  {folderTitle}
                </span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patients…"
              className="w-56 pl-9 transition focus:w-72 sm:w-64"
            />
          </div>
          <Button
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-violet-600 shadow-md shadow-blue-600/25 hover:from-blue-500 hover:to-violet-500"
            render={<Link href="/doctor/reports/new" />}
          >
            <Upload className="size-4" /> Upload
          </Button>
        </div>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1">
        {/* Sidebar: patients */}
        <aside className="hidden w-72 shrink-0 flex-col border-r bg-background/40 backdrop-blur-xl md:flex">
          <div className="flex items-center justify-between px-4 pb-2 pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Patients
            </p>
            <span className="rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-2 py-0.5 text-xs font-bold text-white">
              {patients.length}
            </span>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
            {filtered.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                {patients.length === 0 ? "No patients yet" : "No matches"}
              </p>
            ) : (
              filtered.map((p) => {
                const active = activePatient?.id === p.id;
                const total =
                  p.folders.appointments +
                  p.folders.prescriptions +
                  p.folders.medicines +
                  p.folders.billing +
                  p.folders.reports;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => goToPatient(p)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                      active
                        ? "bg-gradient-to-r from-blue-500/10 to-violet-500/10 ring-1 ring-blue-500/25"
                        : "hover:bg-muted/60"
                    )}
                  >
                    <PatientAvatar name={p.fullName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm font-semibold",
                          active && "text-blue-700 dark:text-blue-400"
                        )}
                      >
                        {p.fullName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.mobile || "No mobile"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold",
                        total > 0
                          ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {total}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Main area */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          {error ? (
            <div className="m-5 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-400">
              {error}
            </div>
          ) : null}

          {!activePatient ? (
            <div className="p-5 sm:p-7">
              <div className="mb-6">
                <h1 className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-500 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl">
                  Medical Reports
                </h1>
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Sparkles className="size-4 text-violet-500" />
                  Patient folders are created automatically on R2 storage.
                </p>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {STATS.map((s) => (
                  <div
                    key={s.label}
                    className="group relative overflow-hidden rounded-2xl border bg-card/60 p-4 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="relative flex items-center gap-3">
                      <div
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md",
                          s.gradient
                        )}
                      >
                        <s.icon className="size-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold leading-none">{s.value}</p>
                        <p className="mt-1 text-xs font-medium text-muted-foreground">
                          {s.label}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Patient folders
                </h2>
                <span className="text-xs text-muted-foreground">
                  {filtered.length} of {patients.length}
                </span>
              </div>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed py-20 text-center">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 shadow-lg">
                    <FolderPlus className="size-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">No patient folders yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Add patients and their folders will appear here automatically.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => goToPatient(p)}
                      className="group relative overflow-hidden rounded-2xl border bg-card/60 p-4 text-left backdrop-blur transition duration-200 hover:-translate-y-1 hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/10"
                    >
                      <div className="pointer-events-none absolute -right-10 -top-10 size-28 rounded-full bg-gradient-to-br from-blue-500/10 to-violet-500/10 blur-2xl transition group-hover:from-blue-500/20 group-hover:to-violet-500/20" />
                      <div className="relative flex items-start gap-3">
                        <PatientAvatar name={p.fullName} size="lg" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-bold">{p.fullName}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {p.mobile || "No mobile"}
                          </p>
                          <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-blue-600/80 opacity-0 transition group-hover:opacity-100 dark:text-blue-400/80">
                            Open folder →
                          </p>
                        </div>
                      </div>
                      <div className="relative mt-4 flex flex-wrap gap-1.5">
                        {(
                          [
                            ["appointments", "Appts"],
                            ["prescriptions", "Rx"],
                            ["medicines", "Meds"],
                            ["billing", "Bills"],
                            ["reports", "Files"],
                          ] as const
                        ).map(([kind, label]) =>
                          p.folders[kind] > 0 ? (
                            <span
                              key={kind}
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                FOLDER_META[kind].soft
                              )}
                            >
                              {label} {p.folders[kind]}
                            </span>
                          ) : null
                        )}
                        {totals.patients > 0 &&
                        p.folders.appointments +
                          p.folders.prescriptions +
                          p.folders.medicines +
                          p.folders.billing +
                          p.folders.reports ===
                          0 ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                            Empty
                          </span>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : activeFolder === null ? (
            <div className="p-5 sm:p-7">
              <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-500 p-6 shadow-xl shadow-violet-600/20">
                <div className="animate-aurora-1 pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/15 blur-2xl" />
                <div className="animate-aurora-2 pointer-events-none absolute -bottom-20 right-1/3 size-48 rounded-full bg-white/10 blur-2xl" />
                <div className="relative flex flex-wrap items-center gap-4">
                  <PatientAvatar name={activePatient.fullName} size="lg" />
                  <div className="min-w-0 flex-1">
                    <h1 className="text-2xl font-bold text-white">
                      {activePatient.fullName}
                    </h1>
                    <p className="mt-1 text-sm text-white/80">
                      {activePatient.mobile || "No mobile"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["appointments", "Appts"],
                        ["prescriptions", "Rx"],
                        ["medicines", "Meds"],
                        ["billing", "Bills"],
                      ] as const
                    ).map(([kind, label]) => (
                      <span
                        key={kind}
                        className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur"
                      >
                        {label} {activePatient.folders[kind]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Folders
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    "appointments",
                    "patients",
                    "prescriptions",
                    "medicines",
                    "billing",
                    "reports",
                  ] as const
                ).map((kind) => {
                  const meta = FOLDER_META[kind];
                  const IconKind = meta.icon;
                  const count = activePatient.folders[kind];
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => openFolder(activePatient, kind)}
                      className="group relative flex items-center gap-3.5 overflow-hidden rounded-2xl border bg-card/60 p-4 text-left backdrop-blur transition duration-200 hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div
                        className={cn(
                          "pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-gradient-to-br opacity-20 blur-2xl transition group-hover:opacity-40",
                          meta.gradient
                        )}
                      />
                      <div
                        className={cn(
                          "flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition group-hover:scale-110",
                          meta.gradient
                        )}
                      >
                        <IconKind className="size-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">
                          {PATIENT_FOLDER_LABELS[kind]}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {count} item{count === 1 ? "" : "s"}
                        </p>
                      </div>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-blue-500" />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-5 sm:p-7">
              <div className="mb-5 flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md",
                    FOLDER_META[activeFolder].gradient
                  )}
                >
                  {Icon ? <Icon className="size-5.5" /> : null}
                </div>
                <div>
                  <h1 className="text-xl font-bold">{folderTitle}</h1>
                  <p className="text-sm text-muted-foreground">
                    {activePatient.fullName} · {items.length} item
                    {items.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-16 animate-pulse rounded-2xl border bg-muted/40"
                    />
                  ))}
                </div>
              ) : (
                <ItemTable folder={activeFolder} items={items} />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}