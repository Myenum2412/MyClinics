import { z } from "zod";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_24H = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const organizationIdSchema = z.string().min(1);

export const availabilitySchema = z.object({
  organizationId: organizationIdSchema,
  doctorName: z.string().min(1).max(200),
  date: z.string().regex(ISO_DATE, "Date must be YYYY-MM-DD"),
  time: z.string().regex(TIME_24H, "Time must be HH:MM"),
});

export const createAppointmentSchema = z.object({
  organizationId: organizationIdSchema,
  patientName: z.string().min(1).max(200),
  phoneNumber: z.string().min(1).max(32),
  doctorName: z.string().min(1).max(200),
  date: z.string().regex(ISO_DATE, "Date must be YYYY-MM-DD"),
  time: z.string().regex(TIME_24H, "Time must be HH:MM"),
  conversationId: z.string().min(1).max(200).optional(),
  customerId: z.string().min(1).max(200).optional(),
  notes: z.string().max(1000).optional(),
});

export const rescheduleAppointmentSchema = z.object({
  organizationId: organizationIdSchema,
  customerPhone: z.string().min(1).max(32),
  doctorName: z.string().min(1).max(200).optional(),
  oldDate: z.string().regex(ISO_DATE, "Date must be YYYY-MM-DD").optional(),
  newDate: z.string().regex(ISO_DATE, "Date must be YYYY-MM-DD"),
  newTime: z.string().regex(TIME_24H, "Time must be HH:MM"),
  conversationId: z.string().min(1).max(200).optional(),
});

export const cancelAppointmentSchema = z.object({
  organizationId: organizationIdSchema,
  customerPhone: z.string().min(1).max(32),
  doctorName: z.string().min(1).max(200).optional(),
  date: z.string().regex(ISO_DATE, "Date must be YYYY-MM-DD").optional(),
  time: z.string().regex(TIME_24H, "Time must be HH:MM").optional(),
});

export const appointmentStatusSchema = z.object({
  organizationId: organizationIdSchema,
  customerPhone: z.string().min(1).max(32),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
export type RescheduleAppointmentInput = z.infer<typeof rescheduleAppointmentSchema>;
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
export type AppointmentStatusInput = z.infer<typeof appointmentStatusSchema>;
