import { z } from "zod";

export const quickAddSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().min(1),
  appointment: z
    .object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      time: z.string().regex(/^\d{2}:\d{2}$/),
      reason: z.string().min(1).max(500),
      notes: z.string().max(2000).nullable().optional(),
      department: z.string().max(100).optional(),
      visitType: z.string().max(50).optional(),
      duration: z.string().max(10).optional(),
      priority: z.string().max(20).optional(),
    })
    .optional(),
  record: z
    .object({
      visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      visitTime: z.string().optional(),
      diagnosis: z.string().min(1).max(1000),
      chiefComplaint: z.string().min(1).max(1000),
      symptoms: z.string().max(2000).optional().nullable(),
      treatment: z.string().max(2000).optional().nullable(),
      advice: z.string().max(2000).optional().nullable(),
      icdCode: z.string().max(20).optional().nullable(),
      bp: z.string().max(20).optional().nullable(),
      temp: z.string().max(20).optional().nullable(),
      pulse: z.string().max(20).optional().nullable(),
      allergies: z.string().max(1000).optional().nullable(),
      labTests: z.string().max(2000).optional().nullable(),
      internalNotes: z.string().max(2000).optional().nullable(),
      followUpDate: z.string().optional().nullable(),
      medicines: z
        .array(
          z.object({
            name: z.string().min(1),
            dosage: z.string().optional(),
            frequency: z.string().optional(),
            duration: z.string().optional(),
            instructions: z.string().optional(),
          })
        )
        .optional(),
    })
    .optional(),
  prescription: z
    .object({
      diagnosis: z.string().max(1000).optional().nullable(),
      medicine: z.string().min(1),
      dosage: z.string().optional().nullable(),
      frequency: z.string().optional().nullable(),
      duration: z.string().optional().nullable(),
      instructions: z.string().optional().nullable(),
      notes: z.string().max(2000).optional().nullable(),
      visitDate: z.string().optional(),
    })
    .optional(),
});

export type QuickAddInput = z.infer<typeof quickAddSchema>;
