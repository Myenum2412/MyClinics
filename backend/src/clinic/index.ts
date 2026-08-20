import type { FastifyInstance } from "fastify";
import { applyClinicScope } from "@/clinic/core/scope";
import { registerPublicAuthRoutes, registerProtectedAuthRoutes } from "@/clinic/modules/auth/auth.routes";
import { registerClinicRoutes } from "@/clinic/modules/clinics/clinics.routes";
import { registerUserRoutes } from "@/clinic/modules/users/users.routes";
import { registerDoctorRoutes } from "@/clinic/modules/doctors/doctors.routes";
import { registerStaffRoutes } from "@/clinic/modules/staff/staff.routes";
import { registerPatientRoutes, registerPatientSelfRoutes } from "@/clinic/modules/patients/patients.routes";
import { registerAppointmentRoutes } from "@/clinic/modules/appointments/appointments.routes";
import { registerMedicineRoutes } from "@/clinic/modules/medicine/medicine.routes";
import { registerMedicalRecordRoutes } from "@/clinic/modules/medical-record/medical-record.routes";
import { registerPrescriptionRoutes } from "@/clinic/modules/prescriptions/prescriptions.routes";
import { registerBillingRoutes } from "@/clinic/modules/billing/billing.routes";
import { registerSettingsRoutes } from "@/clinic/modules/settings/settings.routes";
import { registerNotificationRoutes } from "@/clinic/modules/notifications/notifications.routes";
import { registerAuditLogRoutes } from "@/clinic/modules/audit-logs/audit-logs.routes";
import { registerPatientPortalRoutes } from "@/clinic/modules/portal/patient-portal.routes";
import { registerAvatarRoutes } from "@/clinic/modules/avatars/avatars.routes";

/**
 * Clinic (multi-tenant) API entry point.
 *
 * Layout:
 *   /api/clinics/auth/signup, /api/clinics/auth/login, /api/clinics/auth/refresh
 *     → public (no tenant yet, rate-limited)
 *   everything else under /api/clinics → behind the clinic-scope middleware
 *     (JWT → clinicId + role + doctorId/patientId → request.clinic)
 *
 * Every tenant route is registered under the URL pattern
 * `/api/clinics/:clinicId/<module>`, and the `requireClinicAccess` guard
 * verifies the URL clinicId against the authenticated session — the URL is
 * never trusted on its own.
 */
export function registerClinicApi(app: FastifyInstance): void {
  registerPublicAuthRoutes(app);

  // Encapsulated context: the clinic-scope middleware runs for every route
  // registered below, and only for those routes.
  app.register(async (tenantApi) => {
    applyClinicScope(tenantApi);

    registerProtectedAuthRoutes(tenantApi);
    registerClinicRoutes(tenantApi);
    registerUserRoutes(tenantApi);
    registerDoctorRoutes(tenantApi);
    registerStaffRoutes(tenantApi);
    registerPatientRoutes(tenantApi);
    registerPatientSelfRoutes(tenantApi);
    registerAppointmentRoutes(tenantApi);
    registerMedicineRoutes(tenantApi);
    registerMedicalRecordRoutes(tenantApi);
    registerPrescriptionRoutes(tenantApi);
    registerBillingRoutes(tenantApi);
    registerSettingsRoutes(tenantApi);
    registerNotificationRoutes(tenantApi);
    registerAuditLogRoutes(tenantApi);
    registerPatientPortalRoutes(tenantApi);
    registerAvatarRoutes(tenantApi);
  });
}