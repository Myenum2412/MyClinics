import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | null = null;

export function r2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "R2 storage is not configured. Add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME to .env.local"
    );
  }

  return { accountId, accessKeyId, secretAccessKey, bucket };
}

function getR2() {
  if (!client) {
    const cfg = r2Config();
    client = new S3Client({
      region: "auto",
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
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
