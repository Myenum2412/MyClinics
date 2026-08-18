import { z } from "zod";

export const updateClinicSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
});

export type UpdateClinicInput = z.infer<typeof updateClinicSchema>;

export const clinicResponseSchema = z.object({
  clinicId: z.string(),
  slug: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  status: z.enum(["active", "suspended", "deleted"]),
  plan: z.enum(["free", "pro", "enterprise"]),
  createdAt: z.date(),
});

export type ClinicResponse = z.infer<typeof clinicResponseSchema>;