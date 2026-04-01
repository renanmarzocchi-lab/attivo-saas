/**
 * Commercial Dashboard — agregações executivas para admin.
 *
 * GET /admin/commercial/dashboard — KPIs consolidados do período
 * GET /admin/commercial/funnel    — funil de leads por status
 * GET /admin/commercial/pipeline  — distribuição por stage do pipeline
 */

import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { tenantWhere } from '../../lib/tenant.js';

export default async function commercialDashboardRoutes(app) {

  // GET /admin/commercial/dashboard
  app.get('/admin/commercial/dashboard', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const schema = z.object({
      from: z.string().optional(),
      to:   z.string().optional(),
    });
    const { from, to } = schema.parse(request.query);

    const now   = new Date();
    const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = to   ? new Date(to)   : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const dateFilter  = { gte: start, lte: end };
    const tenantBase  = request.tenantId ? { tenantId: request.tenantId } : {};

    const [
      // Apólices emitidas no período
      policiesEmitted,
      // Soma de prêmios de apólices emitidas
      premiumSum,
      // Leads criados no período
      leadsCreated,
      // Leads convertidos
      leadsConverted,
      // Pipeline atual (sem filtro de data — snapshot)
      pipelineByStage,
      // Seguros expirando em 30 dias
      expiringSoon,
      // Tarefas vencidas (pendentes)
      overdueTasks,
      // Total de corretores ativos
      activeBrokers,
    ] = await Promise.all([
      prisma.insuranceRecord.count({
        where: { ...tenantBase, stage: 'APOLICE_EMITIDA', createdAt: dateFilter },
      }),
      prisma.insuranceRecord.aggregate({
        where: { ...tenantBase, stage: 'APOLICE_EMITIDA', createdAt: dateFilter },
        _sum: { premiumAmount: true },
      }),
      prisma.lead.count({
        where: { ...tenantBase, createdAt: dateFilter },
      }),
      prisma.lead.count({
        where: { ...tenantBase, status: 'CONVERTED', createdAt: dateFilter },
      }),
      prisma.insuranceRecord.groupBy({
        by:    ['stage'],
        where: {
          ...tenantBase,
          stage: { in: ['CONTATO_INICIAL','EM_COTACAO','COTADO','PROPOSTA_ENVIADA','PROPOSTA_ACEITA','NEGOCIACAO'] },
        },
        _count: { id: true },
        _sum:   { premiumAmount: true },
      }),
      prisma.insuranceRecord.count({
        where: { ...tenantBase, status: 'EXPIRING_SOON' },
      }),
      prisma.task.count({
        where: {
          ...tenantBase,
          completed: false,
          dueDate:   { lt: new Date() },
        },
      }),
      prisma.user.count({
        where: { ...tenantBase, role: 'BROKER', status: 'ACTIVE' },
      }),
    ]);

    const totalPremium    = Number(premiumSum._sum.premiumAmount ?? 0);
    const conversionRate  = leadsCreated > 0
      ? Math.round((leadsConverted / leadsCreated) * 100 * 10) / 10
      : 0;

    const pipeline = Object.fromEntries(
      pipelineByStage.map((r) => [r.stage, {
        count:   r._count.id,
        premium: Number(r._sum.premiumAmount ?? 0),
      }])
    );

    return {
      period: { from: start.toISOString(), to: end.toISOString() },
      kpis: {
        policiesEmitted,
        totalPremium,
        leadsCreated,
        leadsConverted,
        conversionRate,
        expiringSoon,
        overdueTasks,
        activeBrokers,
      },
      pipeline,
    };
  });

  // GET /admin/commercial/funnel — funil de leads
  app.get('/admin/commercial/funnel', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const schema = z.object({
      from: z.string().optional(),
      to:   z.string().optional(),
    });
    const { from, to } = schema.parse(request.query);

    const now   = new Date();
    const start = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = to   ? new Date(to)   : now;

    const tenantBase = request.tenantId ? { tenantId: request.tenantId } : {};
    const dateFilter = { gte: start, lte: end };

    const byStatus = await prisma.lead.groupBy({
      by:    ['status'],
      where: { ...tenantBase, createdAt: dateFilter },
      _count: { id: true },
    });

    const funnel = Object.fromEntries(byStatus.map((r) => [r.status, r._count.id]));
    const total  = Object.values(funnel).reduce((a, b) => a + b, 0);

    return { funnel, total, period: { from: start.toISOString(), to: end.toISOString() } };
  });

  // GET /admin/commercial/pipeline — distribuição de pipeline por tipo de seguro
  app.get('/admin/commercial/pipeline', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const tenantBase = request.tenantId ? { tenantId: request.tenantId } : {};

    const [byStage, byType] = await Promise.all([
      prisma.insuranceRecord.groupBy({
        by:    ['stage'],
        where: {
          ...tenantBase,
          stage: { notIn: ['APOLICE_EMITIDA', 'PERDIDO', 'CANCELADO'] },
        },
        _count: { id: true },
        _sum:   { premiumAmount: true },
      }),
      prisma.insuranceRecord.groupBy({
        by:    ['type'],
        where: {
          ...tenantBase,
          stage: { notIn: ['PERDIDO', 'CANCELADO'] },
        },
        _count: { id: true },
        _sum:   { premiumAmount: true },
      }),
    ]);

    return {
      byStage: byStage.map((r) => ({
        stage:   r.stage,
        count:   r._count.id,
        premium: Number(r._sum.premiumAmount ?? 0),
      })),
      byType: byType.map((r) => ({
        type:    r.type,
        count:   r._count.id,
        premium: Number(r._sum.premiumAmount ?? 0),
      })),
    };
  });

  // GET /admin/commercial/brokers — lista resumida de todos os corretores
  app.get('/admin/commercial/brokers', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const tenantBase = request.tenantId ? { tenantId: request.tenantId } : {};

    const brokers = await prisma.user.findMany({
      where: { ...tenantBase, role: 'BROKER' },
      select: {
        id: true, name: true, email: true, status: true, createdAt: true,
        _count: {
          select: {
            assignedLeads: true,
            ownedInsurances: true,
            tasks: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return { data: brokers };
  });
}
