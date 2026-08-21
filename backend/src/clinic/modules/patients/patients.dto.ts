import { z } from "zod";

const NAME_MAX = 120;
const EMAIL_MAX = 120;
const PHONE_MAX = 30;

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const createPatientSchema = z.object({
  fullName: z.string().trim().min(2, "Patient name is required").max(NAME_MAX),
  mobile: z.string().trim().min(8, "Mobile number is required").max(PHONE_MAX),
  whatsapp: optionalString(PHONE_MAX),
  email: optionalString(EMAIL_MAX),
  gender: z.enum(["male", "female", "other"]).optional().nullable(),
  dateOfBirth: z.string().trim().nullable().optional(),
  bloodGroup: optionalString(20),
  address: optionalString(300),
  city: optionalString(120),
  state: optionalString(120),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Invalid pincode")
    .optional()
    .nullable(),
  height: optionalString(20),
  weight: optionalString(20),
  occupation: optionalString(120),
  maritalStatus: optionalString(40),
  emergencyContactName: optionalString(120),
  emergencyContactRelationship: optionalString(80),
  emergencyContactMobile: optionalString(PHONE_MAX),
  allergies: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
  medicalConditions: optionalString(2000),
  previousSurgeries: optionalString(2000),
  currentMedications: optionalString(2000),
  idType: optionalString(80),
  idNumber: optionalString(80),
  insuranceProvider: optionalString(120),
  insurancePolicyNumber: optionalString(120),
  insurancePolicyHolderName: optionalString(120),
  insuranceValidTill: optionalString(20),
  referredBy: optionalString(120),
  howDidYouHear: optionalString(120),
  notes: optionalString(1000),
  /** Lifecycle status of the patient record. */
  status: z.enum(["active", "inactive"]).optional(),
  /** Assigns the patient to a doctor (must exist in this clinic). */
  doctorId: z.string().startsWith("doc_").nullable().optional(),
  /** When set, a patient portal account is created with this password. */
  password: z.string().min(8, "Password must be at least 8 characters").max(200).optional(),
  /** Whether portal access is enabled for this patient. */
  portalAccess: z.enum(["enable", "disable"]).optional(),
  /** How login details are delivered after registration (WhatsApp supported today). */
  loginNotification: z.enum(["whatsapp", "email", "none"]).optional(),
  /** When true, skips triggering the patient registration/welcome notification immediately. */
  skipNotification: z.boolean().optional(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const updatePatientSchema = createPatientSchema.omit({ password: true }).partial();

export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

export const assignPatientSchema = z.object({
  doctorId: z.string().startsWith("doc_").nullable(),
});

export type AssignPatientInput = z.infer<typeof assignPatientSchema>;

export const listPatientsSchema = z.object({
  q: z.string().trim().max(200).optional(),
  doctorId: z.string().startsWith("doc_").optional(),
  status: z.enum(["active", "inactive"]).optional(),
});