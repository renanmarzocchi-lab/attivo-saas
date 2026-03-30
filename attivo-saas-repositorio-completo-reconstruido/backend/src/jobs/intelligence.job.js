/**
 * Intelligence Job — cron diário de scoring e alertas.
 *
 * Horários:
 *   06:00 BRT — recalcula todos os scores (antes do expediente)
 *   08:00 BRT — varredura de alertas (início do expediente)
 *
 * Também enfileira por tenant ativo se configurado como multi-tenant.
 */

import cron from 'node-cron';
import { prisma } from '../lib/prisma.js';
import { enqueueScoring, enqueueAlertScan } from '../queues/producers.js';
import { logger } from '../lib/logger.js';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function getActiveTenantIds() {
  const tenants = await prisma.tenant.findMany({
    where:  { status: 'ACTIVE' },
    select: { id: true },
  });
  return tenants.map((t) => t.id);
}

async function scheduleScoringForAll() {
  const runDate = todayStr();
  try {
    const tenantIds = await getActiveTenantIds();

    if (tenantIds.length === 0) {
      // Single-tenant / sem tenants configurados
      await enqueueScoring(null, runDate);
      logger.info({ runDate }, 'Scoring job global enfileirado');
    } else {
      for (const tenantId of tenantIds) {
        await enqueueScoring(tenantId, runDate);
      }
      logger.info({ runDate, count: tenantIds.length }, 'Scoring jobs por tenant enfileirados');
    }
  } catch (err) {
    logger.error({ err, runDate }, 'Falha ao enfileirar scoring jobs');
  }
}

async function scheduleAlertsForAll() {
  const runDate = todayStr();
  try {
    const tenantIds = await getActiveTenantIds();

    if (tenantIds.length === 0) {
      await enqueueAlertScan(null, runDate);
      logger.info({ runDate }, 'Alert scan global enfileirado');
    } else {
      for (const tenantId of tenantIds) {
        await enqueueAlertScan(tenantId, runDate);
      }
      logger.info({ runDate, count: tenantIds.length }, 'Alert scans por tenant enfileirados');
    }
  } catch (err) {
    logger.error({ err, runDate }, 'Falha ao enfileirar alert scans');
  }
}

/**
 * Inicia os crons de inteligência comercial.
 */
export function startIntelligenceJobs() {
  // Scoring: todo dia às 06:00 (BRT = UTC-3 → 09:00 UTC)
  cron.schedule('0 9 * * *', scheduleScoringForAll, { timezone: 'UTC' });

  // Alertas: todo dia às 08:00 BRT (11:00 UTC)
  cron.schedule('0 11 * * *', scheduleAlertsForAll, { timezone: 'UTC' });

  logger.info('Intelligence jobs iniciados (scoring 06:00 BRT, alertas 08:00 BRT)');
}
