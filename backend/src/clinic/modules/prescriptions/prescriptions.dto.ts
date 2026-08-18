import { z } from "zod";

const medicineSchema = z.object({
  name: z.string().trim().min(1, "Medicine name is required").max(200),
  dosage: z.string().trim().max(200).nullable().optional(),
  frequency: z.string().trim().max(200).nullable().optional(),
  duration: z.string().trim().max(200).nullable().optional(),
  instructions: z.string().trim().max(500).nullable().optional(),
});

export const createPrescriptionSchema = z.object({
  patientId: z.string().startsWith("pat_"),
  doctorId: z.string().startsWith("doc_").nullable().optional(),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  diagnosis: z.string().trim().max(2000).optional().nullable(),
  medicines: z.array(medicineSchema).min(1, "At least one medicine is required").max(50),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;

export const updatePrescriptionSchema = createPrescriptionSchema.partial();

export type UpdatePrescriptionInput = z.infer<typeof updatePrescriptionSchema>;

export const listPrescriptionsSchema = z.object({
  patientId: z.string().startsWith("pat_").optional(),
  doctorId: z.string().startsWith("doc_").optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});