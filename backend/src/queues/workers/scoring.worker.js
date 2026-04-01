/**
 * Scoring Worker — recalcula scores de leads e oportunidades.
 *
 * Job: { tenantId: string|null }
 * Retorna: { leads: number, insurances: number }
 */

import { Worker } from 'bullmq';
import { logger } from '../../lib/logger.js';
import { getRedis } from '../../lib/redis.js';
import { captureException } from '../../lib/sentry.js';
import { recalculateAllScores } from '../../services/intelligence/scoring.service.js';

export function startScoringWorker() {
  const worker = new Worker('scoring', async (job) => {
    const { tenantId } = job.data;
    const log = logger.child({ worker: 'scoring', jobId: job.id, tenantId });

    log.info('Iniciando recalculo de scores');
    const result = await recalculateAllScores(tenantId ?? null);
    log.info(result, 'Recalculo de scores concluido');

    return result;
  }, {
    connection:  { createClient: () => getRedis() },
    concurrency: 2,
  });

  worker.on('failed', (job, err) => {
    if (job?.attemptsMade >= (job?.opts?.attempts ?? 2)) {
      captureException(err, { worker: 'scoring', jobId: job?.id });
    }
  });

  logger.info('Scoring worker iniciado');
  return worker;
}
