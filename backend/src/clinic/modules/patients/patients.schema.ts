import type { ClinicDocument } from "@/clinic/core/repository";

export interface PatientDoc extends ClinicDocument {
  clinicId: string;
  patientId: string;
  /** Assigned doctor — the ONLY doctor allowed to see this patient. */
  doctorId: string | null;
  /** Linked portal account id, once the patient has login access. */
  userId: string | null;
  fullName: string;
  mobile: string;
  whatsapp: string | null;
  email: string | null;
  gender: "male" | "female" | "other" | null;
  dateOfBirth: string | null;
  bloodGroup: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  allergies: string[];
  notes: string | null;
  status: "active" | "inactive" | "deleted";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export function patientToPublic(doc: PatientDoc) {
  return {
    patientId: doc.patientId,
    doctorId: doc.doctorId,
    userId: doc.userId,
    fullName: doc.fullName,
    mobile: doc.mobile,
    whatsapp: doc.whatsapp ?? null,
    email: doc.email,
    gender: doc.gender,
    dateOfBirth: doc.dateOfBirth,
    bloodGroup: doc.bloodGroup,
    address: doc.address,
    city: doc.city,
    state: doc.state,
    pincode: doc.pincode,
    allergies: doc.allergies,
    notes: doc.notes,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}