import { z } from "zod";

export const medicineItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  dosage: z.string().trim().min(1).max(100),
  frequency: z.string().trim().min(1).max(100),
  duration: z.string().trim().min(1).max(100),
  instructions: z.string().trim().max(500).optional().nullable(),
});

export const createPrescriptionSchema = z.object({
  patientId: z.string().regex(/^pat_[A-Za-z0-9]{8,40}$/, "Invalid patient id"),
  doctorName: z.string().trim().min(2).max(120),
  diagnosis: z.string().trim().min(2).max(1000),
  medicines: z.array(medicineItemSchema).min(1, "At least one medicine is required").max(50),
  notes: z.string().trim().max(2000).optional().nullable(),
  followUpDate: z.string().date().optional().nullable(),
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;

export const prescriptionParamsSchema = z.object({
  prescriptionId: z.string().regex(/^prx_[A-Za-z0-9]{8,40}$/, "Invalid prescription id"),
});

export type PrescriptionParams = z.infer<typeof prescriptionParamsSchema>;

export const listPrescriptionsQuerySchema = z.object({
  patientId: z.string().regex(/^pat_[A-Za-z0-9]{8,40}$/),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export type ListPrescriptionsQuery = z.infer<typeof listPrescriptionsQuerySchema>;