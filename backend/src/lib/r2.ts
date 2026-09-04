import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | null = null;

export function r2Config() {
  const endpoint = process.env.R2_ENDPOINT;
  const accountId = endpoint
    ? new URL(endpoint).hostname.split(".")[0]
    : process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY || process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.R2_SECRET_KEY || process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET || process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "R2 storage is not configured. Add R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY and R2_BUCKET (or R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME) to .env.local"
    );
  }

  return {
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    accessKeyId,
    secretAccessKey,
    bucket,
  };
}

function getR2() {
  if (!client) {
    const cfg = r2Config();
    client = new S3Client({
      region: "auto",
      endpoint: cfg.endpoint,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
  }
  return client;
}

export async function uploadToR2(key: string, body: Buffer, contentType: string) {
  const { bucket } = r2Config();
  await getR2().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function deleteFromR2(key: string) {
  const { bucket } = r2Config();
  await getR2().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/** Copy an object to a new key within the same bucket. */
export async function copyObjectInR2(sourceKey: string, targetKey: string) {
  const { bucket } = r2Config();
  await getR2().send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${sourceKey}`,
      Key: targetKey,
    })
  );
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    await getR2().send(new HeadObjectCommand({ Bucket: r2Config().bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

const SAFE_INLINE_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/tiff"]);

function sanitizeContentType(input: string | null | undefined): string | undefined {
  if (!input) return undefined;
  const ct = input.toLowerCase().trim().split(";")[0].trim();
  // Only allow known safe types; otherwise force application/octet-stream
  if (SAFE_INLINE_TYPES.has(ct) || ct.startsWith("video/")) return ct;
  // For other types, use generic binary to prevent sniff XSS
  if (ct === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      ct === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      ct === "application/dicom" || ct === "application/dcm") return ct;
  return "application/octet-stream";
}

export async function getDownloadUrl(
  key: string,
  expiresIn = 3600,
  contentType?: string | null,
  options?: { disposition?: "inline" | "attachment"; fileName?: string }
) {
  const { bucket } = r2Config();
  const safeType = sanitizeContentType(contentType);
  // Default to attachment to prevent stored XSS (SEC-006). Only allow inline for safe types.
  const disposition = options?.disposition ?? "attachment";
  const fileName = options?.fileName ? options.fileName.replace(/[^a-zA-Z0-9._-]/g, "_") : undefined;
  const contentDisposition = disposition === "inline" && safeType && SAFE_INLINE_TYPES.has(safeType)
    ? `inline${fileName ? `; filename="${fileName}"` : ""}`
    : `attachment${fileName ? `; filename="${fileName}"` : ""}`;
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: contentDisposition,
    ResponseCacheControl: "no-store",
    ...(safeType ? { ResponseContentType: safeType } : {}),
  });
  return getSignedUrl(getR2(), command, { expiresIn });
}

/** Downloads an object's full contents as a Buffer. */
export async function downloadFromR2(key: string): Promise<Buffer> {
  const { bucket } = r2Config();
  const result = await getR2().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = await result.Body?.transformToByteArray();
  if (!bytes) throw new Error(`R2 object is empty: ${key}`);
  return Buffer.from(bytes);
}

export interface R2ObjectInfo {
  key: string;
  size: number;
  lastModified?: Date;
}

export async function listR2Objects(prefix: string, limit = 1000) {
  const { bucket } = r2Config();
  const result = await getR2().send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, MaxKeys: limit })
  );
  return (result.Contents ?? [])
    .filter((o) => o.Key !== undefined && o.Key !== null)
    .map((o) => ({
      key: o.Key as string,
      size: o.Size ?? 0,
      lastModified: o.LastModified,
    }));
}

export async function ensureFolderMarker(prefix: string) {
  const { bucket } = r2Config();
  const markerKey = `${prefix}.folder`;
  try {
    await getR2().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: markerKey,
        Body: Buffer.alloc(0),
        ContentType: "application/x-empty",
      })
    );
  } catch {
    // marker is best-effort; folder visibility is derived from contents anyway
  }
}

export async function ensurePatientFolders(patientId: string) {
  const base = `reports/patients/${patientId}/`;
  const folders = ["Appointments", "Patients", "Prescriptions", "Medicines", "Billing"];
  await Promise.all(folders.map((f) => ensureFolderMarker(`${base}${f}/`)));
}