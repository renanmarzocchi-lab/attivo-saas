import { notificationsQueue, whatsappQueue, emailQueue, renewalQueue, automationQueue, scoringQueue, alertsQueue } from './index.js';

/**
 * Agenda envio de notificação (qualquer canal: SYSTEM, WHATSAPP, EMAIL).
 * jobId garante idempotência — mesmo notificationId não é enfileirado duas vezes.
 */
export async function enqueueNotification(notificationId, opts = {}) {
  return notificationsQueue.add('send', { notificationId }, {
    delay: opts.delay ?? 0,
    jobId: `notif-${notificationId}`,
  });
}

/**
 * Agenda envio direto de WhatsApp (sem passar por Notification).
 * Útil para mensagens ad-hoc de workflows.
 */
export async function enqueueWhatsApp({ phone, message, templateKey, payload, logId }) {
  return whatsappQueue.add('send', { phone, message, templateKey, payload, logId }, {
    jobId: logId ? `wa-${logId}` : undefined,
  });
}

/**
 * Agenda envio direto de email (sem passar por Notification).
 * O notificationId é usado como jobId para idempotência.
 * Usado pelo notification.worker para delegar ao email.worker.
 */
export async function enqueueEmail(notificationId) {
  return emailQueue.add('send-email', { notificationId }, {
    jobId: `email-${notificationId}`,
  });
}

/**
 * Agenda o job diário de renovação (usado pelo cron).
 * jobId garante que não roda duas vezes no mesmo dia.
 */
export async function enqueueRenewal(runDate) {
  return renewalQueue.add('daily-check', { runDate }, {
    jobId: `renewal-${runDate}`,
  });
}

/**
 * Enfileira execução de uma AutomationRule com delay opcional.
 * logId é usado como jobId para idempotência.
 */
export async function enqueueAutomation({ ruleId, logId, vars, delayMs = 0 }) {
  return automationQueue.add('execute', { ruleId, logId, vars }, {
    delay: delayMs,
    jobId: `automation-${logId}`,
  });
}

/**
 * Enfileira recálculo de scores para um tenant.
 * Job diário — jobId baseado em data para idempotência.
 */
export async function enqueueScoring(tenantId, runDate) {
  const date = runDate ?? new Date().toISOString().slice(0, 10);
  return scoringQueue.add('recalculate', { tenantId }, {
    jobId: `scoring-${tenantId ?? 'global'}-${date}`,
  });
}

/**
 * Enfileira varredura de alertas para um tenant.
 */
export async function enqueueAlertScan(tenantId, runDate) {
  const date = runDate ?? new Date().toISOString().slice(0, 10);
  return alertsQueue.add('scan', { tenantId }, {
    jobId: `alerts-${tenantId ?? 'global'}-${date}`,
  });
}
