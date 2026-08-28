import { z } from "zod";

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
] as const;

export const appointmentSchema = z.object({
  patientId: z.string().startsWith("pat_"),
  doctorId: z.string().startsWith("doc_"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:mm"),
  reason: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export type CreateAppointmentInput = z.infer<typeof appointmentSchema>;

export const updateAppointmentSchema = z.object({
  patientId: z.string().startsWith("pat_").optional(),
  doctorId: z.string().startsWith("doc_").optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  reason: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

export const listAppointmentsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  doctorId: z.string().startsWith("doc_").optional(),
  patientId: z.string().startsWith("pat_").optional(),
});

export const rescheduleQueueSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

export type RescheduleQueueInput = z.infer<typeof rescheduleQueueSchema>;

export const queueSettingsSchema = z.object({
  enabledStages: z
    .array(z.enum(["you_are_next", "please_be_ready", "token_called", "proceed_to_room"]))
    .optional(),
  channel: z.enum(["whatsapp", "sms", "push", "in_app"]).optional(),
  templateOverrides: z
    .record(z.enum(["you_are_next", "please_be_ready", "token_called", "proceed_to_room"]), z.string())
    .optional(),
});

export type QueueSettingsInput = z.infer<typeof queueSettingsSchema>;