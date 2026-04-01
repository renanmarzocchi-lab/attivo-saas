import { Worker } from 'bullmq';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { getRedis } from '../../lib/redis.js';
import { sendMessage } from '../../integrations/whatsapp/service.js';

export function startWhatsAppWorker() {
  const worker = new Worker('whatsapp', async (job) => {
    const { phone, message, templateKey, payload, logId } = job.data;
    const log = logger.child({ worker: 'whatsapp', jobId: job.id, phone });

    try {
      const result = await sendMessage({ phone, message, templateKey, payload });

      if (logId) {
        await prisma.whatsAppMessageLog.update({
          where: { id: logId },
          data:  { status: 'SENT', sentAt: new Date(), externalId: result.externalId ?? null },
        });
      }

      log.info({ externalId: result.externalId }, 'WhatsApp enviado');
    } catch (err) {
      if (logId) {
        await prisma.whatsAppMessageLog.update({
          where: { id: logId },
          data:  { status: 'FAILED', errorMessage: err.message },
        }).catch(() => {});
      }
      log.error({ err }, 'Falha ao enviar WhatsApp');
      throw err; // BullMQ fará retry
    }
  }, {
    connection: { createClient: () => getRedis() },
    concurrency: 3,
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'WhatsApp job falhou definitivamente');
  });

  return worker;
}
