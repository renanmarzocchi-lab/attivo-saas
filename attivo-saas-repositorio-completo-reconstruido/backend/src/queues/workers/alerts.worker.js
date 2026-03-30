/**
 * Alerts Worker — executa varredura de alertas inteligentes.
 *
 * Job: { tenantId: string|null }
 * Retorna: { created: number, skipped: number }
 */

import { Worker } from 'bullmq';
import { logger } from '../../lib/logger.js';
import { getRedis } from '../../lib/redis.js';
import { captureException } from '../../lib/sentry.js';
import { runAlertScan } from '../../services/intelligence/alerts.service.js';

export function startAlertsWorker() {
  const worker = new Worker('alerts', async (job) => {
    const { tenantId } = job.data;
    const log = logger.child({ worker: 'alerts', jobId: job.id, tenantId });

    log.info('Iniciando varredura de alertas');
    const result = await runAlertScan(tenantId ?? null);
    log.info(result, 'Varredura de alertas concluida');

    return result;
  }, {
    connection:  { createClient: () => getRedis() },
    concurrency: 2,
  });

  worker.on('failed', (job, err) => {
    if (job?.attemptsMade >= (job?.opts?.attempts ?? 2)) {
      captureException(err, { worker: 'alerts', jobId: job?.id });
    }
  });

  logger.info('Alerts worker iniciado');
  return worker;
}
