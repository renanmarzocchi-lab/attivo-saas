import { randomUUID }  from 'crypto';
import Fastify         from 'fastify';
import cors            from '@fastify/cors';
import helmet          from '@fastify/helmet';
import jwt             from '@fastify/jwt';
import rateLimit       from '@fastify/rate-limit';
import multipart       from '@fastify/multipart';
import { env }         from './config/env.js';
import { logger }      from './lib/logger.js';
import { captureException } from './lib/sentry.js';
import { authenticate, authorize } from './middlewares/auth.js';
import { requestIdPlugin }         from './middlewares/requestId.js';

import authRoutes               from './modules/auth/routes.js';
import healthRoutes             from './modules/health/routes.js';
import affiliateRoutes          from './modules/affiliates/routes.js';
import referralRoutes           from './modules/referrals/routes.js';
import conversionRoutes         from './modules/conversions/routes.js';
import paymentRoutes            from './modules/payments/routes.js';
import adminRoutes              from './modules/admin/routes.js';
import adminCommercialRoutes    from './modules/admin/commercial.routes.js';
import adminOpsRoutes           from './modules/admin/ops.routes.js';
import affiliateDashboardRoutes from './modules/affiliate/routes.js';
import brokerRoutes             from './modules/broker/routes.js';
import attachmentRoutes         from './modules/broker/attachments.routes.js';
import tasksRoutes              from './modules/broker/tasks.routes.js';
import leadsRoutes              from './modules/leads/routes.js';
import automationsRoutes        from './modules/admin/automations.routes.js';
import rankingRoutes            from './modules/admin/ranking.routes.js';
import commercialDashboardRoutes from './modules/admin/commercial-dashboard.routes.js';
import intelligenceRoutes       from './modules/intelligence/routes.js';
import adminWithdrawalsRoutes   from './modules/admin/withdrawals.routes.js';
import adminBrokersRoutes       from './modules/admin/brokers.routes.js';
import brokerCommissionsRoutes  from './modules/broker/commissions.routes.js';

const isProd = env.NODE_ENV === 'production';

export function buildApp() {
  const app = Fastify({
    loggerInstance: logger,
    trustProxy:     true,
    genReqId:       () => randomUUID(),
  });

  // ── Segurança ──────────────────────────────────────────────────────────────
  app.register(helmet, {
    contentSecurityPolicy: false, // API pura, sem HTML
  });

  app.register(cors, {
    origin:      env.CORS_ORIGIN,
    credentials: true,
  });

  // ── Rate limit — in-memory (sem Redis)
  // Funciona mesmo sem Redis disponível.
  // Em produção multi-instância, considerar trocar pelo modo Redis quando estável.
  app.register(rateLimit, {
    global:      true,
    max:         300,
    timeWindow:  '1 minute',
    keyGenerator: (req) =>
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.ip,
    errorResponseBuilder: () => ({
      statusCode: 429,
      error:      'Too Many Requests',
      message:    'Muitas requisicoes. Tente novamente em instantes.',
    }),
  });

  // ── JWT ────────────────────────────────────────────────────────────────────
  app.register(jwt, { secret: env.JWT_SECRET });

  // ── Multipart (upload de arquivos) ─────────────────────────────────────────
  app.register(multipart, {
    limits: {
      fileSize: env.STORAGE_MAX_SIZE_MB * 1024 * 1024,
      files:    1,
    },
  });

  // ── RequestId ──────────────────────────────────────────────────────────────
  app.register(requestIdPlugin);

  // ── Auth decorators ────────────────────────────────────────────────────────
  app.decorate('authenticate', authenticate);
  app.decorate('authorize',    authorize);

  // ── Health (sem prefixo de versão) ─────────────────────────────────────────
  app.register(healthRoutes, { prefix: '' });

  // ── API v1 ─────────────────────────────────────────────────────────────────
  app.register(async (v1) => {
    v1.register(authRoutes,               { prefix: '' });
    v1.register(affiliateRoutes,          { prefix: '' });
    v1.register(referralRoutes,           { prefix: '' });
    v1.register(conversionRoutes,         { prefix: '' });
    v1.register(paymentRoutes,            { prefix: '' });
    v1.register(adminRoutes,              { prefix: '' });
    v1.register(adminCommercialRoutes,    { prefix: '' });
    v1.register(adminOpsRoutes,           { prefix: '' });
    v1.register(affiliateDashboardRoutes, { prefix: '' });
    v1.register(brokerRoutes,             { prefix: '' });
    v1.register(attachmentRoutes,         { prefix: '' });
    v1.register(tasksRoutes,             { prefix: '' });
    v1.register(leadsRoutes,             { prefix: '' });
    v1.register(automationsRoutes,       { prefix: '' });
    v1.register(rankingRoutes,           { prefix: '' });
    v1.register(commercialDashboardRoutes, { prefix: '' });
    v1.register(intelligenceRoutes,      { prefix: '' });
    v1.register(adminWithdrawalsRoutes,  { prefix: '' });
    v1.register(adminBrokersRoutes,      { prefix: '' });
    v1.register(brokerCommissionsRoutes, { prefix: '' });
  }, { prefix: '/api/v1' });

  // ── Error handler global ───────────────────────────────────────────────────
  app.setErrorHandler((error, request, reply) => {
    const reqId    = request.id;
    const userId   = request.currentUser?.id;
    const tenantId = request.tenantId;

    // Erros de validação Zod
    if (error.name === 'ZodError') {
      return reply.code(400).send({
        message:   'Dados invalidos',
        errors:    error.errors,
        requestId: reqId,
      });
    }

    // Rate limit
    if (error.statusCode === 429) {
      return reply.code(429).send({ message: error.message, requestId: reqId });
    }

    const status = error.statusCode ?? 500;

    // 4xx → warn log, sem Sentry
    if (status >= 400 && status < 500) {
      app.log.warn({ err: error, reqId }, error.message);
      return reply.code(status).send({ message: error.message, requestId: reqId });
    }

    // 5xx → error log + Sentry
    app.log.error({ err: error, reqId, url: request.url, userId }, 'Erro interno do servidor');

    // Captura no Sentry com contexto completo (sem stack em prod)
    captureException(error, { requestId: reqId, userId, tenantId, url: request.url });

    return reply.code(500).send({
      message:   isProd ? 'Erro interno do servidor' : error.message,
      requestId: reqId,
    });
  });

  return app;
}
