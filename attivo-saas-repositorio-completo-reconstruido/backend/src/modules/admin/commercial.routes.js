import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { INSURANCE_LIST_SELECT } from '../../lib/insurance.js';

export default async function adminCommercialRoutes(app) {

  // ── GET /admin/dashboard/commercial ──────────────────────────────────────
  app.get('/admin/dashboard/commercial', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async () => {
    const [
      total, byStage, byType, byStatus,
      premiumSum, commissionSum,
      expiringSoon, expired,
    ] = await Promise.all([
      prisma.insuranceRecord.count(),
      prisma.insuranceRecord.groupBy({ by: ['stage'], _count: true }),
      prisma.insuranceRecord.groupBy({ by: ['type'],  _count: true }),
      prisma.insuranceRecord.groupBy({ by: ['status'], _count: true }),
      prisma.insuranceRecord.aggregate({ _sum: { premiumAmount: true }, where: { status: { not: 'CANCELED' } } }),
      prisma.insuranceRecord.aggregate({ _sum: { estimatedCommission: true }, where: { status: { not: 'CANCELED' } } }),
      prisma.insuranceRecord.count({ where: { status: 'EXPIRING_SOON' } }),
      prisma.insuranceRecord.count({ where: { status: 'EXPIRED' } }),
    ]);

    const policies = byStage.find((s) => s.stage === 'APOLICE_EMITIDA')?._count ?? 0;
    const leads    = byStage.find((s) => s.stage === 'LEAD')?._count ?? 0;
    const convRate = total > 0 ? ((policies / total) * 100).toFixed(1) : '0.0';

    return {
      total,
      policies,
      leads,
      expiringSoon,
      expired,
      conversionRate: convRate,
      premiumTotal:     Number(premiumSum._sum.premiumAmount    ?? 0),
      commissionTotal:  Number(commissionSum._sum.estimatedCommission ?? 0),
      byStage:  Object.fromEntries(byStage.map((r) => [r.stage, r._count])),
      byType:   Object.fromEntries(byType.map((r)  => [r.type,  r._count])),
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count])),
    };
  });

  // ── GET /admin/insurance ──────────────────────────────────────────────────
  app.get('/admin/insurance', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const schema = z.object({
      page:   z.coerce.number().int().min(1).default(1),
      limit:  z.coerce.number().int().min(1).max(100).default(20),
      stage:  z.string().optional(),
      type:   z.string().optional(),
      status: z.string().optional(),
      search: z.string().optional(),
      ownerId: z.string().optional(),
    });
    const { page, limit, stage, type, status, search, ownerId } = schema.parse(request.query);
    const skip  = (page - 1) * limit;
    const where = {};
    if (stage)   where.stage       = stage;
    if (type)    where.type        = type;
    if (status)  where.status      = status;
    if (ownerId) where.ownerUserId = ownerId;
    if (search)  where.customerName = { contains: search, mode: 'insensitive' };

    const [total, records] = await Promise.all([
      prisma.insuranceRecord.count({ where }),
      prisma.insuranceRecord.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, select: INSURANCE_LIST_SELECT }),
    ]);

    return { data: records, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  });

  // ── GET /admin/ranking/brokers ────────────────────────────────────────────
  app.get('/admin/ranking/brokers', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const { orderBy = 'commission' } = z.object({
      orderBy: z.enum(['commission', 'premium', 'policies']).default('commission'),
    }).parse(request.query);

    // Busca usuários BROKER e MASTER_ADMIN que têm seguros
    const brokers = await prisma.user.findMany({
      where: { role: { in: ['BROKER', 'MASTER_ADMIN'] } },
      select: {
        id: true, name: true, email: true, role: true,
        _count: { select: { ownedInsurances: true } },
        ownedInsurances: {
          select: {
            stage: true,
            premiumAmount: true,
            estimatedCommission: true,
          },
        },
      },
    });

    const ranking = brokers.map((b) => {
      const all       = b.ownedInsurances;
      const policies  = all.filter((r) => r.stage === 'APOLICE_EMITIDA').length;
      const proposals = all.filter((r) => ['PROPOSTA_ENVIADA', 'PROPOSTA_ACEITA', 'APOLICE_EMITIDA'].includes(r.stage)).length;
      const premium   = all.reduce((s, r) => s + Number(r.premiumAmount ?? 0), 0);
      const commission= all.reduce((s, r) => s + Number(r.estimatedCommission ?? 0), 0);
      const convRate  = all.length > 0 ? ((policies / all.length) * 100).toFixed(1) : '0.0';

      return {
        id: b.id, name: b.name, email: b.email, role: b.role,
        totalRecords:  all.length,
        proposals,
        policies,
        premiumTotal:    Math.round(premium * 100) / 100,
        commissionTotal: Math.round(commission * 100) / 100,
        conversionRate:  convRate,
      };
    });

    ranking.sort((a, b) => {
      if (orderBy === 'commission') return b.commissionTotal - a.commissionTotal;
      if (orderBy === 'premium')    return b.premiumTotal    - a.premiumTotal;
      return b.policies - a.policies;
    });

    return { data: ranking };
  });

  // ── GET /admin/goals ──────────────────────────────────────────────────────
  app.get('/admin/goals', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const { competenceMonth } = z.object({ competenceMonth: z.string().optional() }).parse(request.query);
    const where = competenceMonth ? { competenceMonth } : {};

    const goals = await prisma.brokerGoal.findMany({
      where,
      orderBy: [{ competenceMonth: 'desc' }, { createdAt: 'desc' }],
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    // Calcular realizado para cada meta
    const month = competenceMonth ?? new Date().toISOString().slice(0, 7);
    const startOfMonth = new Date(`${month}-01T00:00:00.000Z`);
    const endOfMonth   = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const goalsWithProgress = await Promise.all(goals.map(async (g) => {
      const [policies, revenue] = await Promise.all([
        prisma.insuranceRecord.count({
          where: { ownerUserId: g.userId, stage: 'APOLICE_EMITIDA', createdAt: { gte: startOfMonth, lt: endOfMonth } },
        }),
        prisma.insuranceRecord.aggregate({
          _sum: { premiumAmount: true },
          where: { ownerUserId: g.userId, stage: 'APOLICE_EMITIDA', createdAt: { gte: startOfMonth, lt: endOfMonth } },
        }),
      ]);

      const revenueAchieved = Number(revenue._sum.premiumAmount ?? 0);
      return {
        ...g,
        achieved: {
          policies,
          revenue:           Math.round(revenueAchieved * 100) / 100,
          policiesPct:       g.targetPolicies > 0 ? ((policies / g.targetPolicies) * 100).toFixed(1) : '0.0',
          revenuePct:        Number(g.targetRevenue) > 0 ? ((revenueAchieved / Number(g.targetRevenue)) * 100).toFixed(1) : '0.0',
        },
      };
    }));

    return { data: goalsWithProgress };
  });

  // ── POST /admin/goals ─────────────────────────────────────────────────────
  app.post('/admin/goals', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request, reply) => {
    const schema = z.object({
      userId:          z.string(),
      competenceMonth: z.string().regex(/^\d{4}-\d{2}$/),
      targetRevenue:   z.number().positive(),
      targetPolicies:  z.number().int().positive(),
    });
    const data = schema.parse(request.body);

    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) return reply.code(404).send({ message: 'Usuário não encontrado' });

    const goal = await prisma.brokerGoal.upsert({
      where:  { userId_competenceMonth: { userId: data.userId, competenceMonth: data.competenceMonth } },
      update: { targetRevenue: data.targetRevenue, targetPolicies: data.targetPolicies },
      create: data,
    });

    return reply.code(201).send({ goal });
  });

  // ── GET /admin/notifications ──────────────────────────────────────────────
  app.get('/admin/notifications', {
    preHandler: [app.authenticate, app.authorize('MASTER_ADMIN')],
  }, async (request) => {
    const schema = z.object({
      page:   z.coerce.number().int().min(1).default(1),
      limit:  z.coerce.number().int().min(1).max(100).default(20),
      status: z.enum(['PENDING', 'SENT', 'FAILED']).optional(),
    });
    const { page, limit, status } = schema.parse(request.query);
    const where = status ? { status } : {};
    const skip  = (page - 1) * limit;

    const [total, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where, skip, take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: {
          targetUser: { select: { name: true, email: true } },
          insuranceRecord: { select: { customerName: true, type: true, endDate: true } },
        },
      }),
    ]);

    return { data: notifications, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  });
}
