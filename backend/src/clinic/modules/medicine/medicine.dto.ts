import { z } from "zod";

export const createMedicineRecordSchema = z.object({
  patientId: z.string().startsWith("pat_"),
  doctorId: z.string().startsWith("doc_").nullable().optional(),
  diagnosis: z.string().trim().min(2, "Diagnosis is required").max(2000),
  symptoms: z.string().trim().max(2000).optional().nullable(),
  treatment: z.string().trim().max(4000).optional().nullable(),
  notes: z.string().trim().max(4000).optional().nullable(),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  attachments: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(255),
        url: z.string().trim().max(1000).nullable().optional(),
        mimeType: z.string().trim().max(120).nullable().optional(),
        fileId: z.string().trim().max(120).nullable().optional(),
      })
    )
    .max(50)
    .optional(),
});

export type CreateMedicineRecordInput = z.infer<typeof createMedicineRecordSchema>;

export const updateMedicineRecordSchema = createMedicineRecordSchema.partial();

export type UpdateMedicineRecordInput = z.infer<typeof updateMedicineRecordSchema>;

export const listMedicineRecordsSchema = z.object({
  patientId: z.string().startsWith("pat_").optional(),
  doctorId: z.string().startsWith("doc_").optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
