import type { ClinicDocument } from "@/clinic/core/repository";

export interface LabDoc extends ClinicDocument {
  clinicId: string;
  labId: string;
  labName: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  licenseNo: string | null;
  labType: string | null;
  userId: string | null;
  status: "active" | "inactive" | "deleted";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export function labToPublic(doc: LabDoc) {
  return {
    labId: doc.labId,
    labName: doc.labName,
    contactPerson: doc.contactPerson,
    phone: doc.phone,
    email: doc.email,
    address: doc.address,
    city: doc.city,
    state: doc.state,
    pincode: doc.pincode,
    licenseNo: doc.licenseNo,
    labType: doc.labType,
    userId: doc.userId,
    status: doc.status,
    createdBy: doc.createdBy,
    clinicId: doc.clinicId,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
