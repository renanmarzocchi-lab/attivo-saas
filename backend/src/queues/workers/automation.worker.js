/**
 * Automation Worker — executa regras de automação enfileiradas.
 *
 * Recebe: { ruleId, logId, vars }
 * Busca AutomationRule + AutomationLog, renderiza template,
 * envia via canal (WHATSAPP ou EMAIL) e atualiza o log.
 */

import { Worker } from 'bullmq';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { getRedis } from '../../lib/redis.js';
import { captureException } from '../../lib/sentry.js';
import { renderAutomationTemplate } from '../../services/automation.service.js';
import { sendMessage } from '../../integrations/whatsapp/service.js';
import { sendEmail } from '../../integrations/email/service.js';

export function startAutomationWorker() {
  const worker = new Worker('automation', async (job) => {
    const { ruleId, logId, vars } = job.data;
    const log = logger.child({ worker: 'automation', jobId: job.id, ruleId, logId });

    // Carrega regra e log
    const [rule, automationLog] = await Promise.all([
      prisma.automationRule.findUnique({ where: { id: ruleId } }),
      prisma.automationLog.findUnique({ where: { id: logId } }),
    ]);

    if (!rule || !automationLog) {
      log.warn('Regra ou log nao encontrado — job ignorado');
      return;
    }

    if (automationLog.status !== 'PENDING') {
      log.debug({ status: automationLog.status }, 'Log ja processado — pulando');
      return;
    }

    if (!rule.isActive) {
      log.debug('Regra desativada — marcando log como SKIPPED');
      await prisma.automationLog.update({
        where: { id: logId },
        data:  { status: 'SKIPPED' },
      });
      return;
    }

    const body = renderAutomationTemplate(rule.messageTemplate, vars);

    try {
      if (rule.channel === 'WHATSAPP') {
        const phone = automationLog.targetPhone;
        if (!phone) throw new Error('targetPhone ausente para canal WHATSAPP');

        await sendMessage({ phone, message: body });

      } else if (rule.channel === 'EMAIL') {
        const email = automationLog.targetEmail;
        if (!email) throw new Error('targetEmail ausente para canal EMAIL');

        await sendEmail({
          to:      email,
          subject: rule.name,
          html:    `<p>${body.replace(/\n/g, '<br>')}</p>`,
          text:    body,
        });

      } else {
        log.warn({ channel: rule.channel }, 'Canal de automacao desconhecido');
      }

      await prisma.automationLog.update({
        where: { id: logId },
        data:  { status: 'SENT', executedAt: new Date() },
      });

      log.info({ ruleId, logId, channel: rule.channel }, 'Automacao enviada com sucesso');

    } catch (err) {
      log.error({ err, ruleId, logId }, 'Falha ao executar automacao');

      await prisma.automationLog.update({
        where: { id: logId },
        data:  { status: 'FAILED', errorMessage: err.message ?? 'Erro desconhecido' },
      }).catch(() => {});

      throw err; // Re-throw para BullMQ gerenciar retries
    }
  }, {
    connection: { createClient: () => getRedis() },
    concurrency: 5,
  });

  worker.on('failed', (job, err) => {
    if (job?.attemptsMade >= (job?.opts?.attempts ?? 3)) {
      captureException(err, { worker: 'automation', jobId: job?.id, ruleId: job?.data?.ruleId });
    }
  });

  logger.info('Automation worker iniciado');
  return worker;
}
