import { z } from "zod";

export const listAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  entity: z.string().trim().max(60).optional(),
  entityId: z.string().trim().max(80).optional(),
  actorId: z.string().trim().max(80).optional(),
  action: z.string().trim().max(30).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;

export const auditLogsPatientQuerySchema = z.object({
  patientId: z.string().regex(/^pat_[A-Za-z0-9]{8,40}$/, "Invalid patient id"),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export type AuditLogsPatientQuery = z.infer<typeof auditLogsPatientQuerySchema>;