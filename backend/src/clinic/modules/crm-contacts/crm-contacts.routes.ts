import type { FastifyInstance } from "fastify";
import { ContactController } from "@/clinic/modules/crm-contacts/crm-contacts.controller";
import { ContactService } from "@/clinic/modules/crm-contacts/crm-contacts.service";
import { getDb } from "@/lib/db-pools";
import { requireClinicAccess, requireRoles } from "@/clinic/core/scope";

/**
 * CRM Contacts routes — clinic-scoped.
 *
 *   GET    /api/clinics/:clinicId/crm/contacts           staff+
 *   POST   /api/clinics/:clinicId/crm/contacts           staff+
 *   GET    /api/clinics/:clinicId/crm/contacts/:id       staff+
 *   PATCH  /api/clinics/:clinicId/crm/contacts/:id       staff+
 *   POST   /api/clinics/:clinicId/crm/contacts/:id/archive   staff+
 *   POST   /api/clinics/:clinicId/crm/contacts/:id/restore   staff+
 *   DELETE /api/clinics/:clinicId/crm/contacts/:id       clinic_admin
 *   POST   /api/clinics/:clinicId/crm/contacts/bulk/archive  staff+
 *   POST   /api/clinics/:clinicId/crm/contacts/bulk/restore  staff+
 *   POST   /api/clinics/:clinicId/crm/contacts/bulk/delete   clinic_admin
 *   POST   /api/clinics/:clinicId/crm/contacts/bulk/owner    staff+
 *   POST   /api/clinics/:clinicId/crm/contacts/bulk/company  staff+
 */
let controllerPromise: Promise<ContactController> | null = null;

function getController(): Promise<ContactController> {
  if (!controllerPromise) {
    controllerPromise = getDb().then((db) => new ContactController(new ContactService(db)));
  }
  return controllerPromise;
}

export function registerCrmContactsRoutes(app: FastifyInstance): void {
  app.get(
    "/api/clinics/:clinicId/crm/contacts",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => (await getController()).list(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/crm/contacts",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => (await getController()).create(request, reply)
  );

  app.get(
    "/api/clinics/:clinicId/crm/contacts/:contactId",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => (await getController()).get(request, reply)
  );

  app.patch(
    "/api/clinics/:clinicId/crm/contacts/:contactId",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => (await getController()).update(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/crm/contacts/:contactId/archive",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => (await getController()).archive(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/crm/contacts/:contactId/restore",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => (await getController()).restore(request, reply)
  );

  app.delete(
    "/api/clinics/:clinicId/crm/contacts/:contactId",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => (await getController()).remove(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/crm/contacts/bulk/archive",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => (await getController()).bulkArchive(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/crm/contacts/bulk/restore",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => (await getController()).bulkRestore(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/crm/contacts/bulk/delete",
    { preHandler: [requireClinicAccess, requireRoles("clinic_admin")] },
    async (request, reply) => (await getController()).bulkDelete(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/crm/contacts/bulk/owner",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => (await getController()).bulkUpdateOwner(request, reply)
  );

  app.post(
    "/api/clinics/:clinicId/crm/contacts/bulk/company",
    { preHandler: [requireClinicAccess, requireRoles("staff")] },
    async (request, reply) => (await getController()).bulkUpdateCompany(request, reply)
  );
}