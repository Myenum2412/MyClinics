import type { FastifyInstance } from "fastify";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/plugins/auth";
import {
  ensureDefaultOrganization,
  updateOrganizationDetails,
  type OrganizationRecord,
} from "@/services/customer/customer-context.service";
import { cached, invalidateCache } from "@/lib/cache";
import { handleError } from "@/lib/http";

const MAX = {
  name: 120,
  phone: 30,
  email: 120,
  address: 300,
  website: 120,
  description: 500,
};

export function mapCompany(org: OrganizationRecord) {
  return {
    name: org.name,
    phone: org.phone ?? null,
    email: org.email ?? null,
    address: org.address ?? null,
    website: org.website ?? null,
    description: org.description ?? null,
  };
}

function optionalString(value: unknown, max: number): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim().slice(0, max);
}

const ORG_CACHE_KEY = "organization:default";
const ORG_CACHE_TTL_MS = 60_000;

export function registerOrganizationRoutes(app: FastifyInstance): void {
  // Public: clinic name/details are non-sensitive and shown to unauthenticated
  // visitors on the login/signup screens. The PUT route below stays protected.
  app.get("/api/organization", async (request, reply) => {
    try {
      const db = await getDb();
      const org = await cached(ORG_CACHE_KEY, ORG_CACHE_TTL_MS, () =>
        ensureDefaultOrganization(db)
      );
      return reply.send({ company: mapCompany(org) });
    } catch (error) {
      handleError(reply, error, "Get company");
    }
  });

  app.put("/api/organization", async (request, reply) => {
    try {
      if (!(await requireAuth(request, reply))) return;
      if (!request.user?.id) {
        return reply.code(401).send({ error: "Unauthorized" });
      }

      const body = (request.body ?? {}) as Record<string, unknown>;
      const name = typeof body?.name === "string" ? body.name.trim() : "";
      if (!name) {
        return reply.code(400).send({ error: "Clinic name is required" });
      }
      if (name.length > MAX.name) {
        return reply.code(400).send({
          error: `Clinic name must be under ${MAX.name} characters`,
        });
      }

      const email = optionalString(body?.email, MAX.email);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return reply.code(400).send({
          error: "Please enter a valid email address",
        });
      }

      const phone = optionalString(body?.phone, MAX.phone);
      const address = optionalString(body?.address, MAX.address);
      const website = optionalString(body?.website, MAX.website);
      const description = optionalString(body?.description, MAX.description);

      const db = await getDb();
      const org = await ensureDefaultOrganization(db);
      const updated = await updateOrganizationDetails(db, org.id, {
        name,
        phone,
        email,
        address,
        website,
        description,
      });

      invalidateCache("organization:");

      return reply.send({ company: mapCompany(updated) });
    } catch (error) {
      handleError(reply, error, "Update company");
    }
  });
}