import type { ClinicDocument } from "@/clinic/core/repository";

export interface DoctorDoc extends ClinicDocument {
  clinicId: string;
  doctorId: string;
  /** Linked portal account id, once the doctor has login access. */
  userId: string | null;
  name: string;
  specialization: string;
  licenseNo: string | null;
  qualification: string | null;
  phone: string | null;
  email: string | null;
  fee: number | null;
  schedule: { day: string; start: string; end: string }[];
  status: "active" | "inactive" | "deleted";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export function doctorToPublic(doc: DoctorDoc) {
  return {
    doctorId: doc.doctorId,
    userId: doc.userId,
    name: doc.name,
    specialization: doc.specialization,
    licenseNo: doc.licenseNo,
    qualification: doc.qualification,
    phone: doc.phone,
    email: doc.email,
    fee: doc.fee,
    schedule: doc.schedule,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}