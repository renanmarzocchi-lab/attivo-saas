import { buildApp }       from './app.js';
import { env }            from './config/env.js';
import { logger }         from './lib/logger.js';
import { checkRedis, isRedisAvailable, closeRedis } from './lib/redis.js';
import { closeAllQueues } from './queues/index.js';
import { initSentry }     from './lib/sentry.js';

// Workers — importados dinamicamente para evitar init de Queue antes do checkRedis
import { startNotificationWorker } from './queues/workers/notification.worker.js';
import { startWhatsAppWorker }     from './queues/workers/whatsapp.worker.js';
import { startEmailWorker }        from './queues/workers/email.worker.js';
import { startRenewalWorker }      from './queues/workers/renewal.worker.js';
import { startAutomationWorker }   from './queues/workers/automation.worker.js';
import { startScoringWorker }      from './queues/workers/scoring.worker.js';
import { startAlertsWorker }       from './queues/workers/alerts.worker.js';
import { startIntelligenceJobs }   from './jobs/intelligence.job.js';
import { startRenewalJob }         from './jobs/renewal.job.js';

const app = buildApp();

async function start() {
  try {
    // 1. Inicializar Sentry (no-op se SENTRY_DSN não configurado)
    await initSentry();

    // 2. Iniciar servidor HTTP
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Servidor HTTP iniciado');

    // 3. Verificar Redis com timeout curto
    //    Nunca bloqueia o boot — apenas registra o estado e habilita/desabilita features
    logger.info('Verificando disponibilidade do Redis...');
    const redisOk = await checkRedis(3000);

    if (redisOk) {
      logger.info('Redis disponivel — iniciando workers e cron');

      // 4a. Iniciar workers BullMQ
      const workers = [
        startNotificationWorker(),
        startWhatsAppWorker(),
        startEmailWorker(),
        startRenewalWorker(),
        startAutomationWorker(),
        startScoringWorker(),
        startAlertsWorker(),
      ];
      logger.info('Workers BullMQ iniciados (notifications, whatsapp, email, renewal, automation, scoring, alerts)');

      // 4b. Cron de renovação diária
      startRenewalJob();
      logger.info('Cron de renovacao iniciado (07:00 BRT)');

      // 4c. Crons de inteligência (scoring + alertas)
      startIntelligenceJobs();

      // Armazena para shutdown
      app.workers = workers;
    } else {
      logger.warn({}, [
        'Redis indisponivel.',
        'Workers BullMQ NAO iniciados.',
        'Funcionalidades afetadas: filas, notificacoes, WhatsApp, email, renovacao automatica.',
        'O servidor HTTP continua operando normalmente.',
        'Suba o Redis e reinicie para restaurar todas as funcionalidades.',
      ].join(' '));
    }

  } catch (err) {
    logger.error({ err }, 'Falha critica ao iniciar servidor');
    process.exit(1);
  }
}

async function shutdown(signal) {
  logger.info({ signal }, 'Sinal recebido — encerrando gracefully...');

  try {
    // Para de aceitar novos requests
    await app.close();
    logger.info('Servidor HTTP encerrado');

    // Fecha workers do BullMQ (apenas se foram iniciados)
    if (app.workers?.length) {
      await Promise.all(app.workers.map((w) => w.close()));
      logger.info('Workers BullMQ encerrados');
    }

    // Fecha filas
    await closeAllQueues();
    logger.info('Filas BullMQ encerradas');

    // Fecha Redis
    await closeRedis();
    logger.info('Redis desconectado');

    logger.info('Shutdown completo');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Erro durante shutdown');
    process.exit(1);
  }
}

// Sinais de sistema
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Exceptions não tratadas — sempre fatal, logar e sair limpo
process.on('uncaughtException', (err) => {
  logger.error({ err }, 'uncaughtException — encerrando');
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandledRejection');
  captureException(reason instanceof Error ? reason : new Error(String(reason)));
});

start();
