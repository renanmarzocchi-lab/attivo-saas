import cron             from 'node-cron';
import { enqueueRenewal } from '../queues/producers.js';
import { logger }         from '../lib/logger.js';

function todayStr() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

async function scheduleRenewal() {
  const runDate = todayStr();
  try {
    await enqueueRenewal(runDate);
    logger.info({ runDate }, 'Renewal job enfileirado');
  } catch (err) {
    logger.error({ err, runDate }, 'Falha ao enfileirar renewal job');
  }
}

/**
 * Inicia o cron de renovação.
 * A execução real fica no renewal.worker.js (BullMQ).
 * O jobId `renewal-YYYY-MM-DD` garante idempotência: não duplica no mesmo dia.
 */
export function startRenewalJob() {
  scheduleRenewal(); // executa imediatamente na inicialização

  cron.schedule('0 7 * * *', () => {
    scheduleRenewal();
  }, { timezone: 'America/Sao_Paulo' });

  logger.info('Renewal cron registrado (07:00 BRT)');
}
