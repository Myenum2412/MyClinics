import type { ClinicDocument } from "@/clinic/core/repository";

export interface StaffDoc extends ClinicDocument {
  clinicId: string;
  staffId: string;
  /** Linked portal account id, once the staff member has login access. */
  userId: string | null;
  name: string;
  position: string;
  phone: string | null;
  email: string | null;
  joinedAt: string | null;
  status: "active" | "inactive" | "deleted";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export function staffToPublic(doc: StaffDoc) {
  return {
    staffId: doc.staffId,
    userId: doc.userId,
    name: doc.name,
    position: doc.position,
    phone: doc.phone,
    email: doc.email,
    joinedAt: doc.joinedAt,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}