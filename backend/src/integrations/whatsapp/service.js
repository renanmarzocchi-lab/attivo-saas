/**
 * WhatsApp Service — camada única de envio.
 *
 * Provider é configurado pela env WHATSAPP_PROVIDER:
 *   evolution | zapi | twilio | stub (padrão em dev)
 *
 * Fluxo:
 *   1. Cria WhatsAppMessageLog (PENDING)
 *   2. Chama o provider correto
 *   3. Atualiza log (SENT / FAILED)
 *   4. Retorna { externalId, logId }
 *
 * Em produção, prefira usar enqueueWhatsApp() para desacoplar do request.
 */

import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

const PROVIDER = process.env.WHATSAPP_PROVIDER ?? 'stub';

async function getProvider() {
  switch (PROVIDER) {
    case 'evolution': return (await import('./providers/evolution.js')).send;
    case 'zapi':      return (await import('./providers/zapi.js')).send;
    case 'twilio':    return (await import('./providers/twilio.js')).send;
    default:          return stubSend;
  }
}

async function stubSend({ phone, message }) {
  logger.info({ phone, message }, '[WhatsApp STUB] mensagem simulada');
  return { externalId: `stub-${Date.now()}` };
}

/**
 * Envia mensagem WhatsApp e persiste log.
 * @returns {{ externalId: string|null, logId: string }}
 */
export async function sendMessage({ phone, message, templateKey = null, payload = null }) {
  if (!phone) {
    logger.warn('sendMessage chamado sem telefone — ignorando');
    return { externalId: null, logId: null };
  }

  // 1. Cria log
  const log = await prisma.whatsAppMessageLog.create({
    data: { targetPhone: phone, message, provider: PROVIDER, status: 'PENDING' },
  });

  try {
    const send = await getProvider();
    const result = await send({ phone, message, templateKey, payload });

    await prisma.whatsAppMessageLog.update({
      where: { id: log.id },
      data:  { status: 'SENT', sentAt: new Date(), externalId: result.externalId ?? null },
    });

    logger.info({ logId: log.id, provider: PROVIDER, externalId: result.externalId }, 'WhatsApp enviado');
    return { externalId: result.externalId, logId: log.id };
  } catch (err) {
    await prisma.whatsAppMessageLog.update({
      where: { id: log.id },
      data:  { status: 'FAILED', errorMessage: err.message },
    });
    logger.error({ logId: log.id, err }, 'WhatsApp falhou');
    throw err;
  }
}

export function isConfigured() {
  if (PROVIDER === 'stub') return false;
  return true;
}
