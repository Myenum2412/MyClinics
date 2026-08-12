export const FILE_CATEGORIES = [
  { value: "appointment", label: "Appointments" },
  { value: "billing", label: "Billing" },
  { value: "prescription", label: "Prescriptions" },
  { value: "upload", label: "Uploads" },
] as const;

export type FileCategoryValue = (typeof FILE_CATEGORIES)[number]["value"];

export function categoryLabel(category: string | null | undefined) {
  return FILE_CATEGORIES.find((c) => c.value === category)?.label ?? "Uploads";
}

export type ReportFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  extension: string;
  folderId: string | null;
  category: string | null;
  patientId: string | null;
  patientName: string | null;
  prescriptionId: string | null;
  prescriptionLabel: string | null;
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PatientOption = {
  id: string;
  fullName: string;
};
