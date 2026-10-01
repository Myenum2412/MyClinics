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

export const examinationStatusEnum = z.enum([
  "pending",
  "in-progress",
  "completed",
  "cancelled",
]);

export const examinationIssueEnum = z.enum(["hard", "soft"]);

export const createExaminationSchema = z.object({
  patientId: z.string().trim().min(1, "Patient is required").max(120),
  doctorId: z.string().trim().min(1).max(120).optional().nullable(),
  visitDate: dateString,
  status: examinationStatusEnum.optional(),
  issueType: examinationIssueEnum,
  investigationId: z.string().trim().min(1).max(120).optional().nullable(),
  oralFindings: z
    .string()
    .trim()
    .min(2, "Oral findings are required")
    .max(5000),
  notes: optionalString(5000),
  /** Medical history captured at examination time (moved here from patient registration). */
  allergies: optionalString(2000),
  medicalConditions: optionalString(2000),
  previousSurgeries: optionalString(2000),
  currentMedications: optionalString(2000),
  patientHistory: optionalString(2000),
  familyHistory: optionalString(2000),
  habits: optionalString(2000),
  /** History of presenting illness (moved here from patient registration). */
  hpi: z
    .object({
      presentingComplaint: optionalString(500),
      onset: optionalString(50),
      durationValue: optionalString(20),
      durationUnit: optionalString(20),
      progression: optionalString(50),
      symptoms: optionalString(2000),
      aggravatingFactors: optionalString(500),
      relievingFactors: optionalString(500),
      associatedSymptoms: optionalString(2000),
      previousTreatment: optionalString(2000),
      additionalNotes: optionalString(2000),
    })
    .optional()
    .nullable(),
});

export type CreateExaminationInput = z.infer<
  typeof createExaminationSchema
>;

export const updateExaminationSchema = createExaminationSchema
  .partial()
  .omit({ patientId: true });

export type UpdateExaminationInput = z.infer<
  typeof updateExaminationSchema
>;

export const listExaminationsSchema = z.object({
  q: z.string().trim().max(200).optional(),
  patientId: z.string().trim().max(120).optional(),
  status: examinationStatusEnum.optional(),
  from: dateString.optional(),
  to: dateString.optional(),
});
