import { z } from "zod";

export const createReportSchema = z.object({
  patientId: z.string().startsWith("pat_"),
  doctorId: z.string().startsWith("doc_").nullable().optional(),
  type: z.string().trim().min(2, "Report type is required").max(120),
  title: z.string().trim().min(2, "Report title is required").max(300),
  description: z.string().trim().max(2000).nullable().optional(),
  fileUrl: z.string().trim().max(2000).nullable().optional(),
  fileId: z.string().trim().max(200).nullable().optional(),
  mimeType: z.string().trim().max(120).nullable().optional(),
  status: z.enum(["uploaded", "processing", "ready", "failed"]).optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;

export const updateReportSchema = createReportSchema.partial();

export type UpdateReportInput = z.infer<typeof updateReportSchema>;

export const listReportsSchema = z.object({
  patientId: z.string().startsWith("pat_").optional(),
  type: z.string().trim().max(120).optional(),
  status: z.enum(["uploaded", "processing", "ready", "failed"]).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});