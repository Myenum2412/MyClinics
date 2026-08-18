/** Patient document — every field below belongs to a single clinic tenant. */
export interface PatientDoc {
  clinicId: string;
  /** Public patient identifier (`pat_...`) used in URLs and the JWT claim. */
  patientId: string;
  /** Linked mt_users.userId when the patient has portal credentials. */
  userId: string | null;
  fullName: string;
  mobile: string;
  email: string | null;
  gender: "male" | "female" | "other" | null;
  dateOfBirth: string | null;
  bloodGroup: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | null;
  address: string | null;
  city: string | null;
  pincode: string | null;
  allergies: string[];
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export function mapPatient(doc: Record<string, unknown>) {
  return {
    patientId: doc.patientId,
    clinicId: doc.clinicId,
    fullName: doc.fullName,
    mobile: doc.mobile,
    email: doc.email ?? null,
    gender: doc.gender ?? null,
    dateOfBirth: doc.dateOfBirth ?? null,
    bloodGroup: doc.bloodGroup ?? null,
    address: doc.address ?? null,
    city: doc.city ?? null,
    pincode: doc.pincode ?? null,
    allergies: doc.allergies ?? [],
    notes: doc.notes ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}