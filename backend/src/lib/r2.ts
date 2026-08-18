import {
  DeleteObjectCommand,
  GetObjectCommand,
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

export async function getDownloadUrl(key: string, expiresIn = 3600) {
  const { bucket } = r2Config();
  return getSignedUrl(getR2(), new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn,
  });
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