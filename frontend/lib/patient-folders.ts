export const PATIENT_FOLDER_KINDS = [
  "appointments",
  "patients",
  "prescriptions",
  "medicines",
  "billing",
  "reports",
] as const;

export type PatientFolderKind = (typeof PATIENT_FOLDER_KINDS)[number];

export const PATIENT_FOLDER_LABELS: Record<PatientFolderKind, string> = {
  appointments: "Appointments",
  patients: "Patients",
  prescriptions: "Prescriptions",
  medicines: "Medicines",
  billing: "Billing",
  reports: "Reports",
};

export type PatientFolderCounts = {
  appointments: number;
  patients: number;
  prescriptions: number;
  medicines: number;
  billing: number;
  reports: number;
};

export type PatientFolderEntry = {
  id: string;
  fullName: string;
  mobile: string;
  folders: PatientFolderCounts;
};

export type PatientFolderItem = {
  id: string;
  [key: string]: unknown;
};