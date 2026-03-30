import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { tenantWhere, resolveTenantId } from '../../lib/tenant.js';

const ruleSchema = z.object({
  name:            z.string().min(2).max(120),
  trigger:         z.enum([
    'LEAD_CREATED','LEAD_ASSIGNED',
    'STAGE_CHANGED_CONTATO_INICIAL','STAGE_CHANGED_EM_COTACAO',
    'STAGE_CHANGED_COTADO','STAGE_CHANGED_PROPOSTA_ENVIADA',
    'STAGE_CHANGED_PROPOSTA_ACEITA','STAGE_CHANGED_NEGOCIACAO',
    'STAGE_CHANGED_APOLICE_EMITIDA','STAGE_CHANGED_PERDIDO',
    'NO_ACTIVITY_48H','RENEWAL_30_DAYS','RENEWAL_15_DAYS','RENEWAL_7_DAYS',
  ]),
  channel:         z.enum(['WHATSAPP','EMAIL','SYSTEM']),
  messageTemplate: z.string().min(10).max(2000),
  delayHours:      z.number().int().min(0).max(720).default(0),
  isActive:        z.boolean().default(true),
});

export default async function automationsRoutes(app) {

  // GET /admin/automations — listar regras
  app.get('/admin/automations', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const where = tenantWhere(request, {});
    const rules = await prisma.automationRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { logs: true } },
      },
    });
    return { data: rules };
  });

  // GET /admin/automations/:id — detalhe com logs recentes
  app.get('/admin/automations/:id', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params;
    const where  = tenantWhere(request, { id });

    const rule = await prisma.automationRule.findFirst({
      where,
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true, status: true, targetPhone: true, targetEmail: true,
            createdAt: true, executedAt: true, errorMessage: true,
          },
        },
        _count: { select: { logs: true } },
      },
    });

    if (!rule) return reply.code(404).send({ message: 'Regra nao encontrada' });
    return { rule };
  });

  // POST /admin/automations — criar regra
  app.post('/admin/automations', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const data = ruleSchema.parse(request.body);

    const rule = await prisma.automationRule.create({
      data: {
        ...data,
        tenantId: resolveTenantId(request),
      },
    });

    return reply.code(201).send({ rule });
  });

  // PATCH /admin/automations/:id — atualizar regra
  app.patch('/admin/automations/:id', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id }  = request.params;
    const data    = ruleSchema.partial().parse(request.body);
    const where   = tenantWhere(request, { id });

    const existing = await prisma.automationRule.findFirst({ where });
    if (!existing) return reply.code(404).send({ message: 'Regra nao encontrada' });

    const updated = await prisma.automationRule.update({ where: { id }, data });
    return { rule: updated };
  });

  // DELETE /admin/automations/:id — excluir regra
  app.delete('/admin/automations/:id', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params;
    const where  = tenantWhere(request, { id });

    const existing = await prisma.automationRule.findFirst({ where });
    if (!existing) return reply.code(404).send({ message: 'Regra nao encontrada' });

    await prisma.automationRule.delete({ where: { id } });
    return reply.code(204).send();
  });

  // PATCH /admin/automations/:id/toggle — ativar/desativar
  app.patch('/admin/automations/:id/toggle', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const { id } = request.params;
    const where  = tenantWhere(request, { id });

    const rule = await prisma.automationRule.findFirst({ where });
    if (!rule) return reply.code(404).send({ message: 'Regra nao encontrada' });

    const updated = await prisma.automationRule.update({
      where: { id },
      data:  { isActive: !rule.isActive },
    });

    return { rule: updated };
  });

  // GET /admin/automations/logs — histórico de execuções
  app.get('/admin/automations/logs', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const schema = z.object({
      page:   z.coerce.number().int().min(1).default(1),
      limit:  z.coerce.number().int().min(1).max(100).default(50),
      status: z.string().optional(),
      ruleId: z.string().optional(),
    });
    const { page, limit, status, ruleId } = schema.parse(request.query);
    const skip = (page - 1) * limit;

    const where = {
      ...(status ? { status } : {}),
      ...(ruleId ? { ruleId } : {}),
      // Filtrar por tenant através da relação com a regra
      rule: { is: { tenantId: request.tenantId ?? null } },
    };

    const [total, logs] = await Promise.all([
      prisma.automationLog.count({ where }),
      prisma.automationLog.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        include: {
          rule: { select: { name: true, channel: true, trigger: true } },
        },
      }),
    ]);

    return { data: logs, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  });
}
