/**
 * Provider: AWS S3 (ou compatível: Cloudflare R2, MinIO, DigitalOcean Spaces).
 *
 * Envs necessárias:
 *   AWS_REGION          = us-east-1
 *   AWS_ACCESS_KEY_ID   = <key>
 *   AWS_SECRET_ACCESS_KEY = <secret>
 *   S3_BUCKET           = attivo-files
 *   S3_ENDPOINT         = (opcional, para compatíveis como R2/MinIO)
 *   S3_PUBLIC_URL       = https://seu-bucket.s3.amazonaws.com (ou CDN)
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

function getClient() {
  return new S3Client({
    region:   process.env.AWS_REGION ?? 'us-east-1',
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    forcePathStyle: !!process.env.S3_ENDPOINT, // necessário para MinIO/R2
  });
}

const BUCKET = () => {
  const b = process.env.S3_BUCKET;
  if (!b) throw new Error('S3_BUCKET não configurado');
  return b;
};

export async function upload({ storedFileName, buffer, mimeType }) {
  const client = getClient();
  await client.send(new PutObjectCommand({
    Bucket:      BUCKET(),
    Key:         storedFileName,
    Body:        buffer,
    ContentType: mimeType ?? 'application/octet-stream',
  }));

  return { fileUrl: getPublicUrl(storedFileName) };
}

export async function remove(storedFileName) {
  const client = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: storedFileName }));
}

export function getPublicUrl(storedFileName) {
  const base = process.env.S3_PUBLIC_URL ?? `https://${BUCKET()}.s3.amazonaws.com`;
  return `${base}/${storedFileName}`;
}
