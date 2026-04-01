/**
 * Provider: armazenamento local em disco.
 * Para desenvolvimento. Em produção use S3.
 *
 * Env:
 *   STORAGE_LOCAL_PATH = ./uploads  (padrão)
 *   STORAGE_PUBLIC_URL = http://localhost:3333/uploads
 */

import { mkdir, writeFile } from 'fs/promises';
import { join, extname } from 'path';

const BASE_DIR = process.env.STORAGE_LOCAL_PATH ?? './uploads';
const PUBLIC_URL = process.env.STORAGE_PUBLIC_URL ?? 'http://localhost:3333/uploads';

export async function upload({ storedFileName, buffer, mimeType }) {
  await mkdir(BASE_DIR, { recursive: true });
  const filePath = join(BASE_DIR, storedFileName);
  await writeFile(filePath, buffer);
  return { fileUrl: `${PUBLIC_URL}/${storedFileName}` };
}

export async function remove(storedFileName) {
  const { unlink } = await import('fs/promises');
  const filePath = join(BASE_DIR, storedFileName);
  await unlink(filePath).catch(() => {}); // silencia se já não existe
}

export function getPublicUrl(storedFileName) {
  return `${PUBLIC_URL}/${storedFileName}`;
}
