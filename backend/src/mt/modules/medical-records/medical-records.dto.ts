import { z } from "zod";

export const createMedicalRecordSchema = z.object({
  patientId: z.string().regex(/^pat_[A-Za-z0-9]{8,40}$/, "Invalid patient id"),
  title: z.string().trim().min(2, "Title is required").max(200),
  recordType: z
    .enum(["consultation", "lab", "imaging", "procedure", "other"])
    .default("consultation"),
  summary: z.string().trim().min(2).max(4000),
  diagnosis: z.string().trim().max(1000).optional().nullable(),
  attachments: z.array(z.string().trim().max(500)).max(20).optional().default([]),
});

export type CreateMedicalRecordInput = z.infer<typeof createMedicalRecordSchema>;

export const medicalRecordParamsSchema = z.object({
  recordId: z.string().regex(/^mrc_[A-Za-z0-9]{8,40}$/, "Invalid record id"),
});

export type MedicalRecordParams = z.infer<typeof medicalRecordParamsSchema>;

export const listMedicalRecordsQuerySchema = z.object({
  patientId: z.string().regex(/^pat_[A-Za-z0-9]{8,40}$/),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export type ListMedicalRecordsQuery = z.infer<typeof listMedicalRecordsQuerySchema>;