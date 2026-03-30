/**
 * Storage Service — interface única de upload/remoção.
 *
 * Provider configurado por env STORAGE_PROVIDER:
 *   local | s3  (padrão: local)
 *
 * Limites e validações aplicados aqui, independente do provider.
 */

import { randomUUID } from 'crypto';
import { extname } from 'path';
import mime from 'mime-types';
import { logger } from '../../lib/logger.js';

const PROVIDER_NAME = process.env.STORAGE_PROVIDER ?? 'local';

// Tipos permitidos (extensão → mime)
const ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // .xlsx
  'text/plain',
]);

const MAX_SIZE_BYTES = parseInt(process.env.STORAGE_MAX_SIZE_MB ?? '10') * 1024 * 1024;

async function getProvider() {
  if (PROVIDER_NAME === 's3') return await import('./providers/s3.js');
  return await import('./providers/local.js');
}

/**
 * @param {{ originalFileName: string, buffer: Buffer, mimeType?: string }} opts
 * @returns {{ storedFileName, fileUrl, mimeType, size, provider }}
 */
export async function uploadFile({ originalFileName, buffer, mimeType }) {
  // Detecta mime se não fornecido
  const detectedMime = mimeType ?? mime.lookup(originalFileName) ?? 'application/octet-stream';

  // Valida tamanho
  if (buffer.length > MAX_SIZE_BYTES) {
    throw Object.assign(new Error(`Arquivo excede o limite de ${process.env.STORAGE_MAX_SIZE_MB ?? 10}MB`), { statusCode: 413 });
  }

  // Valida tipo
  if (!ALLOWED_MIMES.has(detectedMime)) {
    throw Object.assign(new Error(`Tipo de arquivo não permitido: ${detectedMime}`), { statusCode: 415 });
  }

  // Nome seguro: uuid + extensão original
  const ext = extname(originalFileName).toLowerCase().replace(/[^a-z0-9.]/g, '');
  const storedFileName = `${randomUUID()}${ext}`;

  const provider = await getProvider();
  const { fileUrl } = await provider.upload({ storedFileName, buffer, mimeType: detectedMime });

  logger.info({ storedFileName, size: buffer.length, provider: PROVIDER_NAME }, 'Arquivo enviado');

  return {
    storedFileName,
    fileUrl,
    mimeType:    detectedMime,
    size:        buffer.length,
    provider:    PROVIDER_NAME,
  };
}

export async function removeFile(storedFileName) {
  const provider = await getProvider();
  await provider.remove(storedFileName);
  logger.info({ storedFileName, provider: PROVIDER_NAME }, 'Arquivo removido');
}
