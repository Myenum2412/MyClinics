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
  /** Extended profile (optional). */
  gender?: "male" | "female" | "other" | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  address?: string | null;
  experienceYears?: number | null;
  registrationNo?: string | null;
  issuingAuthority?: string | null;
  department?: string | null;
  about?: string | null;
  languages?: string | null;
  notes?: string | null;
  username?: string | null;
  allowLogin?: boolean | null;
  profileImage?: string | null;
  scheduleDays?: string[] | null;
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
    gender: doc.gender ?? null,
    dateOfBirth: doc.dateOfBirth ?? null,
    nationality: doc.nationality ?? null,
    address: doc.address ?? null,
    experienceYears: doc.experienceYears ?? null,
    registrationNo: doc.registrationNo ?? null,
    issuingAuthority: doc.issuingAuthority ?? null,
    department: doc.department ?? null,
    about: doc.about ?? null,
    languages: doc.languages ?? null,
    notes: doc.notes ?? null,
    username: doc.username ?? null,
    allowLogin: doc.allowLogin ?? null,
    profileImage: doc.profileImage ?? null,
    scheduleDays: doc.scheduleDays ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}