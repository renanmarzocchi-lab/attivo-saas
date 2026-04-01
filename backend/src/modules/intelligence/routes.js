/**
 * Intelligence Routes — API de inteligência comercial.
 *
 * GET  /intelligence/insights              — insights executivos
 * GET  /intelligence/score/lead/:id        — score de um lead
 * GET  /intelligence/score/insurance/:id   — score de uma oportunidade
 * POST /intelligence/score/recalculate     — dispara recálculo (admin)
 * GET  /intelligence/next-action/lead/:id  — próxima ação para lead
 * GET  /intelligence/next-action/insurance/:id — próxima ação para oportunidade
 * POST /intelligence/message/generate      — gerar mensagem personalizada
 * GET  /intelligence/alerts                — alertas ativos
 * PATCH /intelligence/alerts/:id/read      — marcar como lido
 * PATCH /intelligence/alerts/:id/resolve   — marcar como resolvido
 * POST /intelligence/alerts/scan           — disparar varredura manual (admin)
 */

import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { tenantWhere, assertTenantAccess, resolveTenantId } from '../../lib/tenant.js';
import {
  calculateLeadScore, calculateInsuranceScore,
  calculateLeadLossRisk, calculateInsuranceLossRisk,
  classifyScore, updateLeadScore, updateInsuranceScore,
} from '../../services/intelligence/scoring.service.js';
import { getLeadNextAction, getInsuranceNextAction } from '../../services/intelligence/next-action.service.js';
import { generateMessage } from '../../services/intelligence/message-generator.service.js';
import { getCommercialInsights } from '../../services/intelligence/insights.service.js';
import { enqueueScoring, enqueueAlertScan } from '../../queues/producers.js';

export default async function intelligenceRoutes(app) {

  // ── GET /intelligence/insights ────────────────────────────────
  app.get('/intelligence/insights', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const { limit } = z.object({
      limit: z.coerce.number().int().min(1).max(50).default(10),
    }).parse(request.query);

    const insights = await getCommercialInsights({
      tenantId: resolveTenantId(request),
      limit,
    });

    return { data: insights };
  });

  // ── GET /intelligence/score/lead/:id ──────────────────────────
  app.get('/intelligence/score/lead/:id', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request, reply) => {
    const { id } = request.params;
    const lead = await prisma.lead.findUnique({
      where:   { id },
      include: { _count: { select: { tasks: true } } },
    });

    if (!lead) return reply.code(404).send({ message: 'Lead nao encontrado' });
    assertTenantAccess(request, lead, reply);

    // Broker: só vê seu próprio
    if (request.currentUser.role === 'BROKER' && lead.assignedBrokerId !== request.currentUser.id) {
      return reply.code(403).send({ message: 'Sem permissao' });
    }

    const score    = calculateLeadScore(lead, { taskCount: lead._count.tasks });
    const lossRisk = calculateLeadLossRisk(lead, score);
    const label    = classifyScore(score);

    return { score, lossRisk, label, leadId: id };
  });

  // ── GET /intelligence/score/insurance/:id ─────────────────────
  app.get('/intelligence/score/insurance/:id', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request, reply) => {
    const { id } = request.params;
    const record = await prisma.insuranceRecord.findUnique({ where: { id } });

    if (!record) return reply.code(404).send({ message: 'Registro nao encontrado' });
    assertTenantAccess(request, record, reply);

    if (request.currentUser.role === 'BROKER' && record.ownerUserId !== request.currentUser.id) {
      return reply.code(403).send({ message: 'Sem permissao' });
    }

    const daysSinceUpdate = (Date.now() - new Date(record.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    const score    = calculateInsuranceScore(record, { daysSinceUpdate });
    const lossRisk = calculateInsuranceLossRisk(record, score);
    const label    = classifyScore(score);

    return { score, lossRisk, label, insuranceId: id };
  });

  // ── POST /intelligence/score/recalculate ──────────────────────
  app.post('/intelligence/score/recalculate', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const tenantId = resolveTenantId(request);
    await enqueueScoring(tenantId, new Date().toISOString().slice(0, 10));
    return reply.code(202).send({ message: 'Recalculo de scores agendado' });
  });

  // ── GET /intelligence/next-action/lead/:id ────────────────────
  app.get('/intelligence/next-action/lead/:id', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request, reply) => {
    const { id } = request.params;
    const lead = await prisma.lead.findUnique({
      where:   { id },
      include: {
        _count: { select: { tasks: true } },
        tasks:  { where: { completed: false, dueDate: { lt: new Date() } }, select: { id: true } },
      },
    });

    if (!lead) return reply.code(404).send({ message: 'Lead nao encontrado' });
    assertTenantAccess(request, lead, reply);

    const score  = calculateLeadScore(lead, { taskCount: lead._count.tasks });
    const action = getLeadNextAction(lead, { score, overdueTasks: lead.tasks.length });

    return { action, score, label: classifyScore(score) };
  });

  // ── GET /intelligence/next-action/insurance/:id ───────────────
  app.get('/intelligence/next-action/insurance/:id', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request, reply) => {
    const { id } = request.params;
    const record = await prisma.insuranceRecord.findUnique({
      where:   { id },
      include: {
        tasks: { where: { completed: false, dueDate: { lt: new Date() } }, select: { id: true } },
      },
    });

    if (!record) return reply.code(404).send({ message: 'Registro nao encontrado' });
    assertTenantAccess(request, record, reply);

    const daysSinceUpdate = (Date.now() - new Date(record.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    const score  = calculateInsuranceScore(record, { daysSinceUpdate });
    const action = getInsuranceNextAction(record, { score, overdueTasks: record.tasks.length });

    return { action, score, label: classifyScore(score) };
  });

  // ── POST /intelligence/message/generate ───────────────────────
  app.post('/intelligence/message/generate', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request, reply) => {
    const schema = z.object({
      channel:     z.enum(['WHATSAPP', 'EMAIL']),
      actionType:  z.string().min(2).max(60),
      entityType:  z.enum(['LEAD', 'INSURANCE']),
      entityId:    z.string(),
    });
    const { channel, actionType, entityType, entityId } = schema.parse(request.body);
    const user = request.currentUser;

    let entity;
    if (entityType === 'LEAD') {
      entity = await prisma.lead.findUnique({ where: { id: entityId } });
      if (!entity) return reply.code(404).send({ message: 'Lead nao encontrado' });
      assertTenantAccess(request, entity, reply);
    } else {
      const record = await prisma.insuranceRecord.findUnique({ where: { id: entityId } });
      if (!record) return reply.code(404).send({ message: 'Registro nao encontrado' });
      assertTenantAccess(request, record, reply);
      entity = { ...record, name: record.customerName };
    }

    const broker  = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true } });
    const message = generateMessage({ actionType, channel, entity, broker });

    return { message, channel, actionType };
  });

  // ── GET /intelligence/alerts ──────────────────────────────────
  app.get('/intelligence/alerts', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request) => {
    const schema = z.object({
      page:      z.coerce.number().int().min(1).default(1),
      limit:     z.coerce.number().int().min(1).max(100).default(20),
      severity:  z.string().optional(),
      type:      z.string().optional(),
      isRead:    z.coerce.boolean().optional(),
      resolved:  z.coerce.boolean().optional(),
    });
    const { page, limit, severity, type, isRead, resolved } = schema.parse(request.query);
    const skip = (page - 1) * limit;
    const user = request.currentUser;

    const brokerFilter = user.role === 'BROKER' ? { brokerId: user.id } : {};

    const where = {
      ...(request.tenantId ? { tenantId: request.tenantId } : {}),
      ...brokerFilter,
      ...(severity  ? { severity }  : {}),
      ...(type      ? { type }      : {}),
      ...(isRead !== undefined    ? { isRead }        : {}),
      ...(resolved === true       ? { resolvedAt: { not: null } } : {}),
      ...(resolved === false      ? { resolvedAt: null } : {}),
    };

    const [total, alerts] = await Promise.all([
      prisma.alert.count({ where }),
      prisma.alert.findMany({
        where,
        skip,
        take:    limit,
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        include: {
          lead:      { select: { id: true, name: true } },
          insurance: { select: { id: true, customerName: true, type: true } },
          broker:    { select: { id: true, name: true } },
        },
      }),
    ]);

    return { data: alerts, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  });

  // ── PATCH /intelligence/alerts/:id/read ──────────────────────
  app.patch('/intelligence/alerts/:id/read', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request, reply) => {
    const { id } = request.params;
    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) return reply.code(404).send({ message: 'Alerta nao encontrado' });

    const updated = await prisma.alert.update({ where: { id }, data: { isRead: true } });
    return { alert: updated };
  });

  // ── PATCH /intelligence/alerts/:id/resolve ────────────────────
  app.patch('/intelligence/alerts/:id/resolve', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request, reply) => {
    const { id } = request.params;
    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) return reply.code(404).send({ message: 'Alerta nao encontrado' });

    const updated = await prisma.alert.update({
      where: { id },
      data:  { resolvedAt: new Date(), isRead: true },
    });
    return { alert: updated };
  });

  // ── POST /intelligence/alerts/scan ────────────────────────────
  app.post('/intelligence/alerts/scan', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const tenantId = resolveTenantId(request);
    await enqueueAlertScan(tenantId, new Date().toISOString().slice(0, 10));
    return reply.code(202).send({ message: 'Varredura de alertas agendada' });
  });

  // ── GET /intelligence/alerts/summary ─────────────────────────
  app.get('/intelligence/alerts/summary', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN', 'BROKER')],
  }, async (request) => {
    const user = request.currentUser;
    const base = {
      ...(request.tenantId ? { tenantId: request.tenantId } : {}),
      ...(user.role === 'BROKER' ? { brokerId: user.id } : {}),
      resolvedAt: null,
    };

    const [total, critical, warning, unread, byType] = await Promise.all([
      prisma.alert.count({ where: base }),
      prisma.alert.count({ where: { ...base, severity: 'CRITICAL' } }),
      prisma.alert.count({ where: { ...base, severity: 'WARNING'  } }),
      prisma.alert.count({ where: { ...base, isRead: false } }),
      prisma.alert.groupBy({
        by:    ['type'],
        where: base,
        _count: { id: true },
      }),
    ]);

    return {
      total, critical, warning, unread,
      byType: Object.fromEntries(byType.map((r) => [r.type, r._count.id])),
    };
  });
}
