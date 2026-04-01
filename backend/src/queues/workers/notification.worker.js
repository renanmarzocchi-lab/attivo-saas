/**
 * Notification Worker — processa fila 'notifications'.
 *
 * Roteamento por canal:
 *   SYSTEM   → marca como SENT (lido via polling/webhook futuro)
 *   WHATSAPP → chama sendMessage() do whatsapp service
 *   EMAIL    → delega ao email.worker via emailQueue (jobId idempotente)
 *
 * Retry: 3 tentativas com backoff exponencial (configurado na fila).
 */

import { Worker }  from 'bullmq';
import { prisma }  from '../../lib/prisma.js';
import { logger }  from '../../lib/logger.js';
import { getRedis } from '../../lib/redis.js';
import { sendMessage } from '../../integrations/whatsapp/service.js';
import { enqueueEmail } from '../producers.js';
import { captureException } from '../../lib/sentry.js';

export function startNotificationWorker() {
  const worker = new Worker('notifications', async (job) => {
    const { notificationId } = job.data;
    const log = logger.child({ worker: 'notifications', jobId: job.id, notificationId });

    const notif = await prisma.notification.findUnique({
      where:   { id: notificationId },
      include: {
        targetUser:      { select: { name: true, email: true } },
        insuranceRecord: { select: { customerName: true, type: true, endDate: true, customerPhone: true } },
      },
    });

    if (!notif) {
      log.warn('Notificacao nao encontrada — descartando job');
      return;
    }
    if (notif.status === 'SENT') {
      log.info('Notificacao ja enviada — ignorando');
      return;
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data:  { attempts: { increment: 1 } },
    });

    try {
      switch (notif.channel) {

        case 'WHATSAPP': {
          // Telefone: payload.phone > customerPhone do seguro
          const phone = notif.payload?.phone ?? notif.insuranceRecord?.customerPhone;
          if (phone) {
            await sendMessage({ phone, message: notif.message });
          } else {
            log.warn('Canal WHATSAPP sem telefone disponivel — marcando como FAILED');
            await prisma.notification.update({
              where: { id: notificationId },
              data:  { status: 'FAILED', lastError: 'Telefone nao encontrado' },
            });
            return;
          }
          break;
        }

        case 'EMAIL': {
          // Delega ao email.worker para processamento dedicado
          // jobId idempotente impede duplicação se este job for re-executado
          await enqueueEmail(notificationId);
          // Sai sem marcar SENT — email.worker vai fazer isso
          log.info('Notificacao EMAIL encaminhada para email.worker');
          return;
        }

        case 'SYSTEM':
        default:
          // SYSTEM: sem envio externo — apenas registra como enviado
          log.debug('Notificacao SYSTEM processada');
          break;
      }

      await prisma.notification.update({
        where: { id: notificationId },
        data:  { status: 'SENT', sentAt: new Date(), lastError: null },
      });

      log.info({ channel: notif.channel }, 'Notificacao processada com sucesso');
    } catch (err) {
      await prisma.notification.update({
        where: { id: notificationId },
        data:  { lastError: String(err.message).slice(0, 500) },
      });
      log.error({ err }, 'Falha ao processar notificacao — BullMQ fara retry');
      throw err;
    }
  }, {
    connection:  { createClient: () => getRedis() },
    concurrency: 5,
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, notificationId: job?.data?.notificationId, err },
      'Notification job falhou definitivamente (esgotadas as tentativas)');
    captureException(err, { worker: 'notifications', jobId: job?.id });
  });

  return worker;
}
