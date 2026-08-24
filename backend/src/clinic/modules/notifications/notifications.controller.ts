import type { FastifyReply, FastifyRequest } from "fastify";
import type { Db } from "mongodb";
import { getDb } from "@/lib/db-pools";
import {
  BadRequestError,
  UnauthorizedError,
} from "@/clinic/core/errors";
import { parsePagination } from "@/clinic/core/pagination";
import { isAllowedUpload } from "@/clinic/core/upload-guard";
import {
  notificationToPublic,
  NOTIFICATION_TYPES,
} from "@/clinic/modules/notifications/notifications.schema";
import { NotificationService, type WhatsappAttachment } from "@/clinic/modules/notifications/notifications.service";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENTS = 3;

export class NotificationController {
  private service(db: Db): NotificationService {
    return new NotificationService(db);
  }

  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const query = request.query as { unreadOnly?: string };
    const { skip, limit } = parsePagination(request.query as Record<string, unknown>);
    const db = await getDb();
    const result = await this.service(db).listMine(ctx, {
      unreadOnly: query.unreadOnly === "true",
      skip,
      limit,
    });
    return reply.send({
      items: result.items.map(notificationToPublic),
      total: result.total,
      unread: result.unread,
    });
  }

  async create(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const body = (request.body ?? {}) as Record<string, unknown>;
    const parsed = {
      recipientUserId:
        typeof body.recipientUserId === "string" ? body.recipientUserId : null,
      type: typeof body.type === "string" ? body.type : null,
      title: typeof body.title === "string" ? body.title : null,
      body: typeof body.body === "string" ? body.body : null,
      link: typeof body.link === "string" ? body.link : null,
    };
    if (!parsed.recipientUserId || !parsed.type || !parsed.title) {
      throw new BadRequestError("recipientUserId, type and title are required");
    }
    const db = await getDb();
    const notification = await this.service(db).create(ctx, parsed as never);
    return reply.code(201).send(notificationToPublic(notification));
  }

  /**
   * WhatsApp broadcast to patients (multipart). Fields:
   *   all        "true" → every active patient in the clinic
   *   patientIds JSON array of patientIds (ignored when all=true)
   *   type       one of NOTIFICATION_TYPES (default "general")
   *   title      required message title
   *   message    optional message body
   *   attachments zero or more files (field name "attachments")
   */
  async sendWhatsapp(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();

    let all = false;
    let patientIds: string[] = [];
    let type = "general";
    let title = "";
    let message = "";
    const attachments: WhatsappAttachment[] = [];

    for await (const part of request.parts()) {
      if (part.type === "file") {
        if (part.fieldname !== "attachments") continue;
        if (attachments.length >= MAX_ATTACHMENTS) {
          throw new BadRequestError(`At most ${MAX_ATTACHMENTS} attachments are allowed`);
        }
        const data = await part.toBuffer();
        if (data.length > MAX_ATTACHMENT_BYTES) {
          throw new BadRequestError("Each attachment must be 10MB or smaller");
        }
        if (!isAllowedUpload(part.filename ?? "file", part.mimetype ?? null)) {
          throw new BadRequestError(
            "Unsupported attachment type. Only PDF, DOCX, XLSX, JPG, PNG, TIFF, DICOM and video files are allowed."
          );
        }
        attachments.push({
          filename: part.filename ?? "file",
          mimetype: part.mimetype || "application/octet-stream",
          data,
        });
        continue;
      }
      const value = String(part.value ?? "");
      if (part.fieldname === "all") all = value === "true";
      else if (part.fieldname === "patientIds") {
        try {
          const parsed: unknown = JSON.parse(value);
          patientIds = Array.isArray(parsed)
            ? parsed.filter((id): id is string => typeof id === "string" && id.trim() !== "")
            : [];
        } catch {
          throw new BadRequestError("patientIds must be a JSON array of patient ids");
        }
      } else if (part.fieldname === "type") type = value;
      else if (part.fieldname === "title") title = value;
      else if (part.fieldname === "message") message = value;
    }

    if (!title.trim()) throw new BadRequestError("title is required");
    if (!message.trim() && attachments.length === 0) {
      throw new BadRequestError("A message or at least one attachment is required");
    }
    if (!(NOTIFICATION_TYPES as readonly string[]).includes(type)) {
      throw new BadRequestError("Invalid notification type");
    }
    if (!all && patientIds.length === 0) {
      throw new BadRequestError("Select at least one patient or choose all patients");
    }

    const db = await getDb();
    const result = await this.service(db).sendWhatsappBroadcast(ctx, {
      all,
      patientIds,
      type: type as (typeof NOTIFICATION_TYPES)[number],
      title: title.trim(),
      message: message.trim(),
    }, attachments);
    return reply.send(result);
  }

  async markRead(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const { notificationId } = request.params as { notificationId: string };
    const db = await getDb();
    await this.service(db).markRead(ctx, notificationId);
    return reply.send({ ok: true });
  }

  async markAllRead(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();
    const db = await getDb();
    const modified = await this.service(db).markAllRead(ctx);
    return reply.send({ ok: true, modified });
  }
}