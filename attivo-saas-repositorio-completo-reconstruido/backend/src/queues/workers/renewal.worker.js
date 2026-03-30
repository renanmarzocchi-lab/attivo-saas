import { Worker } from 'bullmq';
import { logger } from '../../lib/logger.js';
import { getRedis } from '../../lib/redis.js';
import { runRenewalCheck } from '../../services/renewal.service.js';

export function startRenewalWorker() {
  const worker = new Worker('renewal', async (job) => {
    const { runDate } = job.data;
    const log = logger.child({ worker: 'renewal', jobId: job.id, runDate });

    log.info('Iniciando renewal check');
    const result = await runRenewalCheck(runDate);
    log.info(result, 'Renewal check concluído');
    return result;
  }, {
    connection: { createClient: () => getRedis() },
    concurrency: 1,
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Renewal job falhou');
  });

  return worker;
}
