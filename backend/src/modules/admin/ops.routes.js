import { prisma }              from '../../lib/prisma.js';
import { isRedisAvailable }   from '../../lib/redis.js';
import { isSentryEnabled }    from '../../lib/sentry.js';
import {
  notificationsQueue,
  whatsappQueue,
  emailQueue,
  renewalQueue,
  documentQueue,
  safeJobCounts,
} from '../../queues/index.js';

export default async function adminOpsRoutes(app) {

  // GET /admin/ops/summary — visão operacional geral
  app.get('/admin/ops/summary', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async () => {
    const [
      notifPending, notifFailed,
      waPending, waFailed, waSent,
      emailPending, emailFailed, emailSent,
      insuranceExpiring, insuranceExpired,
      queueStats,
    ] = await Promise.all([
      prisma.notification.count({ where: { status: 'PENDING' } }),
      prisma.notification.count({ where: { status: 'FAILED'  } }),
      prisma.whatsAppMessageLog.count({ where: { status: 'PENDING' } }),
      prisma.whatsAppMessageLog.count({ where: { status: 'FAILED'  } }),
      prisma.whatsAppMessageLog.count({ where: { status: 'SENT'    } }),
      prisma.emailMessageLog.count({ where: { status: 'PENDING' } }),
      prisma.emailMessageLog.count({ where: { status: 'FAILED'  } }),
      prisma.emailMessageLog.count({ where: { status: 'SENT'    } }),
      prisma.insuranceRecord.count({ where: { status: 'EXPIRING_SOON' } }),
      prisma.insuranceRecord.count({ where: { status: 'EXPIRED'       } }),
      Promise.all([
        safeJobCounts(notificationsQueue),
        safeJobCounts(whatsappQueue),
        safeJobCounts(emailQueue),
        safeJobCounts(renewalQueue),
        safeJobCounts(documentQueue),
      ]).then(([n, w, e, r, d]) => ({
        notifications: n,
        whatsapp:      w,
        email:         e,
        renewal:       r,
        document:      d,
      })),
    ]);

    return {
      infrastructure: {
        redis:  isRedisAvailable() ? 'ok' : 'unavailable',
        sentry: isSentryEnabled()  ? 'ok' : 'disabled',
      },
      notifications: { pending: notifPending, failed: notifFailed },
      whatsapp:      { pending: waPending, failed: waFailed, sent: waSent },
      email:         { pending: emailPending, failed: emailFailed, sent: emailSent },
      insurance:     { expiring: insuranceExpiring, expired: insuranceExpired },
      queues:        queueStats,
      ts:            new Date().toISOString(),
    };
  });

  // GET /admin/ops/jobs — status detalhado das filas
  app.get('/admin/ops/jobs', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async () => {
    const redisOk = isRedisAvailable();

    if (!redisOk) {
      return {
        available: false,
        message:   'Redis indisponivel — contagem de jobs nao disponivel',
        queues:    {},
      };
    }

    const [notifications, whatsapp, email_, renewal, document_] = await Promise.all([
      safeJobCounts(notificationsQueue),
      safeJobCounts(whatsappQueue),
      safeJobCounts(emailQueue),
      safeJobCounts(renewalQueue),
      safeJobCounts(documentQueue),
    ]);

    return {
      available: true,
      queues: { notifications, whatsapp, email: email_, renewal, document: document_ },
    };
  });

  // GET /admin/ops/notifications — notificações paginadas
  app.get('/admin/ops/notifications', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const { status, channel, page = 1, limit = 30 } = request.query;
    const where = {};
    if (status)  where.status  = status;
    if (channel) where.channel = channel;
    const skip = (Number(page) - 1) * Number(limit);

    const [total, items] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        skip,
        take:    Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, channel: true, status: true, message: true,
          attempts: true, lastError: true, scheduledAt: true, sentAt: true, createdAt: true,
          targetUser:      { select: { name: true, email: true } },
          insuranceRecord: { select: { customerName: true, type: true } },
        },
      }),
    ]);

    return { data: items, meta: { total, page: Number(page), limit: Number(limit) } };
  });

  // GET /admin/ops/whatsapp — log de mensagens WhatsApp
  app.get('/admin/ops/whatsapp', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const { status, page = 1, limit = 30 } = request.query;
    const where = {};
    if (status) where.status = status;
    const skip = (Number(page) - 1) * Number(limit);

    const [total, items] = await Promise.all([
      prisma.whatsAppMessageLog.count({ where }),
      prisma.whatsAppMessageLog.findMany({
        where,
        skip,
        take:    Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { data: items, meta: { total, page: Number(page), limit: Number(limit) } };
  });

  // GET /admin/ops/email — log de mensagens email
  app.get('/admin/ops/email', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const { status, page = 1, limit = 30 } = request.query;
    const where = {};
    if (status) where.status = status;
    const skip = (Number(page) - 1) * Number(limit);

    const [total, items] = await Promise.all([
      prisma.emailMessageLog.count({ where }),
      prisma.emailMessageLog.findMany({
        where,
        skip,
        take:    Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { data: items, meta: { total, page: Number(page), limit: Number(limit) } };
  });

  // GET /admin/ops/renewal-runs — histórico do job de renovação
  app.get('/admin/ops/renewal-runs', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async () => {
    const runs = await prisma.renewalRunLog.findMany({
      orderBy: { createdAt: 'desc' },
      take:    30,
    });
    return { data: runs };
  });
}
