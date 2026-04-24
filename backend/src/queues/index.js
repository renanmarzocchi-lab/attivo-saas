import { Queue } from 'bullmq';
import { getRedis } from '../lib/redis.js';

const connection = { createClient: () => getRedis() };

// --- Definição das filas ---

export const notificationsQueue = new Queue('notifications', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff:  { type: 'exponential', delay: 5_000 },
    removeOnComplete: 100,
    removeOnFail:     200,
  },
});

export const whatsappQueue = new Queue('whatsapp', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff:  { type: 'exponential', delay: 10_000 },
    removeOnComplete: 200,
    removeOnFail:     500,
  },
});

export const emailQueue = new Queue('email', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff:  { type: 'exponential', delay: 10_000 },
    removeOnComplete: 200,
    removeOnFail:     500,
  },
});

export const renewalQueue = new Queue('renewal', {
  connection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 30,
    removeOnFail:     100,
  },
});

export const documentQueue = new Queue('document', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff:  { type: 'fixed', delay: 3_000 },
    removeOnComplete: 50,
    removeOnFail:     100,
  },
});

export const automationQueue = new Queue('automation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff:  { type: 'exponential', delay: 5_000 },
    removeOnComplete: 200,
    removeOnFail:     500,
  },
});

export const scoringQueue = new Queue('scoring', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff:  { type: 'fixed', delay: 5_000 },
    removeOnComplete: 50,
    removeOnFail:     100,
  },
});

export const alertsQueue = new Queue('alerts', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff:  { type: 'fixed', delay: 10_000 },
    removeOnComplete: 30,
    removeOnFail:     100,
  },
});

export const allQueues = [
  notificationsQueue,
  whatsappQueue,
  emailQueue,
  renewalQueue,
  documentQueue,
  automationQueue,
  scoringQueue,
  alertsQueue,
];

/**
 * Encerra todas as filas. Chamado no shutdown graceful.
 */
export async function closeAllQueues() {
  await Promise.all(allQueues.map((q) => q.close()));
}

/**
 * Retorna contagem de jobs de uma fila com fallback seguro quando Redis está down.
 * Evita 500 no dashboard operacional.
 */
export async function safeJobCounts(queue) {
  try {
    return await queue.getJobCounts('active', 'waiting', 'delayed', 'failed', 'completed');
  } catch {
    return { active: 0, waiting: 0, delayed: 0, failed: 0, completed: 0 };
  }
}
