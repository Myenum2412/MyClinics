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
  height: string | null;
  weight: string | null;
  bloodPressure: string | null;
  temperature: string | null;
  pulse: string | null;
  respiratoryRate: string | null;
  spo2: string | null;
  occupation: string | null;
  maritalStatus: string | null;
  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactMobile: string | null;
  allergies: string[];
  medicalConditions: string | null;
  previousSurgeries: string | null;
  currentMedications: string | null;
  idType: string | null;
  idNumber: string | null;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  insurancePolicyHolderName: string | null;
  insuranceValidTill: string | null;
  referredBy: string | null;
  howDidYouHear: string | null;
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
    height: doc.height,
    weight: doc.weight,
    bloodPressure: doc.bloodPressure,
    temperature: doc.temperature,
    pulse: doc.pulse,
    respiratoryRate: doc.respiratoryRate,
    spo2: doc.spo2,
    occupation: doc.occupation,
    maritalStatus: doc.maritalStatus,
    emergencyContactName: doc.emergencyContactName,
    emergencyContactRelationship: doc.emergencyContactRelationship,
    emergencyContactMobile: doc.emergencyContactMobile,
    allergies: doc.allergies,
    medicalConditions: doc.medicalConditions,
    previousSurgeries: doc.previousSurgeries,
    currentMedications: doc.currentMedications,
    idType: doc.idType,
    idNumber: doc.idNumber,
    insuranceProvider: doc.insuranceProvider,
    insurancePolicyNumber: doc.insurancePolicyNumber,
    insurancePolicyHolderName: doc.insurancePolicyHolderName,
    insuranceValidTill: doc.insuranceValidTill,
    referredBy: doc.referredBy,
    howDidYouHear: doc.howDidYouHear,
    notes: doc.notes,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}