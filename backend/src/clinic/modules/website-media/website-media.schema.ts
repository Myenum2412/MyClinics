import type { Binary, Document } from "mongodb";

/**
 * Website builder media (logos, hero images, gallery photos, etc.).
 *
 * Binaries live in MongoDB, mirroring the avatar approach, so the public
 * website does not depend on a separately configured object-store bucket.
 * Every document is tenant-scoped by `clinicId`.
 */
export interface WebsiteMediaDocument extends Document {
  _id: unknown;
  clinicId: string;
  mediaId: string;
  fileName: string;
  contentType: string;
  size: number;
  data: Binary;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebsiteMediaPublic {
  mediaId: string;
  url: string;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: string;
}

export const WEBSITE_MEDIA_MAX_BYTES = 6 * 1024 * 1024;

export const WEBSITE_MEDIA_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type WebsiteMediaContentType = (typeof WEBSITE_MEDIA_CONTENT_TYPES)[number];

export function isWebsiteMediaContentType(value: string): value is WebsiteMediaContentType {
  return (WEBSITE_MEDIA_CONTENT_TYPES as readonly string[]).includes(value);
}

/** Returns the normalised image MIME type, or null when unsupported. */
export function normalizeWebsiteImageMime(value: string): WebsiteMediaContentType | null {
  const mime = value.toLowerCase().split(";")[0]?.trim() ?? "";
  if (mime === "image/jpeg" || mime === "image/jpg") return "image/jpeg";
  if (mime === "image/png") return "image/png";
  if (mime === "image/webp") return "image/webp";
  return null;
}

/** Magic-byte checks prevent an executable or SVG being uploaded as an image. */
export function isValidWebsiteImageData(
  contentType: WebsiteMediaContentType,
  data: Buffer
): boolean {
  if (contentType === "image/jpeg") {
    return data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  }
  if (contentType === "image/png") {
    return (
      data.length > 8 &&
      data[0] === 0x89 &&
      data[1] === 0x50 &&
      data[2] === 0x4e &&
      data[3] === 0x47 &&
      data[4] === 0x0d &&
      data[5] === 0x0a &&
      data[6] === 0x1a &&
      data[7] === 0x0a
    );
  }
  if (contentType === "image/webp") {
    return (
      data.length > 12 &&
      data.toString("ascii", 0, 4) === "RIFF" &&
      data.toString("ascii", 8, 12) === "WEBP"
    );
  }
  return false;
}

export function websiteMediaToPublic(
  doc: WebsiteMediaDocument,
  clinicId: string
): WebsiteMediaPublic {
  return {
    mediaId: doc.mediaId,
    // Relative URL: the public site and builder both run behind the Next
    // proxy, so /api/* resolves correctly in development and production.
    url: `/api/public/clinics/${encodeURIComponent(clinicId)}/website/media/${encodeURIComponent(doc.mediaId)}`,
    fileName: doc.fileName,
    contentType: doc.contentType,
    size: doc.size,
    createdAt: doc.createdAt.toISOString(),
  };
}
