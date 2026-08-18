import { z } from "zod";

export const createPatientSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(120),
  mobile: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, "Mobile must be 10-15 digits, optionally prefixed with +"),
  email: z.email("A valid email is required").transform((v) => v.toLowerCase()).optional().nullable(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72)
    .optional()
    .nullable()
    .refine(
      (v) => v === null || v === undefined || /[A-Z]/.test(v) && /[0-9]/.test(v),
      "Password must contain an uppercase letter and a number"
    ),
  gender: z.enum(["male", "female", "other"]).optional().nullable(),
  dateOfBirth: z.string().date("Date of birth must be YYYY-MM-DD").optional().nullable(),
  bloodGroup: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
    .optional()
    .nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  pincode: z.string().regex(/^[0-9]{5,10}$/).optional().nullable(),
  allergies: z.array(z.string().trim().min(1).max(100)).max(50).optional().default([]),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export const patientIdParamsSchema = z.object({
  patientId: z
    .string()
    .regex(/^pat_[A-Za-z0-9]{8,40}$/, "Invalid patient id"),
});

export type PatientIdParams = z.infer<typeof patientIdParamsSchema>;

export const updatePatientSchema = createPatientSchema
  .omit({ email: true, password: true })
  .partial()
  .extend({
    fullName: z.string().trim().min(2).max(120).optional(),
    mobile: z.string().regex(/^\+?[0-9]{10,15}$/).optional(),
  });

export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

export const listPatientsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  q: z.string().trim().max(100).optional(),
});

export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;