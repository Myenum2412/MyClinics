import { z } from "zod";

export const createAppointmentSchema = z.object({
  patientId: z.string().regex(/^pat_[A-Za-z0-9]{8,40}$/, "Invalid patient id"),
  doctorUserId: z.string().regex(/^usr_[A-Za-z0-9]{8,40}$/, "Invalid doctor id").optional().nullable(),
  doctorName: z.string().trim().min(2).max(120).optional().nullable(),
  department: z.string().trim().max(100).optional().nullable(),
  date: z.string().date("Date must be YYYY-MM-DD"),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM 24h"),
  reason: z.string().trim().max(500).optional().nullable(),
  type: z.enum(["in-person", "video", "phone"]).default("in-person"),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const appointmentParamsSchema = z.object({
  appointmentId: z.string().regex(/^apt_[A-Za-z0-9]{8,40}$/, "Invalid appointment id"),
});

export type AppointmentParams = z.infer<typeof appointmentParamsSchema>;

export const updateAppointmentSchema = createAppointmentSchema
  .omit({ patientId: true })
  .partial()
  .extend({
    status: z.enum(["pending", "confirmed", "completed", "cancelled", "no-show"]).optional(),
  });

export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

export const listAppointmentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  patientId: z.string().regex(/^pat_[A-Za-z0-9]{8,40}$/).optional(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled", "no-show"]).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;