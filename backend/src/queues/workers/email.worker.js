/**
 * Email Worker — processa fila 'email'.
 *
 * Responsabilidade: recebe notificationId, busca dados, renderiza template
 * e envia via sendEmail(). Marca notification como SENT ou FAILED.
 *
 * Canal usado: NotificationChannel.EMAIL
 *
 * Retry: 3 tentativas com backoff exponencial (configurado na fila).
 */

import { Worker }  from 'bullmq';
import { prisma }  from '../../lib/prisma.js';
import { logger }  from '../../lib/logger.js';
import { getRedis } from '../../lib/redis.js';
import { sendEmail } from '../../integrations/email/service.js';
import { renderTemplate } from '../../integrations/email/templates/index.js';
import { captureException } from '../../lib/sentry.js';

export function startEmailWorker() {
  const worker = new Worker('email', async (job) => {
    const { notificationId } = job.data;
    const log = logger.child({ worker: 'email', jobId: job.id, notificationId });

    const notif = await prisma.notification.findUnique({
      where:   { id: notificationId },
      include: {
        targetUser:      { select: { name: true, email: true } },
        insuranceRecord: { select: { customerName: true, type: true, endDate: true } },
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
    if (notif.channel !== 'EMAIL') {
      log.warn({ channel: notif.channel }, 'Canal inesperado no email worker — ignorando');
      return;
    }

    // Incrementar contador de tentativas
    await prisma.notification.update({
      where: { id: notificationId },
      data:  { attempts: { increment: 1 } },
    });

    try {
      // Resolver destinatário: payload.email > email do usuário
      const to = notif.payload?.email ?? notif.targetUser?.email;
      if (!to) {
        const errMsg = 'Email do destinatario nao encontrado (targetUser.email e payload.email ausentes)';
        log.warn(errMsg);
        await prisma.notification.update({
          where: { id: notificationId },
          data:  { status: 'FAILED', lastError: errMsg },
        });
        return; // Não faz retry — dado estrutural ausente
      }

      // Renderizar template se templateKey e dados do seguro disponíveis
      let subject;
      let html;
      let text;

      if (notif.templateKey && notif.insuranceRecord) {
        const rec        = notif.insuranceRecord;
        const endDateFmt = rec.endDate
          ? new Date(rec.endDate).toLocaleDateString('pt-BR')
          : '?';
        const daysLeft = rec.endDate
          ? Math.max(0, Math.ceil((new Date(rec.endDate).getTime() - Date.now()) / 86_400_000))
          : 0;

        const rendered = renderTemplate(notif.templateKey, {
          customerName: rec.customerName,
          type:         rec.type,
          daysLeft,
          endDate:      endDateFmt,
          brokerName:   notif.targetUser?.name,
          message:      notif.message,
          title:        'Notificação Attivo',
        });
        subject = rendered.subject;
        html    = rendered.html;
        text    = rendered.text;
      } else {
        // Fallback: assunto e corpo simples
        subject = 'Notificacao Attivo';
        html    = `<p>${notif.message}</p>`;
        text    = notif.message;
      }

      await sendEmail({ to, subject, html, text, templateKey: notif.templateKey });

      await prisma.notification.update({
        where: { id: notificationId },
        data:  { status: 'SENT', sentAt: new Date(), lastError: null },
      });

      log.info({ to }, 'Notificacao EMAIL enviada com sucesso');
    } catch (err) {
      await prisma.notification.update({
        where: { id: notificationId },
        data:  { lastError: String(err.message).slice(0, 500) },
      });
      log.error({ err }, 'Falha ao enviar email — BullMQ fara retry');
      throw err; // BullMQ gerencia o retry
    }
  }, {
    connection:  { createClient: () => getRedis() },
    concurrency: 3,
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, notificationId: job?.data?.notificationId, err },
      'Email job falhou definitivamente (esgotadas as tentativas)');
    captureException(err, { worker: 'email', jobId: job?.id, notificationId: job?.data?.notificationId });
  });

  return worker;
}
