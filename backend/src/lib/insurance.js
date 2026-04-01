import { prisma } from './prisma.js';

/**
 * Calcula renewalAlertDate = endDate - renewalReminderDays
 */
export function calcRenewalAlertDate(endDate, reminderDays = 30) {
  if (!endDate) return null;
  const d = new Date(endDate);
  d.setDate(d.getDate() - reminderDays);
  return d;
}

/**
 * Adiciona entrada no histórico de um seguro
 */
export async function addTimeline(insuranceRecordId, action, description, createdByUserId = null, tx = prisma) {
  return tx.insuranceTimeline.create({
    data: { insuranceRecordId, action, description, createdByUserId },
  });
}

/**
 * Agenda notificações para 30, 15 e 7 dias antes do vencimento
 */
export async function scheduleRenewalNotifications(record, tx = prisma) {
  if (!record.endDate) return;

  const days = [30, 15, 7];
  const baseDate = new Date(record.endDate);

  for (const d of days) {
    const scheduledAt = new Date(baseDate);
    scheduledAt.setDate(scheduledAt.getDate() - d);
    scheduledAt.setHours(8, 0, 0, 0);

    // Evitar duplicatas
    const existing = await tx.notification.findFirst({
      where: {
        insuranceRecordId: record.id,
        scheduledAt,
        status: { not: 'FAILED' },
      },
    });
    if (existing) continue;

    await tx.notification.create({
      data: {
        channel:           'SYSTEM',
        targetUserId:      record.ownerUserId,
        insuranceRecordId: record.id,
        message: `Seguro de ${record.customerName} vence em ${d} dias (${new Date(record.endDate).toLocaleDateString('pt-BR')})`,
        status:     'PENDING',
        scheduledAt,
      },
    });
  }
}

/**
 * Selects compactos reutilizáveis
 */
export const INSURANCE_LIST_SELECT = {
  id: true, type: true, stage: true, insurer: true, status: true,
  customerName: true, customerDocument: true, customerPhone: true,
  premiumAmount: true, estimatedCommission: true,
  policyNumber: true, proposalNumber: true,
  startDate: true, endDate: true, renewalAlertDate: true,
  sourceType: true, affiliateId: true, refCode: true,
  createdAt: true, updatedAt: true,
  createdBy: { select: { id: true, name: true } },
  owner:     { select: { id: true, name: true } },
  affiliate: { select: { id: true, name: true, refCode: true } },
};
