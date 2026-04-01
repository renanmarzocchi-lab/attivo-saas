/**
 * Email Service — adapter pattern idêntico ao WhatsApp.
 *
 * EMAIL_PROVIDER=smtp | resend | sendgrid | stub (padrão em dev)
 *
 * Fluxo:
 *   1. Cria EmailMessageLog (PENDING)
 *   2. Chama o provider correto
 *   3. Atualiza log (SENT / FAILED)
 *   4. Retorna { externalId, logId }
 *
 * Em produção, use enqueueEmail() para envio assíncrono via BullMQ.
 * Para uso direto (admin, seed), chame sendEmail() diretamente.
 */

import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

const PROVIDER = process.env.EMAIL_PROVIDER ?? 'stub';

async function getProvider() {
  switch (PROVIDER) {
    case 'smtp':     return (await import('./providers/smtp.js')).send;
    case 'resend':   return (await import('./providers/resend.js')).send;
    case 'sendgrid': return (await import('./providers/sendgrid.js')).send;
    default:         return stubSend;
  }
}

async function stubSend({ to, subject }) {
  logger.info({ to, subject }, '[Email STUB] mensagem simulada (EMAIL_PROVIDER=stub)');
  return { externalId: `stub-${Date.now()}` };
}

/**
 * Envia email e persiste log.
 *
 * @param {{ to, subject, html, text, templateKey? }} opts
 * @returns {{ externalId: string|null, logId: string|null }}
 */
export async function sendEmail({ to, subject, html, text, templateKey = null }) {
  if (!to) {
    logger.warn('sendEmail chamado sem destinatario — ignorando');
    return { externalId: null, logId: null };
  }

  const log = await prisma.emailMessageLog.create({
    data: {
      to,
      subject,
      templateKey: templateKey ?? null,
      provider:    PROVIDER,
      status:      'PENDING',
    },
  });

  try {
    const send   = await getProvider();
    const result = await send({ to, subject, html, text, templateKey });

    await prisma.emailMessageLog.update({
      where: { id: log.id },
      data:  { status: 'SENT', sentAt: new Date(), externalId: result.externalId ?? null },
    });

    logger.info({ logId: log.id, provider: PROVIDER, to }, 'Email enviado com sucesso');
    return { externalId: result.externalId ?? null, logId: log.id };
  } catch (err) {
    await prisma.emailMessageLog.update({
      where: { id: log.id },
      data:  { status: 'FAILED', errorMessage: String(err.message).slice(0, 500) },
    });
    logger.error({ logId: log.id, provider: PROVIDER, to, err }, 'Email falhou');
    throw err;
  }
}

export function isConfigured() {
  return PROVIDER !== 'stub';
}

export function getProvider_() {
  return PROVIDER;
}
