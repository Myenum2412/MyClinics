import { apiFetch } from "@/lib/server-api";
import { PatientFoldersView } from "@/components/patient-folders-view";
import type { PatientFolderEntry } from "@/lib/patient-folders";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const { status, data } = await apiFetch<{
    patients?: PatientFolderEntry[];
    error?: string;
  }>("/api/patient-folders");

  const patients = status === 200 ? (data.patients ?? []) : [];
  const error =
    status === 200 ? null : (data.error ?? "Could not load patient folders.");

  return <PatientFoldersView initialPatients={patients} error={error} />;
}