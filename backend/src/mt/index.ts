import type { FastifyInstance } from "fastify";
import { applyTenantScope } from "@/mt/core/tenant-scope";
import { registerPublicAuthRoutes, registerProtectedAuthRoutes } from "@/mt/modules/auth/auth.routes";
import { registerClinicRoutes } from "@/mt/modules/clinics/clinics.routes";
import { registerUserRoutes } from "@/mt/modules/users/users.routes";
import { registerPatientRoutes, registerPatientSelfRoutes } from "@/mt/modules/patients/patients.routes";
import { registerAppointmentRoutes } from "@/mt/modules/appointments/appointments.routes";
import { registerMedicalRecordRoutes } from "@/mt/modules/medical-records/medical-records.routes";
import { registerPrescriptionRoutes } from "@/mt/modules/prescriptions/prescriptions.routes";
import { registerAuditLogRoutes } from "@/mt/modules/audit-logs/audit-logs.routes";

/**
 * Multi-tenant API entry point.
 *
 * Layout:
 *   /api/mt/auth/signup, /api/mt/auth/login   → public (no tenant yet)
 *   everything else under /api/mt             → behind the tenant-scope
 *     middleware (JWT → clinicId + role → request.tenant)
 *
 * The tenant-scope plugin is registered on an encapsulated child context, so
 * the legacy single-tenant API is completely unaffected.
 */
export function registerMultiTenantApi(app: FastifyInstance): void {
  registerPublicAuthRoutes(app);

  // Encapsulated context: the tenant-scope middleware runs for every route
  // registered below, and only for those routes.
  app.register(async (tenantApi) => {
    applyTenantScope(tenantApi);

    registerProtectedAuthRoutes(tenantApi);
    registerClinicRoutes(tenantApi);
    registerUserRoutes(tenantApi);
    registerPatientRoutes(tenantApi);
    registerPatientSelfRoutes(tenantApi);
    registerAppointmentRoutes(tenantApi);
    registerMedicalRecordRoutes(tenantApi);
    registerPrescriptionRoutes(tenantApi);
    registerAuditLogRoutes(tenantApi);
  });
}