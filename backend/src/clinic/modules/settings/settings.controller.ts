import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db-pools";
import {
  BadRequestError,
  UnauthorizedError,
} from "@/clinic/core/errors";
import { updateSettingsSchema } from "@/clinic/modules/settings/settings.dto";
import { settingsToPublic } from "@/clinic/modules/settings/settings.schema";
import { SettingsService } from "@/clinic/modules/settings/settings.service";

export class SettingsController {
  private service(db: Db): SettingsService {
    return new SettingsService(db);
  }

  async get(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await getDb();
    const settings = await this.service(db).getSettings(ctx);
    return reply.send(settingsToPublic(settings));
  }

  async update(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const parsed = updateSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message ?? "Invalid settings data");
    }
    const db = await getDb();
    const settings = await this.service(db).updateSettings(ctx, parsed.data);
    return reply.send(settingsToPublic(settings));
  }
}