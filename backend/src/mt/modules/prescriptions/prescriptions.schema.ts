export interface PrescriptionMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string | null;
}

export interface PrescriptionDoc {
  clinicId: string;
  prescriptionId: string;
  patientId: string;
  doctorName: string;
  diagnosis: string;
  medicines: PrescriptionMedicine[];
  notes: string | null;
  followUpDate: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export function mapPrescription(doc: Record<string, unknown>) {
  return {
    prescriptionId: doc.prescriptionId,
    clinicId: doc.clinicId,
    patientId: doc.patientId,
    doctorName: doc.doctorName,
    diagnosis: doc.diagnosis,
    medicines: doc.medicines ?? [],
    notes: doc.notes ?? null,
    followUpDate: doc.followUpDate ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}