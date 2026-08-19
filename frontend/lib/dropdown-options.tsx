"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getClinicSettings, updateClinicSettings } from "@/lib/clinic-api";

export interface DropdownOptionDef {
  key: string;
  label: string;
  description?: string;
  defaults: string[];
}

/**
 * Registry of every user-managed dropdown in the clinic app.
 * Values are stored per clinic in `settings.lookups` (key → string[]).
 * When a key has no stored list, the built-in defaults are used.
 */
export const DROPDOWN_OPTION_DEFS: DropdownOptionDef[] = [
  {
    key: "blood_groups",
    label: "Blood Groups",
    description: "Patient blood groups",
    defaults: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  },
  {
    key: "marital_statuses",
    label: "Marital Status",
    description: "Patient marital status options",
    defaults: ["Single", "Married", "Divorced", "Widowed"],
  },
  {
    key: "id_proof_types",
    label: "ID Proof Types",
    description: "Patient identification document options",
    defaults: [
      "Aadhaar Card",
      "PAN Card",
      "Driving License",
      "Passport",
      "Voter ID",
      "Other",
    ],
  },
  {
    key: "how_did_you_hear",
    label: "How Did You Hear About Us",
    description: "Patient referral source options",
    defaults: [
      "Family/Friends Referral",
      "Google Search",
      "Social Media",
      "Doctor Referral",
      "Walk-in",
      "Other",
    ],
  },
  {
    key: "doctor_departments",
    label: "Doctor Departments / Specialties",
    description: "Departments shown in the doctor form",
    defaults: [
      "General Medicine",
      "Cardiology",
      "Pediatrics",
      "Orthopedics",
      "Dermatology",
      "ENT",
      "Ophthalmology",
      "Gynecology & Obstetrics",
      "Neurology",
      "Psychiatry",
      "Dental",
      "Other",
    ],
  },
  {
    key: "nationalities",
    label: "Nationalities",
    description: "Doctor nationality options",
    defaults: [
      "Indian",
      "American",
      "British",
      "Australian",
      "Canadian",
      "German",
      "French",
      "Japanese",
      "Chinese",
      "Nigerian",
      "Pakistani",
      "Bangladeshi",
      "Sri Lankan",
      "Nepali",
      "Emirati",
      "Saudi",
      "Qatari",
      "Omani",
      "Kuwaiti",
      "Singaporean",
      "Malaysian",
      "Other",
    ],
  },
  {
    key: "report_types",
    label: "Report Types",
    description: "Lab report categories",
    defaults: [
      "Blood Test",
      "Urine Test",
      "Stool Test",
      "X-Ray",
      "MRI",
      "CT Scan",
      "Ultrasound",
      "ECG",
      "Pathology",
      "Biopsy",
      "Other",
    ],
  },
  {
    key: "document_types",
    label: "Document Types",
    description: "Medical file attachment categories",
    defaults: ["Medicine Report", "Lab Report", "Image", "PDF Document", "Other"],
  },
  {
    key: "visit_types",
    label: "Visit Types",
    description: "Appointment / record visit types",
    defaults: ["New Visit", "Follow-up"],
  },
  {
    key: "appointment_priorities",
    label: "Appointment Priority",
    defaults: ["Normal", "High", "Urgent"],
  },
  {
    key: "reminder_options",
    label: "Patient Reminder Options",
    defaults: ["None", "Same Day", "1 Day Before"],
  },
  {
    key: "appointment_durations",
    label: "Appointment Duration (minutes)",
    defaults: ["15", "30", "45", "60"],
  },
  {
    key: "medicine_instructions",
    label: "Medicine Instructions",
    description: "Prescription instruction suggestions",
    defaults: [
      "Before food",
      "After food",
      "With food",
      "Empty stomach",
      "Before breakfast",
      "After breakfast",
      "At bedtime",
      "As needed",
    ],
  },
  {
    key: "medicines",
    label: "Common Medicines",
    description: "Medicine autocomplete suggestions",
    defaults: [
      "Paracetamol 500mg",
      "Paracetamol Syrup (Pediatric)",
      "Ibuprofen 400mg",
      "Diclofenac 50mg",
      "Aceclofenac 100mg",
      "Amoxicillin 500mg",
      "Amoxicillin + Clavulanic Acid 625mg",
      "Azithromycin 500mg",
      "Cefixime 200mg",
      "Cefuroxime 500mg",
      "Ciprofloxacin 500mg",
      "Ofloxacin 200mg",
      "Levofloxacin 500mg",
      "Doxycycline 100mg",
      "Metronidazole 400mg",
      "Nitrofurantoin 100mg",
      "Omeprazole 20mg",
      "Pantoprazole 40mg",
      "Rabeprazole 20mg",
      "Domperidone 10mg",
      "Ondansetron 4mg",
      "Ranitidine 150mg",
      "Cetirizine 10mg",
      "Levocetirizine 5mg",
      "Loratadine 10mg",
      "Pheniramine 22.75mg/5ml",
      "Montelukast 10mg",
      "Salbutamol (Asthalin) Inhaler",
      "Budesonide Inhaler",
      "Ambroxol 30mg",
      "Dextromethorphan Syrup",
      "Cough Syrup (Chlorpheniramine + Dextromethorphan)",
      "ORS Powder",
      "Zinc Tablets",
      "Vitamin D3 60K",
      "Vitamin B12 1500mcg",
      "Folic Acid 5mg",
      "Iron + Folic Acid",
      "Calcium + Vitamin D3",
      "Metformin 500mg",
      "Glimepiride 1mg",
      "Sitagliptin 100mg",
      "Insulin Mixtard 30/70",
      "Atorvastatin 10mg",
      "Rosuvastatin 10mg",
      "Amlodipine 5mg",
      "Telmisartan 40mg",
      "Losartan 50mg",
      "Metoprolol 25mg",
      "Aspirin 75mg",
      "Clopidogrel 75mg",
      "Furosemide 40mg",
      "Spironolactone 25mg",
      "Tamsulosin 0.4mg",
      "Finasteride 5mg",
      "Levothyroxine 25mcg",
      "Betamethasone Cream",
      "Clotrimazole Cream",
      "Hydrocortisone Cream",
      "Mupirocin Ointment",
    ],
  },
];

export const DEFAULT_OPTIONS: Record<string, string[]> = Object.fromEntries(
  DROPDOWN_OPTION_DEFS.map((def) => [def.key, def.defaults])
);

const LABELS: Record<string, string> = Object.fromEntries(
  DROPDOWN_OPTION_DEFS.map((def) => [def.key, def.label])
);

/**
 * Loads and mutates the clinic's dropdown option lists (`settings.lookups`).
 * `getOptions(key)` returns the stored list, or the built-in defaults when
 * the clinic has not customized that dropdown yet.
 */
export function useDropdownOptions(clinicId: string) {
  const [custom, setCustom] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId) return;
    getClinicSettings(clinicId)
      .then((res) => setCustom(res.lookups ?? {}))
      .catch(() => toast.error("Failed to load dropdown options"))
      .finally(() => setLoading(false));
  }, [clinicId]);

  const persist = useCallback(
    async (next: Record<string, string[]>) => {
      setCustom(next);
      try {
        await updateClinicSettings(clinicId, { lookups: next });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save dropdown options");
        throw err;
      }
    },
    [clinicId]
  );

  const getOptions = useCallback(
    (key: string): string[] => {
      if (custom[key]) return custom[key];
      return DEFAULT_OPTIONS[key] ?? [];
    },
    [custom]
  );

  const addOption = useCallback(
    async (key: string, value: string): Promise<boolean> => {
      const clean = value.trim();
      if (!clean) return false;
      const current = getOptions(key);
      if (current.some((v) => v.toLowerCase() === clean.toLowerCase())) return false;
      const next = { ...custom, [key]: [...current, clean] };
      await persist(next);
      return true;
    },
    [custom, getOptions, persist]
  );

  const removeOption = useCallback(
    async (key: string, value: string) => {
      const current = getOptions(key).filter((v) => v !== value);
      await persist({ ...custom, [key]: current });
    },
    [custom, getOptions, persist]
  );

  return { options: custom, getOptions, addOption, removeOption, loading };
}

export function optionLabel(key: string): string {
  return LABELS[key] ?? key;
}
