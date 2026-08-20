import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicOf } from "@/clinic/core/context";
import { BadRequestError, UnauthorizedError } from "@/clinic/core/errors";
import { getDownloadUrl, objectExists, uploadToR2 } from "@/lib/r2";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_OWNER_TYPES = new Set(["patient", "doctor", "clinic"]);

function avatarKey(clinicId: string, ownerType: string, ownerId: string, ext: string): string {
  return `avatars/${clinicId}/${ownerType}/${ownerId}${ext}`;
}

export class AvatarController {
  /** Upload a profile photo (JPG/PNG, max 2MB) for a patient, doctor or the clinic itself. */
  async upload(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();

    let ownerType = "";
    let ownerId = "";
    let ext = "";
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
        if (mime === "image/jpeg" || mime === "image/jpg") ext = ".jpg";
        else if (mime === "image/png") ext = ".png";
        else throw new BadRequestError("Only JPG or PNG images are allowed");
      }
    }

    if (!ALLOWED_OWNER_TYPES.has(ownerType)) throw new BadRequestError("Invalid avatar owner type");
    if (!ownerId) throw new BadRequestError("ownerId is required");
    if (!data || data.length === 0) throw new BadRequestError("An image file is required");

    const key = avatarKey(requireClinicOf(ctx), ownerType, ownerId, ext);
    await uploadToR2(key, data, ext === ".png" ? "image/png" : "image/jpeg");
    return reply.send({ url: await getDownloadUrl(key) });
  }

  /** Return a signed URL for the avatar, or null if none is set. */
  async getUrl(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const ctx = request.clinic;
    if (!ctx) throw new UnauthorizedError();

    const { ownerType, ownerId } = request.params as { ownerType: string; ownerId: string };
    if (!ALLOWED_OWNER_TYPES.has(ownerType) || !ownerId) {
      throw new BadRequestError("Invalid avatar owner");
    }

    const jpg = avatarKey(requireClinicOf(ctx), ownerType, ownerId, ".jpg");
    const png = avatarKey(requireClinicOf(ctx), ownerType, ownerId, ".png");
    const existing = (await objectExists(jpg))
      ? jpg
      : (await objectExists(png))
        ? png
        : null;

    return reply.send({ url: existing ? await getDownloadUrl(existing) : null });
  }
}