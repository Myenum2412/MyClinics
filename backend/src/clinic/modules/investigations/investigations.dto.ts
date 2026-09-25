import { z } from "zod";

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const investigationStatusEnum = z.enum([
  "pending",
  "in-progress",
  "completed",
  "cancelled",
]);

export const createInvestigationSchema = z.object({
  patientId: z.string().trim().min(1, "Patient is required").max(120),
  doctorId: z.string().trim().min(1).max(120).optional().nullable(),
  title: z.string().trim().min(2, "Title is required").max(200),
  notes: optionalString(5000),
  visitDate: dateString,
  status: investigationStatusEnum.optional(),
  chartData: z.record(z.string(), z.unknown()).nullable().optional(),
  medicalRecordId: z.string().trim().min(1).max(120).optional().nullable(),
});

export type CreateInvestigationInput = z.infer<
  typeof createInvestigationSchema
>;

export const updateInvestigationSchema = createInvestigationSchema
  .partial()
  .omit({ patientId: true });

export type UpdateInvestigationInput = z.infer<
  typeof updateInvestigationSchema
>;

export const listInvestigationsSchema = z.object({
  q: z.string().trim().max(200).optional(),
  patientId: z.string().trim().max(120).optional(),
  status: investigationStatusEnum.optional(),
  from: dateString.optional(),
  to: dateString.optional(),
});
