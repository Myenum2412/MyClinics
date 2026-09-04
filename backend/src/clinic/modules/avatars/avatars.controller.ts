import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicOf } from "@/clinic/core/context";
import { BadRequestError, UnauthorizedError } from "@/clinic/core/errors";
import {
  ALLOWED_AVATAR_OWNER_TYPES,
  type AvatarOwnerType,
} from "@/clinic/modules/avatars/avatars.schema";
import { getAvatarRepository } from "@/clinic/modules/avatars/avatars.repository";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
};

function avatarRoute(
  clinicId: string,
  ownerType: string,
  ownerId: string
): string {
  return `/api/clinics/${clinicId}/avatars/${ownerType}/${encodeURIComponent(ownerId)}`;
}

export class AvatarController {
  /** Upload a profile photo (JPG/PNG, max 2MB) for a patient, doctor or the clinic itself. */
  async upload(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();

    let ownerType = "";
    let ownerId = "";
    let contentType = "";
    let data: Buffer | null = null;

    for await (const part of request.parts()) {
      if (part.type === "field") {
        if (part.fieldname === "ownerType") ownerType = String(part.value ?? "");
        if (part.fieldname === "ownerId") ownerId = String(part.value ?? "");
      } else if (part.type === "file") {
        const buf = await part.toBuffer();
        if (buf.length > MAX_AVATAR_BYTES) {
          throw new BadRequestError("Image must be smaller than 2MB");
        }
        data = buf;
        const mime = part.mimetype ?? "";
        if (mime === "image/jpeg" || mime === "image/jpg") contentType = "image/jpeg";
        else if (mime === "image/png") contentType = "image/png";
        else throw new BadRequestError("Only JPG or PNG images are allowed");
        // SEC-005: magic byte check to prevent MIME spoof (e.g. SVG as PNG)
        const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
        const isJpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
        if (contentType === "image/png" && !isPng) throw new BadRequestError("Invalid PNG file");
        if (contentType === "image/jpeg" && !isJpg) throw new BadRequestError("Invalid JPEG file");
      }
    }

    if (!ALLOWED_AVATAR_OWNER_TYPES.has(ownerType)) {
      throw new BadRequestError("Invalid avatar owner type");
    }
    if (!ownerId) throw new BadRequestError("ownerId is required");
    if (!data || data.length === 0) throw new BadRequestError("An image file is required");

    const clinicId = requireClinicOf(ctx);
    const repo = await getAvatarRepository(ctx);
    await repo.upsert(ownerType as AvatarOwnerType, ownerId, contentType, data);

    return reply.send({ url: avatarRoute(clinicId, ownerType, ownerId) });
  }

  /** Stream the avatar binary, or 404 if none is set. */
  async getUrl(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();

    const { ownerType, ownerId } = request.params as { ownerType: string; ownerId: string };
    if (!ALLOWED_AVATAR_OWNER_TYPES.has(ownerType) || !ownerId) {
      throw new BadRequestError("Invalid avatar owner");
    }

    const repo = await getAvatarRepository(ctx);
    const avatar = await repo.findOne(ownerType as AvatarOwnerType, ownerId);
    if (!avatar) return reply.code(404).send({ error: "Avatar not found" });

    return reply
      .header("Content-Type", avatar.contentType)
      .header("Cache-Control", "no-store")
      .send(avatar.data.buffer as Buffer);
  }
}
