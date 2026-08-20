import { z } from "zod";

const NAME_MAX = 120;
const EMAIL_MAX = 120;
const PHONE_MAX = 30;

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Please enter a valid email address")
  .max(EMAIL_MAX);

export const createUserSchema = z
  .object({
    name: z.string().trim().min(2, "Name is required").max(NAME_MAX),
    email: emailSchema,
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(200),
    role: z.enum(["doctor", "staff", "patient"]),
    phone: z.string().trim().max(PHONE_MAX).nullable().optional(),
    whatsapp: z.string().trim().max(PHONE_MAX).nullable().optional(),
    /** Existing profile id to link (must exist in this clinic). */
    doctorId: z.string().startsWith("doc_").optional(),
    staffId: z.string().startsWith("stf_").optional(),
    patientId: z.string().startsWith("pat_").optional(),
  })
  .refine(
    (v) => (v.role === "doctor" ? v.doctorId !== undefined : true),
    { message: "doctorId is required when creating a doctor account", path: ["doctorId"] }
  )
  .refine(
    (v) => (v.role === "staff" ? v.staffId !== undefined : true),
    { message: "staffId is required when creating a staff account", path: ["staffId"] }
  )
  .refine(
    (v) => (v.role === "patient" ? v.patientId !== undefined : true),
    { message: "patientId is required when creating a patient account", path: ["patientId"] }
  );

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(NAME_MAX).optional(),
  phone: z.string().trim().max(PHONE_MAX).nullable().optional(),
  whatsapp: z.string().trim().max(PHONE_MAX).nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  role: z.enum(["doctor", "staff", "patient"]).optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200)
    .optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const listUsersSchema = z.object({
  q: z.string().trim().max(200).optional(),
  role: z.enum(["doctor", "staff", "patient", "clinic_admin"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});