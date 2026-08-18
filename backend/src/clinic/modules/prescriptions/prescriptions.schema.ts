import type { ClinicDocument } from "@/clinic/core/repository";

export interface MedicineEntry {
  name: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
}

export interface PrescriptionDoc extends ClinicDocument {
  clinicId: string;
  prescriptionId: string;
  patientId: string;
  /** Prescribing doctor (scoped for doctor role). */
  doctorId: string;
  visitDate: string;
  diagnosis: string | null;
  medicines: MedicineEntry[];
  notes: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export function prescriptionToPublic(doc: PrescriptionDoc) {
  return {
    prescriptionId: doc.prescriptionId,
    patientId: doc.patientId,
    doctorId: doc.doctorId,
    visitDate: doc.visitDate,
    diagnosis: doc.diagnosis,
    medicines: doc.medicines,
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}