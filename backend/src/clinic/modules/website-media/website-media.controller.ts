import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicOf } from "@/clinic/core/context";
import { BadRequestError, NotFoundError, UnauthorizedError } from "@/clinic/core/errors";
import { generateWebsiteMediaId } from "@/clinic/core/ids";
import {
  getWebsiteMediaRepository,
  type WebsiteMediaRepository,
} from "@/clinic/modules/website-media/website-media.repository";
import {
  WEBSITE_MEDIA_MAX_BYTES,
  isValidWebsiteImageData,
  normalizeWebsiteImageMime,
  websiteMediaToPublic,
  type WebsiteMediaContentType,
} from "@/clinic/modules/website-media/website-media.schema";

function safeFileName(value: string | undefined): string {
  const base = (value ?? "image").split(/[\\/]/).pop() ?? "image";
  const cleaned = base.replace(/[^a-zA-Z0-9._ -]+/g, "_").trim().slice(0, 120);
  return cleaned || "image";
}

async function repositoryFor(request: FastifyRequest): Promise<{
  clinicId: string;
  repo: WebsiteMediaRepository;
}> {
  const ctx = request.clinic;
  if (!ctx) throw new UnauthorizedError();
  const clinicId = requireClinicOf(ctx);
  return { clinicId, repo: await getWebsiteMediaRepository(clinicId) };
}

export class WebsiteMediaController {
  /** Upload an image and return its public URL. Multipart field name: `file`. */
  async upload(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const { clinicId, repo } = await repositoryFor(request);

    let fileName = "image";
    let contentType: WebsiteMediaContentType | null = null;
    let data: Buffer | null = null;

    for await (const part of request.parts()) {
      if (part.type !== "file") continue;
      if (data) throw new BadRequestError("Upload one image at a time");

      const buffer = await part.toBuffer();
      if (buffer.length === 0) throw new BadRequestError("The image file is empty");
      if (buffer.length > WEBSITE_MEDIA_MAX_BYTES) {
        throw new BadRequestError("Images must be smaller than 6MB");
      }

      const mime = normalizeWebsiteImageMime(part.mimetype ?? "");
      if (!mime || !isValidWebsiteImageData(mime, buffer)) {
        throw new BadRequestError("Upload a JPG, PNG or WebP image");
      }

      fileName = safeFileName(part.filename);
      contentType = mime;
      data = buffer;
    }

    if (!data || !contentType) {
      throw new BadRequestError("An image file is required");
    }

    const doc = await repo.create({
      clinicId,
      mediaId: generateWebsiteMediaId(),
      fileName,
      contentType,
      data,
    });

    return reply.code(201).send({ media: websiteMediaToPublic(doc, clinicId) });
  }

  /** List recently uploaded images for the media picker. */
  async list(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const { clinicId, repo } = await repositoryFor(request);
    const docs = await repo.list(120);
    return reply.send({
      media: docs.map((doc) => websiteMediaToPublic(doc, clinicId)),
    });
  }

  async remove(request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> {
    const { repo } = await repositoryFor(request);
    const { mediaId } = request.params as { mediaId?: string };
    if (!mediaId) throw new BadRequestError("Image is required");
    const removed = await repo.deleteOne(mediaId);
    if (!removed) throw new NotFoundError("Image not found");
    return reply.send({ ok: true });
  }
}
