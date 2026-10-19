import type {
  InvestigationCategory,
  InvestigationStatus,
} from "@/lib/clinic-api";

/**
 * Shared presentation metadata for investigations/reports, used by the lab
 * workspace (dashboard + reports). Keeping the label/badge maps in one place
 * avoids the lab pages drifting from the clinic investigation page.
 */

export const INVESTIGATION_STATUS_OPTIONS: {
  value: InvestigationStatus;
  label: string;
}[] = [
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const INVESTIGATION_STATUS_BADGE: Record<InvestigationStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  "in-progress": "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-slate-100 text-slate-600",
};

export const INVESTIGATION_CATEGORY_OPTIONS: {
  value: InvestigationCategory;
  label: string;
}[] = [
  { value: "vital-test", label: "Vital Test" },
  { value: "x-ray", label: "X-Ray" },
  { value: "blood-report", label: "Blood Report" },
  { value: "biopsy", label: "Biopsy" },
  { value: "other", label: "Other" },
];

export const INVESTIGATION_CATEGORY_BADGE: Record<InvestigationCategory, string> = {
  "vital-test": "bg-rose-100 text-rose-800",
  "x-ray": "bg-indigo-100 text-indigo-800",
  "blood-report": "bg-red-100 text-red-800",
  biopsy: "bg-purple-100 text-purple-800",
  other: "bg-slate-100 text-slate-600",
};

/** Human label for a stored report category (legacy nulls → "Other"). */
export function investigationCategoryLabel(value: unknown): string {
  return (
    INVESTIGATION_CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? "Other"
  );
}

export function investigationStatusLabel(value: unknown): string {
  return (
    INVESTIGATION_STATUS_OPTIONS.find((o) => o.value === value)?.label ??
    (typeof value === "string" ? value : "Unknown")
  );
}

export function normalizeInvestigationCategory(
  value: unknown
): InvestigationCategory {
  return INVESTIGATION_CATEGORY_OPTIONS.some((o) => o.value === value)
    ? (value as InvestigationCategory)
    : "other";
}

/** Display pair for an entry in a report's `details` payload. */
export interface ReportDetailEntry {
  label: string;
  value: string;
}

interface CategoryField {
  key: string;
  label: string;
}

/** Related form fields per report type — drives friendly detail labels. */
const CATEGORY_FIELDS: Record<Exclude<InvestigationCategory, "other">, CategoryField[]> = {
  "vital-test": [
    { key: "bloodPressure", label: "Blood pressure" },
    { key: "temperature", label: "Temperature" },
    { key: "pulse", label: "Pulse" },
    { key: "respiratoryRate", label: "Respiratory rate" },
    { key: "spo2", label: "SpO₂" },
    { key: "height", label: "Height" },
    { key: "weight", label: "Weight" },
    { key: "bloodSugar", label: "Blood sugar" },
  ],
  "x-ray": [
    { key: "xrayType", label: "X-ray type" },
    { key: "region", label: "Region / tooth" },
    { key: "findings", label: "Findings" },
    { key: "impression", label: "Impression" },
  ],
  "blood-report": [
    { key: "testPanel", label: "Test / panel" },
    { key: "hemoglobin", label: "Hemoglobin" },
    { key: "wbc", label: "WBC count" },
    { key: "platelets", label: "Platelet count" },
    { key: "esr", label: "ESR" },
    { key: "fastingSugar", label: "Fasting sugar" },
    { key: "ppSugar", label: "PP sugar" },
    { key: "remarks", label: "Remarks" },
  ],
  biopsy: [
    { key: "biopsySite", label: "Biopsy site" },
    { key: "specimenType", label: "Specimen type" },
    { key: "clinicalDiagnosis", label: "Clinical diagnosis" },
    { key: "grossFindings", label: "Gross findings" },
    { key: "labName", label: "Referred lab" },
  ],
};

/** Display label for a stored details key. */
export function investigationFieldLabel(
  category: unknown,
  key: string
): string {
  const cat = normalizeInvestigationCategory(category);
  if (cat === "other") return key;
  return CATEGORY_FIELDS[cat].find((f) => f.key === key)?.label ?? key;
}

/**
 * Flatten a stored `details` object into ordered, printable label/value rows.
 * Unknown keys fall back to the raw key so nothing is silently dropped.
 */
export function investigationDetailEntries(
  details: Record<string, unknown> | null | undefined,
  category?: unknown
): ReportDetailEntry[] {
  if (!details || typeof details !== "object") return [];
  return Object.entries(details)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([key, value]) => ({
      label: investigationFieldLabel(category, key),
      value:
        typeof value === "string"
          ? value
          : typeof value === "number" || typeof value === "boolean"
            ? String(value)
            : JSON.stringify(value),
    }));
}
