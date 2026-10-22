import type { FastifyReply, FastifyRequest } from "fastify";
import { ContactService, type ListContactsInput } from "@/clinic/modules/crm-contacts/crm-contacts.service";
import type { ClinicContext } from "@/clinic/core/context";

export class ContactController {
  constructor(private readonly service: ContactService) {}

  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic as ClinicContext;
    const body = request.body as any;
    const contact = await this.service.createContact(ctx, body);
    return reply.code(201).send({ contact });
  }

  async get(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic as ClinicContext;
    const { contactId } = request.params as { contactId: string };
    const contact = await this.service.getContact(ctx, contactId);
    return reply.send({ contact });
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic as ClinicContext;
    const query = request.query as Record<string, string | undefined>;
    const source = query.source as ListContactsInput["source"];
    const input = {
      archived: query.archived === "true" ? true : query.archived === "false" ? false : undefined,
      q: query.q,
      ownerId: query.ownerId,
      companyId: query.companyId,
      source,
      page: query.page ? parseInt(query.page, 10) : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      sort: query.sort,
    };
    const result = await this.service.listContacts(ctx, input);
    return reply.send(result);
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic as ClinicContext;
    const { contactId } = request.params as { contactId: string };
    const body = request.body as Record<string, unknown>;
    const contact = await this.service.updateContact(ctx, contactId, body);
    return reply.send({ contact });
  }

  async archive(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic as ClinicContext;
    const { contactId } = request.params as { contactId: string };
    await this.service.archiveContact(ctx, contactId);
    return reply.send({ ok: true });
  }

  async restore(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic as ClinicContext;
    const { contactId } = request.params as { contactId: string };
    await this.service.restoreContact(ctx, contactId);
    return reply.send({ ok: true });
  }

  async remove(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic as ClinicContext;
    const { contactId } = request.params as { contactId: string };
    await this.service.deleteContact(ctx, contactId);
    return reply.send({ ok: true });
  }

  async bulkArchive(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic as ClinicContext;
    const { ids } = request.body as { ids: string[] };
    const count = await this.service.bulkArchive(ctx, ids);
    return reply.send({ count });
  }

  async bulkRestore(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic as ClinicContext;
    const { ids } = request.body as { ids: string[] };
    const count = await this.service.bulkRestore(ctx, ids);
    return reply.send({ count });
  }

  async bulkDelete(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic as ClinicContext;
    const { ids } = request.body as { ids: string[] };
    const count = await this.service.bulkDelete(ctx, ids);
    return reply.send({ count });
  }

  async bulkUpdateOwner(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic as ClinicContext;
    const { ids, ownerId } = request.body as { ids: string[]; ownerId: string | null };
    const count = await this.service.bulkUpdateOwner(ctx, ids, ownerId);
    return reply.send({ count });
  }

  async bulkUpdateCompany(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic as ClinicContext;
    const { ids, companyId } = request.body as { ids: string[]; companyId: string | null };
    const count = await this.service.bulkUpdateCompany(ctx, ids, companyId);
    return reply.send({ count });
  }
}