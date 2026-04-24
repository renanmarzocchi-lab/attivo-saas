import { prisma }  from '../lib/prisma.js';
import { logger }  from '../lib/logger.js';
import { enqueueNotification } from '../queues/producers.js';
import { triggerRenewalAutomation } from './automation.service.js';

/**
 * Executa o check diário de renovação.
 *
 * Idempotência: cria RenewalRunLog com runDate único (@@unique).
 * Se já existir, aborta — garante que não roda duas vezes no mesmo dia.
 *
 * @param {string} runDate — formato YYYY-MM-DD
 */
export async function runRenewalCheck(runDate) {
  const log = logger.child({ service: 'renewal', runDate });

  // Tenta criar o log de execução (@@unique[runDate] evita duplicata)
  let runLog;
  try {
    runLog = await prisma.renewalRunLog.create({ data: { runDate } });
    log.info('Renewal run iniciado');
  } catch (err) {
    if (err.code === 'P2002') {
      log.info('Renewal run já executado hoje — abortando');
      return { skipped: true, runDate };
    }
    throw err;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let processedCount = 0;
  let createdNotifications = 0;
  let errorsCount = 0;

  try {
    // 1. Marca EXPIRED
    const expired = await prisma.insuranceRecord.updateMany({
      where: {
        status:  { in: ['ACTIVE', 'EXPIRING_SOON'] },
        endDate: { lt: today },
      },
      data: { status: 'EXPIRED' },
    });
    processedCount += expired.count;
    log.info({ count: expired.count }, 'Seguros marcados EXPIRED');

    // 2. Marca EXPIRING_SOON e cria Lead de renovação + Task de followup
    const expiringRecords = await prisma.insuranceRecord.findMany({
      where: {
        status:           'ACTIVE',
        renewalAlertDate: { lte: today },
        endDate:          { gte: today },
      },
      include: {
        owner: { select: { id: true, name: true } },
      },
    });

    for (const rec of expiringRecords) {
      try {
        await prisma.insuranceRecord.update({
          where: { id: rec.id },
          data:  { status: 'EXPIRING_SOON' },
        });

        // Cria lead de renovação (evita duplicata: mesma source+name nos últimos 60 dias)
        const existingLead = await prisma.lead.findFirst({
          where: {
            source:      'RENEWAL',
            name:        rec.customerName,
            tenantId:    rec.tenantId ?? undefined,
            createdAt:   { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
          },
        });

        let renewalLead = existingLead;
        if (!existingLead) {
          renewalLead = await prisma.lead.create({
            data: {
              name:             rec.customerName,
              phone:            rec.customerPhone ?? null,
              email:            rec.customerEmail ?? null,
              source:           'RENEWAL',
              insuranceType:    rec.type,
              assignedBrokerId: rec.ownerUserId ?? null,
              tenantId:         rec.tenantId ?? null,
              notes:            `Renovacao automatica — apolice ${rec.policyNumber ?? rec.id} vence em ${rec.endDate?.toLocaleDateString('pt-BR') ?? '?'}`,
            },
          });
          processedCount++;
        }

        // Cria tarefa de followup de renovação (sem duplicata)
        const dueDate = new Date(rec.endDate ?? today);
        dueDate.setDate(dueDate.getDate() - 7); // 7 dias antes do vencimento

        const existingTask = await prisma.task.findFirst({
          where: {
            type:        'RENEWAL',
            insuranceId: rec.id,
            completed:   false,
          },
        });

        if (!existingTask && rec.ownerUserId) {
          await prisma.task.create({
            data: {
              title:       `Renovacao: ${rec.customerName} - ${rec.type}`,
              type:        'RENEWAL',
              priority:    'HIGH',
              dueDate,
              insuranceId: rec.id,
              leadId:      renewalLead?.id ?? null,
              userId:      rec.ownerUserId,
              tenantId:    rec.tenantId ?? null,
              notes:       `Seguro vence em ${rec.endDate?.toLocaleDateString('pt-BR') ?? '?'}. Premio atual: R$ ${Number(rec.premiumAmount ?? 0).toLocaleString('pt-BR')}`,
            },
          });
        }

        // Disparar automação de renovação
        triggerRenewalAutomation('RENEWAL_30_DAYS', {
          tenantId:    rec.tenantId,
          insuranceId: rec.id,
          insurance:   rec,
          brokerName:  rec.owner?.name,
        }).catch(() => {});

        processedCount++;
      } catch (err) {
        errorsCount++;
        log.error({ err, insuranceId: rec.id }, 'Falha ao processar renovacao EXPIRING_SOON');
      }
    }
    log.info({ count: expiringRecords.length }, 'Seguros marcados EXPIRING_SOON');

    // 3. Enfileira notificações PENDING com scheduledAt <= agora
    const pending = await prisma.notification.findMany({
      where: {
        status:      'PENDING',
        scheduledAt: { lte: new Date() },
      },
      select: { id: true },
    });

    for (const notif of pending) {
      try {
        await enqueueNotification(notif.id);
        createdNotifications++;
      } catch (err) {
        errorsCount++;
        log.error({ err, notifId: notif.id }, 'Falha ao enfileirar notificação');
      }
    }

    log.info({ createdNotifications, errorsCount }, 'Notificações enfileiradas');

    // 4. Atualiza run log
    await prisma.renewalRunLog.update({
      where: { id: runLog.id },
      data:  { processedCount, createdNotifications, errorsCount },
    });

    return { runDate, processedCount, createdNotifications, errorsCount };
  } catch (err) {
    // Atualiza log mesmo em caso de falha
    await prisma.renewalRunLog.update({
      where: { id: runLog.id },
      data:  { errorsCount: errorsCount + 1 },
    }).catch(() => {});
    throw err;
  }
}
